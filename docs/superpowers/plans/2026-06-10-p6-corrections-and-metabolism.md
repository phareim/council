# P6 — Corrections & Metabolism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the council-of-experts skill's documentation with observed run behavior (fix contradictions, right-size the dead-letter Review gate), then add three small information-flow affordances (parking lot, skill-table refresh, small-goal fast path).

**Architecture:** Markdown-only edits to the skill repo at `~/github/council/` (symlinked into `~/.claude/skills/council-of-experts`). No code, no tests — verification is grep-based consistency checks across SKILL.md, gates/, modes/, personalities/. Evidence base: both 2026-05-27 CODE runs had empty `work/` dirs (per-task review never executed) while plan-gate critique caught 3 HIGH bugs; `superpowers:subagent-driven-development` (SDD) internally runs two-stage per-task review (spec + quality) plus a final whole-implementation review.

**Tech Stack:** Markdown, git.

**Decisions already made (do not relitigate):**
- No new persistent personalities. The ad-hoc "Specialist" slot was considered and DECLINED (no run failed for lack of one; the Organizer can already embed any skill in any dispatch when a plan calls for it).
- The `verify` skill is NOT added at Close — `superpowers:verification-before-completion` already mandates running verification commands; adding both is redundant protocol.
- The post-run retrospective / cross-run learning item belongs to G2 (SQLite meta-learning), not this plan.

---

### Task 1: Corrections — organizer.md, frame.md rot, code.md plan-stub contradiction

**Files:**
- Modify: `~/github/council/personalities/organizer.md` (Synthesis discipline, lines 11–18)
- Modify: `~/github/council/gates/frame.md` (step 4: dangling "see spec"; incoherent rerun count)
- Modify: `~/github/council/modes/code.md` (Plan step: contradicts gates/plan.md's stub rule)

- [ ] **Step 1: Fix organizer.md synthesis discipline to match the disk-first convention**

In `personalities/organizer.md`, replace:

```markdown
1. Read both responses fully before deciding anything.
```

with:

```markdown
1. Work from the structured returns (signature line + ≤120-word summary). Read a per-role file from disk only when the returns conflict or feel thin — and drop it from working memory once the synthesis is written.
```

and replace:

```markdown
4. Write the synthesis to the gate's output file (`frame/G<n>.md` etc.) with three sections: Starter response (verbatim), Critic response (verbatim), Organizer synthesis (yours).
```

with:

```markdown
4. Write the synthesis to the gate's output file (`frame/G<n>.md` etc.) as an index: one pointer line per role file (path + signature line) plus your synthesis. Never paste role responses verbatim — that is exactly the context leak the disk-first convention exists to prevent.
```

- [ ] **Step 2: Fix frame.md dangling spec reference**

In `gates/frame.md` step 4, replace:

```markdown
     - CODE / RESEARCH / MIXED / reject — see spec.
```

with:

```markdown
     - Code dimension only → CODE. Research dimension only → RESEARCH. Both → MIXED. Neither → rerun rule below.
```

- [ ] **Step 3: Fix frame.md incoherent rerun count**

In `gates/frame.md` step 4, replace:

```markdown
   - If neither dimension applies, re-run the Frame gate ONCE with a stricter prompt: `"This goal as written has neither a code change nor a knowledge artifact. Reframe it as one or both, OR explain why it cannot be."` After two failed reruns, file the goal to `sleeper-tasks` as needs-clarification and continue to the next goal.
```

with:

```markdown
   - If neither dimension applies, re-run the Frame gate ONCE with a stricter prompt: `"This goal as written has neither a code change nor a knowledge artifact. Reframe it as one or both, OR explain why it cannot be."` If the rerun still yields neither dimension, file the goal to `sleeper-tasks` as needs-clarification and continue to the next goal.
```

- [ ] **Step 4: Fix modes/code.md plan-copy contradiction**

In `modes/code.md` Plan step, replace:

```markdown
Invoke `superpowers:writing-plans` via the `Skill` tool. The implementation plan is saved to that skill's standard location (`docs/superpowers/plans/...`). Copy the resulting plan markdown into `<run-dir>/plan/<Gn>.md` for council-local reference.
```

with:

```markdown
Invoke `superpowers:writing-plans` via the `Skill` tool. The implementation plan is saved to that skill's standard location (`docs/superpowers/plans/...`). Record a council-local stub at `<run-dir>/plan/<Gn>.md` — `Plan: <canonical-path>` plus the acceptance criterion — per the Plan gate. Do not copy the plan body; the path is the reference.
```

- [ ] **Step 5: Verify**

Run: `grep -n "verbatim" ~/github/council/personalities/organizer.md` — expect the only hit to be inside the new "Never paste role responses verbatim" sentence.
Run: `grep -n "see spec" ~/github/council/gates/frame.md` — expect no hits.
Run: `grep -n "two failed reruns" ~/github/council/gates/frame.md` — expect no hits.
Run: `grep -n "Copy the resulting plan" ~/github/council/modes/code.md` — expect no hits.

- [ ] **Step 6: Commit**

```bash
cd ~/github/council && git add -A && git commit -m "P6.1: fix organizer.md verbatim-paste contradiction + frame.md/code.md rot

organizer.md predated the P4 disk-first convention and still told the
Organizer to read full responses and paste them verbatim into gate
artifacts. frame.md dangled a 'see spec' reference and an incoherent
rerun count; code.md told the Organizer to copy full plan bodies into
the run dir, contradicting gates/plan.md's stub rule."
```

---

### Task 2: Right-size the Review gate from per-task to per-phase

**Files:**
- Rewrite: `~/github/council/gates/review.md` (full replacement)
- Modify: `~/github/council/modes/code.md` (Execute step + Blockers)
- Modify: `~/github/council/modes/mixed.md` (Reconciliation step 1: stale per-task-verdict reference)
- Modify: `~/github/council/SKILL.md` (composition table)

**Evidence (cite in commit):** both 2026-05-27 CODE runs have empty `work/` dirs — the per-task dual review never executed as written. SDD internally dispatches a spec-compliance reviewer + a code-quality reviewer per task, plus a final whole-implementation reviewer. The council's unique contribution is assumption-level review, which belongs on the cumulative result, not per task.

- [ ] **Step 1: Replace gates/review.md wholesale with:**

````markdown
# Review gate (per Execute phase)

Used during CODE-mode execution **once per goal**, after `superpowers:subagent-driven-development` completes all tasks in the plan and before the Close gate.

Follows the [Subagent return shape](../SKILL.md#subagent-return-shape-disk-first-convention) rule.

## Why per-phase, not per-task

`superpowers:subagent-driven-development` already runs a two-stage review per task (spec compliance, then code quality) plus a final whole-implementation review. A council layer on top of that per task was protocol nobody executed: both audited CODE runs (2026-05-27) show empty `work/` dirs and good outcomes, with the high-value catches happening at the *plan* gate instead. What SDD does **not** do is assumption review — are the premises behind the shipped approach still right, did execution invalidate the plan, is the acceptance criterion actually met? That is the council Critic's job, and it needs the cumulative diff, not task-sized fragments.

## Inputs
- Goal text + acceptance criterion (from `register.md`)
- Implementation plan path
- The cumulative diff for the goal

## Procedure

1. **Stage the cumulative diff.** `<since-ref>` is the SHA recorded at Execute start (`modes/code.md` records it to `<run-dir>/work/<Gn>/execute-start-sha` before invoking subagent-driven-development):

   ```bash
   mkdir -p "<run-dir>/work/<Gn>"
   git diff $(cat <run-dir>/work/<Gn>/execute-start-sha)..HEAD > <run-dir>/work/<Gn>/phase-diff.patch
   ```

2. **Dispatch ONE Critic subagent.** Embed `personalities/critic.md` system prompt verbatim, then append:

   ```
   GOAL: <goal text>
   ACCEPTANCE CRITERION: <from register.md>
   PLAN FILE: <canonical plan path>
   DIFF FILE: <run-dir>/work/<Gn>/phase-diff.patch
   (Read the plan and diff from disk.)

   This is a whole-goal assumption review, not a line-by-line code review (the implementation pipeline already did that per task). Answer three questions: (1) are the premises behind the shipped approach still right? (2) did anything during execution invalidate the plan's assumptions? (3) does this diff actually meet the acceptance criterion?

   OUTPUT DISCIPLINE:
   1. Write your FULL review to <run-dir>/work/<Gn>/phase-review-critic.md.
   2. Return to me ONLY:
      - the file path you wrote to
      - Verdict: accept | fix-ups-needed | redo
      - Top 3 findings, each ≤60 words, in the form "[severity] one-line claim — concrete pointer (file:line or plan section)"
   Do NOT echo the diff or your full review.
   Out-of-scope observations: append one line each to <run-dir>/parking-lot.md — do not put them in your return.
   ```

3. **Synthesize as Organizer** (per [Iteration limits](../SKILL.md#iteration-limits)):
   - `accept` → proceed to Close.
   - `fix-ups-needed`, *trivial* (typo-class, single-line) → the Organizer applies them directly and proceeds. Trivial fixups are uncapped.
   - `fix-ups-needed`, *non-trivial* → re-dispatch the implementer ONCE (prefer `SendMessage(to: <implementer agentId>)` when it was a main-loop `Agent`; inside a Workflow this is a fresh `agent()` call carrying the diff path), then re-stage the diff and re-dispatch the Critic once.
   - `redo`, or the re-dispatch did not converge → true blocker: file `sleeper-tasks`, mark the goal `blocked`, continue to the next goal.

4. **Append a Decision Log entry** referencing `phase-review-critic.md` by path — verdict, decision, ≤40-word rationale. Do NOT inline the review body.
````

- [ ] **Step 2: Update modes/code.md Execute step**

Replace:

```markdown
Invoke `superpowers:subagent-driven-development` via the `Skill` tool with the plan as input. That skill's "continuous execution" rule aligns with the council's no-pausing rule — there should be no pauses between tasks.

After each task in the plan, run the Review gate (`gates/review.md`) to add the Critic's perspective. The Organizer synthesizes the technical review + Critic review before allowing the next task to start.
```

with:

```markdown
Record the starting SHA first (the Review gate's diff anchor):

    mkdir -p "<run-dir>/work/<Gn>" && git rev-parse HEAD > <run-dir>/work/<Gn>/execute-start-sha

Invoke `superpowers:subagent-driven-development` via the `Skill` tool with the plan as input. That skill's "continuous execution" rule aligns with the council's no-pausing rule — there should be no pauses between tasks. Its internal two-stage per-task review (spec compliance + code quality) plus final whole-implementation review IS the technical review; the council does not duplicate it per task.

After all tasks complete, run the Review gate (`gates/review.md`) ONCE on the cumulative diff — the Critic's assumption-level review of the whole phase.
```

- [ ] **Step 3: Update modes/code.md Blockers**

Replace:

```markdown
- Three consecutive Review-gate cycles fail to converge → mark goal `blocked`, file `sleeper-tasks` with link to plan and run dir, continue to the next goal.
- An implementer subagent reports a blocker it cannot resolve (e.g. needs an API key, requires a service restart) → mark goal `blocked`, file `sleeper-tasks`, continue.
```

with:

```markdown
- The phase Review gate fails to converge after its one implementer re-dispatch → mark goal `blocked`, file `sleeper-tasks` with link to plan and run dir, continue to the next goal.
- An implementer hits an unexpected failure (test won't pass, behavior makes no sense) → invoke `superpowers:systematic-debugging` before flailing or retrying blind. If still stuck after one structured pass, treat as a blocker.
- An implementer subagent reports a blocker it cannot resolve (e.g. needs an API key, requires a service restart) → mark goal `blocked`, file `sleeper-tasks`, continue.
```

- [ ] **Step 4: Update modes/mixed.md's stale per-task-verdict reference**

In `modes/mixed.md` Reconciliation step 1, replace:

```markdown
1. The Organizer **does not** read the full draft or full diff. It looks only at: the assembled draft's path, the section-subagent key-claim summaries (already in working memory from RESEARCH execute), and the code track's per-task review verdicts (already in working memory from the Review gate). Based on those structured returns, decide whether tension is plausible.
```

with:

```markdown
1. The Organizer **does not** read the full draft or full diff. It looks only at: the assembled draft's path, the section-subagent key-claim summaries (already in working memory from RESEARCH execute), and the code track's phase-review verdict + top findings (from the Review gate). Based on those structured returns, decide whether tension is plausible.
```

- [ ] **Step 5: Update the SKILL.md composition table**

Replace:

```markdown
| Per-task TDD | `superpowers:test-driven-development` (inside subagent-driven-development) |
| Execute-phase fan-out (≥3 units) | `Workflow` tool — see [Fan-out execution](#fan-out-execution-the-workflow-tool) |
| Interruptible fan-out (exception) | `superpowers:dispatching-parallel-agents` |
| Per-task review | `superpowers:requesting-code-review` |
| Verify before close | `superpowers:verification-before-completion` |
```

with:

```markdown
| Per-task TDD | `superpowers:test-driven-development` (inside subagent-driven-development) |
| Per-task review | internal to `superpowers:subagent-driven-development` (spec + quality, per task) |
| Phase review (CODE, once per goal) | `gates/review.md` — Critic assumption review on the cumulative diff |
| Debugging an in-flight failure | `superpowers:systematic-debugging` |
| Execute-phase fan-out (≥3 units) | `Workflow` tool — see [Fan-out execution](#fan-out-execution-the-workflow-tool) |
| Interruptible fan-out (exception) | `superpowers:dispatching-parallel-agents` |
| Web-heavy RESEARCH execute | `deep-research` skill (optional wholesale delegate — see `modes/research.md`) |
| Verify before close | `superpowers:verification-before-completion` |
```

- [ ] **Step 6: Verify**

Run: `grep -n "After each task" ~/github/council/modes/code.md` — expect no hits.
Run: `grep -rn --exclude-dir=docs "requesting-code-review" ~/github/council/` — expect hits only in IMPROVEMENTS.md (historical record) and possibly README.md (fixed in Task 4); no hits in SKILL.md, gates/, modes/.
Run: `grep -n "per-task review verdicts" ~/github/council/modes/mixed.md` — expect no hits.
Run: `grep -n "per Execute phase" ~/github/council/gates/review.md` — expect 1 hit (title line).

- [ ] **Step 7: Commit**

```bash
cd ~/github/council && git add -A && git commit -m "P6.2: right-size the Review gate from per-task to per-phase

Evidence: both 2026-05-27 CODE runs left work/ empty — the per-task
dual review never executed — while subagent-driven-development's
internal spec+quality reviews per task plus its final whole-impl
review covered the technical ground. The council now adds the one
thing SDD lacks: a single Critic assumption review on the cumulative
diff, after Execute, before Close. Also wires systematic-debugging
into CODE blockers."
```

---

### Task 3: Additions — parking lot, small-goal fast path, deep-research pointer

**Files:**
- Modify: `~/github/council/SKILL.md` (disk-first section: parking-lot paragraph)
- Modify: `~/github/council/templates/report.md` (Parking lot section)
- Modify: `~/github/council/gates/frame.md` (small-goal fast path)
- Modify: `~/github/council/modes/research.md` (deep-research pointer)

- [ ] **Step 1: Add the parking-lot rule to SKILL.md**

In `SKILL.md`, in the "Subagent return shape (disk-first convention)" section, insert after the paragraph that ends "...not paste the wall into the gate artifact." and before "The same rule applies to Skill-tool invocations...":

```markdown
**Parking lot — catching information underway.** Any subagent (and the Organizer) may append one-line out-of-scope observations — a bug spotted in adjacent code, a stale doc, an idea worth filing — to `<run-dir>/parking-lot.md`. Dispatch prompts SHOULD end their OUTPUT DISCIPLINE block with the standing line: `Out-of-scope observations: append one line each to <run-dir>/parking-lot.md — do not put them in your return.` At Report time the Organizer reads the file once, files items worth keeping (`sleeper-tasks` if substantive, `sfl meta add` if idea-shaped), and lists them under the Report's Parking lot section. No schema, no gate — it is an append-only scratch channel so mid-run gold stops evaporating.
```

- [ ] **Step 2: Add the Parking lot section to templates/report.md**

After the "## Follow-ups filed" section block, insert:

```markdown
## Parking lot

<!-- One bullet per parking-lot.md line worth keeping, with where it was filed (task ID / SFL id / dropped). "(empty)" if no entries. -->
```

- [ ] **Step 3: Add the small-goal fast path to gates/frame.md**

In `gates/frame.md`, insert as a new paragraph at the end of step 1 (after "Wait for the response." and before step 2):

```markdown
   **Small-goal fast path.** If the Librarian reports no prior work AND the goal is unambiguous and S-sized (single file or single artifact, no architectural choice to make), the Organizer MAY skip the Starter dispatch and send only the Critic — the Organizer's own action bias stands in for the generative role, same rationale as the no-dispatch-tool fallback below. Note `fast path` in the Decision Log entry. When in doubt, dispatch both; the pair is the default.
```

- [ ] **Step 4: Add the deep-research pointer to modes/research.md**

In `modes/research.md`, at the top of the "## Execute step" section, insert before the existing first paragraph:

```markdown
**Web-heavy goals:** if the goal is predominantly external web research (most sources are URLs, little internal synthesis), consider delegating the whole Execute step to the `deep-research` skill instead of this pipeline — it ships its own fan-out → verify → synthesize loop. Keep the council's Plan and Close gates around it; its output lands in `<run-dir>/work/<Gn>/draft.md` like any other draft.
```

- [ ] **Step 5: Propagate the parking-lot standing line into every concrete OUTPUT DISCIPLINE template**

The rule in SKILL.md prose alone would be the next dead letter — the templates are what actually get copied into dispatch prompts. Append this exact line as the final line of each OUTPUT DISCIPLINE block (after its "Do NOT echo..." line), at matching indentation:

```
Out-of-scope observations: append one line each to <run-dir>/parking-lot.md — do not put them in your return.
```

Locations (8 blocks):
- `gates/frame.md` — the Librarian prompt block AND the Starter/Critic prompt block (2)
- `gates/plan.md` — the plan-critique prompt block (1)
- `gates/close.md` — the CODE BP block AND the RESEARCH BP block (2)
- `modes/research.md` — the section-subagent block, the Assembler block, and the Critic-on-draft block (3)
- `modes/mixed.md` — the reconciliation-Critic block (1)

(`gates/review.md` already carries the line from Task 2.)

- [ ] **Step 6: Verify**

Run: `grep -rn --exclude-dir=docs "parking-lot.md" ~/github/council/ | wc -l` — expect ≥11 hits (SKILL.md rule + report template + 9 template lines incl. review.md).
Run: `grep -n "parking-lot" ~/github/council/SKILL.md ~/github/council/templates/report.md` — expect ≥1 hit in each.
Run: `grep -n "fast path" ~/github/council/gates/frame.md` — expect ≥1 hit.
Run: `grep -n "deep-research" ~/github/council/modes/research.md ~/github/council/SKILL.md` — expect ≥1 hit in each.

- [ ] **Step 7: Commit**

```bash
cd ~/github/council && git add -A && git commit -m "P6.3: parking lot, small-goal Frame fast path, deep-research pointer

parking-lot.md gives every subagent a one-line append channel for
out-of-scope findings, harvested once at Report — mid-run gold stops
evaporating at zero Organizer-context cost. Frame gets a fast path
(skip Starter when the Librarian is empty and the goal is S-sized).
RESEARCH mode points web-heavy goals at the deep-research skill."
```

---

### Task 4: Records — IMPROVEMENTS.md P6 entry + README sync

**Files:**
- Modify: `~/github/council/IMPROVEMENTS.md` (P6 section + status line + sequencing)
- Modify: `~/github/council/README.md` (sync any sentence that describes per-task review or verbatim synthesis)

- [ ] **Step 1: Update the IMPROVEMENTS.md status line**

Replace:

```markdown
**Status:** all items shipped. Original batches (P1–P3) landed 2026-05-10; P4 disk-first hardening landed 2026-05-25; P5 (Opus 4.8 + new Claude Code capabilities) landed 2026-05-30.
```

with:

```markdown
**Status:** all items shipped. Original batches (P1–P3) landed 2026-05-10; P4 disk-first hardening landed 2026-05-25; P5 (Opus 4.8 + new Claude Code capabilities) landed 2026-05-30; P6 corrections & metabolism landed 2026-06-10.
```

- [ ] **Step 2: Append a P6 section to IMPROVEMENTS.md** (before "## Sequencing"):

```markdown
## P6 — Corrections & metabolism (2026-06-10)

**Status:** shipped. Identified by the council's own self-review run (`~/council/runs/2026-06-10-0621-review-council-skill/`) — the first audit of documentation against actual run-directory evidence.

### P6.1 Fix the P4 stragglers
`personalities/organizer.md` still mandated reading full responses and pasting them "verbatim" into gate artifacts — the exact pattern P4 eliminated everywhere else; the primer the main session loads at Intake was never updated. Also: `gates/frame.md` dangled a "see spec" reference and an incoherent rerun count; `modes/code.md` told the Organizer to copy full plan bodies into the run dir against `gates/plan.md`'s stub rule. All corrected.

### P6.2 Review gate per-task → per-phase
The per-task dual review never executed: both 2026-05-27 CODE runs have empty `work/` dirs, while `superpowers:subagent-driven-development`'s internal spec+quality reviews (per task) and final whole-implementation review covered the technical ground, and the plan-gate Critic caught the HIGH bugs. The gate is now ONE Critic assumption review per goal on the cumulative diff, after Execute. Lesson recorded: protocol denser than what gets executed is not safety, it is noise.

### P6.3 Parking lot + fast path + skill refresh
`<run-dir>/parking-lot.md` — append-only one-liner channel for out-of-scope findings, harvested at Report. Small-goal Frame fast path (skip Starter when Librarian is empty + goal is S-sized). Skill table gained `systematic-debugging` (CODE blockers) and `deep-research` (web-heavy RESEARCH delegate).

### Considered and declined
- **Ad-hoc Specialist slot** (Frame-nominated, skill-backed domain reviewer): no run failed for lack of one, and the Organizer can already embed any skill in any dispatch when a plan calls for it. Codifying a slot adds protocol density for a hypothetical.
- **New persistent personalities** (Historian, Verifier, ...): the five roles cover generative / adversarial / retrieval / synthesis / polish; verification is already a skill invocation at Close.
- **`verify` skill at Close**: redundant with `superpowers:verification-before-completion`.
- **Measurement debts** (P2.3 BP-pass value, P4.1 on-demand read frequency): deferred to the G2 meta-learning database, which is the mechanism that should pay them.
```

- [ ] **Step 3: Append to the Sequencing list in IMPROVEMENTS.md**

After the "- **Batch E (2026-05-30):** P5 ..." line, add:

```markdown
- **Batch F (2026-06-10):** P6 — corrections & metabolism (organizer.md/frame.md/code.md fixes, per-phase Review gate, parking lot, fast path, skill-table refresh).
```

- [ ] **Step 4: Sync README.md**

Read `~/github/council/README.md`. For any sentence describing (a) per-task dual review at the Review gate, or (b) the three-section verbatim frame artifact, update it to match the new reality (per-phase Critic assumption review; index-style gate artifacts). If README.md does not mention either, make no edit.

- [ ] **Step 5: Verify**

Run: `grep -n "P6" ~/github/council/IMPROVEMENTS.md | head -5` — expect status line + section hits.
Run: `grep -n "per-task" ~/github/council/README.md` — expect no hits describing the review gate as per-task current behavior (historical mentions in IMPROVEMENTS.md are fine).

- [ ] **Step 6: Commit**

```bash
cd ~/github/council && git add -A && git commit -m "P6.4: record the P6 batch in IMPROVEMENTS.md, sync README

Includes the considered-and-declined list (Specialist slot, new
persistent personalities, verify-at-Close) so future reviewers do not
relitigate, and defers the P2.3/P4.1 measurement debts to the G2
meta-learning database."
```
