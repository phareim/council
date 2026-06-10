# Council Meta-Learning Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the council a SQLite memory of its own runs — two mandatory write points (run-start at Intake, self-review at Report), one mandatory read (recall at Intake), optional mid-run reflections — so the skill learns from itself instead of waiting for manual review sessions.

**Architecture:** One self-contained Node script `scripts/learn.mjs` using `node:sqlite` (Node v22.22.1 on Sleeper; no npm deps). DB at `~/council/data/council.sqlite` (host-local — the skill runs exclusively on Sleeper; override via `COUNCIL_DB`). Fat tool, thin protocol: `run-end` parses the run's `register.md` itself to populate per-goal rows (zero protocol cost) and mechanically refuses to finalize a run that has no self-review. The questionnaire lives in `learning.md` at the repo root; SKILL.md gains ~6 lines of wiring.

**Tech Stack:** Node 22 (`node:sqlite`, ESM), sqlite3 file db, markdown.

**Design decisions already made (do not relitigate):**
- NO per-gate instrumentation, NO timing/token metric columns — an LLM under load confabulates what it cannot observe, and P6.2 proved protocol denser than what gets executed is noise.
- Reflections-text-first schema: `runs`, `goals` (thin, parsed from register.md), `reflections` (kind: `mid-run` | `self-review` | `lesson`).
- The recall read ships in the SAME commit as the write path (a write-only db is dead within three runs).
- Backfill is thin: ids, dates, goals, statuses from existing run dirs; `source='backfill'`; no fabricated reflections.

---

### Task 1: `scripts/learn.mjs` — the tool

**Files:**
- Create: `~/github/council/scripts/learn.mjs`

- [ ] **Step 1: Write the script**

Create `scripts/learn.mjs` with exactly this behavior (full implementation, ESM). Shebang: `#!/usr/bin/env -S node --no-warnings` and `chmod +x` — `node:sqlite` emits an ExperimentalWarning on stderr on Node v22 that would pollute `recall` output bound for Organizer context; all docs invoke the script directly (`<skill-dir>/scripts/learn.mjs ...`), never via bare `node `:

- **DB path:** `process.env.COUNCIL_DB || path.join(os.homedir(), 'council/data/council.sqlite')`. Auto-create the directory and schema on every invocation (`mkdir -p` equivalent + `CREATE TABLE IF NOT EXISTS`).
- **Schema:**

```sql
CREATE TABLE IF NOT EXISTS runs (
  id         TEXT PRIMARY KEY,   -- run-dir basename, e.g. 2026-06-10-0621-review-council-skill
  run_dir    TEXT NOT NULL,
  started_at TEXT,               -- ISO8601 UTC
  ended_at   TEXT,
  status     TEXT,               -- done | partial | aborted | unknown
  goal_count INTEGER,
  source     TEXT NOT NULL DEFAULT 'live'  -- live | backfill
);
CREATE TABLE IF NOT EXISTS goals (
  run_id TEXT NOT NULL REFERENCES runs(id),
  gid    TEXT NOT NULL,          -- G1, G2, ...
  text   TEXT,
  mode   TEXT,                   -- CODE | RESEARCH | MIXED | unknown
  status TEXT,                   -- done | blocked | needs-revision | unknown
  PRIMARY KEY (run_id, gid)
);
CREATE TABLE IF NOT EXISTS reflections (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id     TEXT NOT NULL REFERENCES runs(id),
  created_at TEXT NOT NULL,
  kind       TEXT NOT NULL,      -- mid-run | self-review | lesson
  goal_id    TEXT,               -- nullable
  phase      TEXT,               -- nullable: frame|plan|execute|review|close|report
  text       TEXT NOT NULL
);
```

- **Verbs** (argv[2]; all SQL via prepared statements with bound parameters, never string interpolation):
  - `run-start <run_id> --dir <run_dir> [--goals <n>]` — `INSERT ... ON CONFLICT(id) DO UPDATE SET source='live', run_dir=excluded.run_dir WHERE runs.source='backfill'` with `started_at = now` on fresh insert (an existing row's `started_at` is never overwritten; a backfill row is upgraded to live). Idempotent. After writing, print the same digest `recall` prints — the mandatory read rides on the mandatory write and cannot be skipped.
  - `reflect <run_id> --text "<text>" [--goal <Gn>] [--phase <phase>]` — INSERT reflection `kind='mid-run'`. Refuses empty text.
  - `review <run_id> --file <markdown-path> --lesson "<one-liner>" [--lesson "..."]...` — INSERT one reflection `kind='self-review'` whose text is the file contents, plus one `kind='lesson'` row per `--lesson` flag (each ≤200 chars, enforce with a clear error). Requires the run to exist. At least one `--lesson` is mandatory: the lesson rows are what `recall` surfaces — a self-review without a distilled lesson is archival, not learning.
  - `run-end <run_id> --status <done|partial|aborted> [--register <path-to-register.md>]` — (1) verify a `kind='self-review'` reflection exists for this run, else print `run-end refused: no self-review recorded. See learning.md — run the questionnaire and 'learn.mjs review' first.` and **exit 1**; (2) if `--register` given, parse it: each `## G<n>: <text>` block's `- Mode:` and `- Status:` lines → UPSERT into `goals`, and `goal_count` → UPDATE runs; (3) set `ended_at = now`, `status`. The register parser must be tolerant — real registers in `~/council/runs/` vary: headings may be `## G1: text` OR `## G1 — text` (match `^##\s+(G\d+)\b`); field lines may or may not have the `- ` prefix (match `^[-\s]*(Mode|Status):\s*(.+)$`); statuses may be decorated (`done (commit 63e9...)` → take the first word, lowercase, map into `done|blocked|needs-revision|pending|in-flight` else `unknown`); modes likewise (first word, uppercase, map into `CODE|RESEARCH|MIXED` else `unknown`).
  - `recall [--limit 10] [--grep <word>]` — print, plain text, bounded: (a) the last `limit` `lesson` rows (`[run_id] lesson-text`, newest first; if `--grep`, filter lessons + self-reviews by case-insensitive LIKE); (b) a one-line footer `runs recorded: <n> (live: <x>, backfill: <y>)`. Total output must stay readable as Organizer context — hard-cap 40 lines, note `(+ N more — use --grep)` if truncated. Exit 0 with `no lessons recorded yet` when empty.
  - `backfill [--runs-dir <dir>]` — default `~/council/runs/`. For each subdirectory not already in `runs`: id = basename, `started_at` derived from the basename's `YYYY-MM-DD-HHMM` prefix (UTC; skip dirs that don't match), `status` = `done` if `report.md` exists else `partial`, `source='backfill'`; parse `register.md` (same parser as run-end) for goals + goal_count when present. Print a one-line summary `backfilled <n> runs, <m> goals, skipped <k> existing`. Idempotent.
- **Errors:** unknown verb / missing args → usage text to stderr, exit 2. All timestamps `new Date().toISOString()`.
- **No dependencies** beyond `node:sqlite`, `node:fs`, `node:path`, `node:os`, `node:process`.

- [ ] **Step 2: Smoke-test every verb against a throwaway db**

```bash
cd ~/github/council
export COUNCIL_DB=/tmp/council-test.sqlite
rm -f /tmp/council-test.sqlite
./scripts/learn.mjs recall                               # expect: no lessons recorded yet; stderr MUST be empty (no ExperimentalWarning)
./scripts/learn.mjs run-start test-run --dir /tmp/x --goals 2   # prints the recall digest after inserting
./scripts/learn.mjs run-start test-run --dir /tmp/x      # idempotent, no error, started_at unchanged
./scripts/learn.mjs reflect test-run --text "mid-run note" --phase execute
./scripts/learn.mjs run-end test-run --status done       # MUST exit 1 (no self-review)
echo "exit: $?"                                             # expect 1
printf '## Self-review\nQ1: fine\n' > /tmp/sr.md
./scripts/learn.mjs review test-run --file /tmp/sr.md --lesson "test lesson one-liner"
./scripts/learn.mjs run-end test-run --status done       # now succeeds
./scripts/learn.mjs recall                               # shows the lesson + footer
sqlite3 /tmp/council-test.sqlite "SELECT kind,count(*) FROM reflections GROUP BY kind;"  # mid-run 1, self-review 1, lesson 1
unset COUNCIL_DB
```

Every expectation above must hold — including empty stderr on every call (`2>/dev/null` comparison or visual check). Also test register parsing against BOTH heading styles: point `run-end --register` at copies of `~/council/runs/2026-06-10-0621-review-council-skill/register.md` (uses `## G1: text`) AND `~/council/runs/2026-05-25-1625-sleeper-todo-12-briefs/register.md` (uses `## G1 — text`, bare field lines, decorated statuses) and verify goals rows land with normalized mode/status. Also verify the backfill→live upgrade: with a fresh test db, `backfill --runs-dir <tmp dir containing one fake run dir>`, then `run-start <that id> --dir ...`, then `sqlite3 ... "SELECT source FROM runs"` → `live`.

- [ ] **Step 3: Commit**

```bash
cd ~/github/council && git add scripts/learn.mjs && git commit -m "G2: learn.mjs — SQLite meta-learning tool (node:sqlite, no deps)

Two mandatory write points (run-start, review) + mechanical
enforcement: run-end exits 1 without a self-review. run-end parses
register.md itself so per-goal rows cost zero protocol. recall prints
a bounded lesson digest for Intake context. DB at
~/council/data/council.sqlite (COUNCIL_DB to override).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `learning.md` — questionnaire + discipline

**Files:**
- Create: `~/github/council/learning.md`

- [ ] **Step 1: Write learning.md** with exactly this content:

````markdown
# Council learning loop

The council keeps a SQLite memory of its own runs at `~/council/data/council.sqlite` (tool: `scripts/learn.mjs`, no deps, auto-inits). The loop is deliberately thin — two mandatory writes, one mandatory read, everything else optional. Protocol denser than what gets executed is noise (P6.2's lesson); the tool enforces the loop mechanically so the protocol doesn't have to.

## The loop

| When | What | Mandatory |
|---|---|---|
| Intake (Step 0) | `<skill-dir>/scripts/learn.mjs run-start <run-id> --dir <run-dir> --goals <n>` — prints the lesson digest after registering the run; read it and fold relevant lessons into Frame-gate dispatch prompts as `PRIOR LESSONS:` lines | yes |
| Any gate, any time | `<skill-dir>/scripts/learn.mjs reflect <run-id> --text "..." [--goal Gn] [--phase <gate>]` — one observation about the *process* (not the work) while it is fresh | no |
| Report (Step 2) | Self-review: answer the questionnaire below into `<run-dir>/self-review.md`, then `review <run-id> --file <run-dir>/self-review.md --lesson "..."` (1–3 lessons) | yes |
| Report (Step 2) | `run-end <run-id> --status <done|partial|aborted> --register <run-dir>/register.md` | yes (refuses without the self-review) |

`recall` re-prints the digest any time, bounded (≤40 lines); `--grep <word>` narrows it when a goal touches familiar ground. Invoke the script directly (it is executable) — bare `node` invocation prints an ExperimentalWarning that pollutes captured output.

## Self-review questionnaire

Answer all four in `<run-dir>/self-review.md`, 2–5 sentences each, then distill 1–3 one-line lessons for `--lesson`. These are judgment questions — never report metrics you did not directly observe.

1. **What dragged, got skipped, or got worked around this run?** Where did the written protocol and what actually happened diverge?
2. **Returns discipline:** where did a subagent return leak (wall of prose) or a structured return prove too thin (you had to read the per-role file anyway)?
3. **Cost vs. catch:** did each extra pass (BP plan pass, phase review, critique re-dispatch) earn its cost this run? Name one that did and one that didn't.
4. **Next time:** what should the next run do differently — and is that a *skill edit* (file it: `sfl meta add` on the council repo, or edit now if trivial) or just *discipline* (make it a lesson)?

A lesson is a one-liner a future Organizer can act on at Intake, e.g. `"RESEARCH goals with <3 sections: skip the Workflow, dispatch inline — setup overhead dominated"` — not a diary entry.

## Reading the memory

- Run start: `recall` (mandatory, above).
- Reviewing the skill itself: `recall --limit 30` plus `sqlite3 ~/council/data/council.sqlite` for ad-hoc queries — the `reflections` table holds full self-reviews (`kind='self-review'`), not just the lesson digests.
- The db also pays IMPROVEMENTS.md's standing measurement debts (P2.3 BP-pass value, P4.1 structured-return thinness): questions 2 and 3 collect exactly that signal, run over run.
````

- [ ] **Step 2: Verify**

Run: `grep -c "learn.mjs" ~/github/council/learning.md` — expect ≥4.
Run: `grep -n "»" ~/github/council/learning.md` — expect no hits.

- [ ] **Step 3: Commit**

```bash
cd ~/github/council && git add learning.md && git commit -m "G2: learning.md — the council's self-review loop

Four judgment questions (including IMPROVEMENTS.md's P2.3/P4.1
measurement debts), 1-3 distilled lessons per run, and the two-write
one-read discipline the tool enforces.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Wire into SKILL.md (≤6 added lines) + README

**Files:**
- Modify: `~/github/council/SKILL.md` (Intake step 7 area + Report step)
- Modify: `~/github/council/README.md` (one bullet in the repo-layout list)

- [ ] **Step 1: Add the Intake wiring**

In `SKILL.md` Step 0 (Intake), insert a new item between item 6 (`Initialize decisions.md...`) and item 7 (`Print to stdout...`), renumbering item 7 to 8:

```markdown
7. **Start the learning loop** (see `learning.md`): `<skill-dir>/scripts/learn.mjs run-start "$(basename $RUN_DIR)" --dir "$RUN_DIR" --goals <n>` — it registers the run AND prints the lesson digest from past runs; carry any relevant lessons into Frame-gate prompts as `PRIOR LESSONS:` lines.
```

- [ ] **Step 2: Add the Report wiring**

In `SKILL.md` Step 2 (Report), insert a new item between item 1 (`Assemble report.md...`) and item 2 (`Print the entire report...`), renumbering 2→3, 3→4, 4→5:

```markdown
2. **Self-review** (see `learning.md`): answer the four questions into `<RUN_DIR>/self-review.md`; `<skill-dir>/scripts/learn.mjs review <run-id> --file ... --lesson "..."` (1–3 lessons); then `<skill-dir>/scripts/learn.mjs run-end <run-id> --status <done|partial|aborted> --register <RUN_DIR>/register.md` — it refuses to finalize without the self-review. Optional mid-run `reflect` calls are described in `learning.md`.
```

- [ ] **Step 3: README bullet**

In `README.md`'s repo-layout list (after the `templates/` bullet), add:

```markdown
- **`scripts/learn.mjs` + `learning.md`** — the meta-learning loop: SQLite memory of past runs (two mandatory writes, one mandatory read; `run-end` refuses to finalize without a self-review).
```

- [ ] **Step 4: Verify**

Run: `grep -n "learn.mjs" ~/github/council/SKILL.md | wc -l` — expect 2 lines of wiring (Intake + Report).
Run: `grep -n "learn.mjs" ~/github/council/README.md` — expect 1 hit.
Read SKILL.md Step 0 and Step 2 — numbering must be sequential with no duplicates.

- [ ] **Step 5: Commit**

```bash
cd ~/github/council && git add SKILL.md README.md && git commit -m "G2: wire the learning loop into Intake and Report

Two protocol lines total: run-start + recall at Intake, self-review +
run-end at Report. Everything else lives in learning.md and the tool.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Live registration + backfill

**Files:** none new (operates on `~/council/data/council.sqlite`)

- [ ] **Step 1: Record THIS run live FIRST** (before backfill sweeps the runs dir — run-start's backfill→live upgrade makes order forgiving, but live-first keeps the check unambiguous)

```bash
cd ~/github/council
./scripts/learn.mjs run-start 2026-06-10-0621-review-council-skill --dir /home/petter/council/runs/2026-06-10-0621-review-council-skill --goals 2
sqlite3 ~/council/data/council.sqlite "SELECT id, source FROM runs WHERE source='live';"
```

Expected: exactly one live row — this run. (Its `review` + `run-end` happen at the council's Report step, not in this task — that is the live proof of the mandatory gate.)

- [ ] **Step 2: Run the backfill against the real runs dir**

```bash
./scripts/learn.mjs backfill
```

Expected: `backfilled ~20 runs, <m> goals, skipped 1 existing` (the skip is this run; backfilled count = number of other `~/council/runs/` subdirs with a parseable timestamp prefix).

- [ ] **Step 3: Verify the data**

```bash
sqlite3 ~/council/data/council.sqlite "SELECT source, count(*) FROM runs GROUP BY source;"
sqlite3 ~/council/data/council.sqlite "SELECT status, count(*) FROM goals GROUP BY status;"
./scripts/learn.mjs recall
```

Expected: live=1, backfill≈20; goals grouped sensibly (done/blocked/unknown); recall prints a `no lessons recorded yet`-style lesson section (backfill fabricates no reflections) plus the runs-recorded footer.

- [ ] **Step 4: Commit any straggler + push everything**

```bash
cd ~/github/council && git status --short   # expect clean or only docs/
git push origin main
```

No commit expected here (db is host-local, not in the repo) — the push publishes Tasks 1–3.
