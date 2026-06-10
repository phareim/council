---
name: council-of-experts
description: Use when invoking /council with one or more goals — orchestrates a long-running, autonomous Claude Code session that runs goals to completion using the Librarian / Starter / Critic / Organizer / Beautiful-Person personality framework on top of superpowers. The session does NOT pause for user input once goals are accepted; it runs until every goal is done or filed as blocked.
---

# Council of Experts

You are running an autonomous council session. The user has handed you one or more goals. Run them to completion.

**Hard rule:** once Intake accepts the goals, you do NOT prompt the user — not for confirmation, not for "should I continue?", not for status — until the final Report. The user reads the live transcript and the run directory. That is the interface.

## Adopt the Organizer role

Read `personalities/organizer.md` and behave as the Organizer for the rest of this run.

## Lifecycle

```
0. Intake             — parse goals, build run directory, write Goal Register
1. Per goal G in order:
   a. Frame gate      — gates/frame.md (Librarian recall, then parallel Starter+Critic, mode classification)
   b. Plan gate       — gates/plan.md (mode-specific draft + critique)
   c. Execute         — modes/<mode>.md (CODE / RESEARCH / MIXED)
   c2. Review gate    — gates/review.md (CODE only: one Critic assumption review on the cumulative diff)
   d. Close gate      — gates/close.md (Beautiful Person, external state changes)
2. Report             — self-review into the learning db (learning.md), assemble templates/report.md, print + save
```

## Step 0 — Intake

1. **Get goals.** They came in one of two ways:
   - As arguments to `/council` (everything after the command name)
   - With no arguments → ask the user ONCE: "What should I work on? Give me one or more goals separated by `;` or newlines." Then do not ask anything else until the Report.

2. **Parse goals.** Split on `;` or newlines. Trim. Drop empty entries. Number them G1, G2, ...

3. **Create the run directory:**

   ```bash
   RUN_TS=$(date -u +%Y-%m-%d-%H%M)
   SLUG=$(echo "<G1 text>" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g' | cut -d- -f1-3)
   RUN_DIR=~/council/runs/${RUN_TS}-${SLUG}
   mkdir -p "$RUN_DIR"/{frame,plan,work,close}
   ```

4. **Write `goals.md`** (raw goals as accepted, one per line).

5. **Write `register.md`** from `templates/register.md`. Substitute `<RUN_ID>`, `<RUN_TIMESTAMP_UTC>`, `<RUN_DIR_ABSOLUTE_PATH>`. Add one block per goal (G1, G2, ...) with `<GOAL_TEXT>` filled in and `Mode: pending`, `Status: pending`.

6. **Initialize `decisions.md`** as an empty file with a single header line: `# Decision Log — <RUN_ID>`.

7. **Start the learning loop** (see `learning.md`): `<skill-dir>/scripts/learn.mjs run-start "$(basename $RUN_DIR)" --dir "$RUN_DIR" --goals <n>` — it registers the run AND prints the lesson digest from past runs; carry any relevant lessons into Frame-gate prompts as `PRIOR LESSONS:` lines.

8. **Print to stdout** so the user (watching the transcript) knows what's about to happen:

   ```
   Council run started.
   Run directory: <RUN_DIR>
   Goals: G1 ... Gn
   Mid-run course-correct: write to <RUN_DIR>/INTERRUPT.md
   ```

   This is the LAST stdout-only update until Report. From here on, all updates are file-based.

## Step 1 — Per-goal loop

For each goal G in `register.md` order:

**Before each gate (steps 2–5 below), the Organizer performs the interrupt check** — see [Mid-run interrupt channel](#mid-run-interrupt-channel).

1. Mark G `in-flight` in `register.md`.
2. Run the **Frame gate** (`gates/frame.md`). Produces `frame/G<n>.md` with synthesis and Mode.
3. Run the **Plan gate** (`gates/plan.md`). Produces `plan/G<n>.md`.
4. Run **Execute** per Mode:
   - CODE → `modes/code.md`
   - RESEARCH → `modes/research.md`
   - MIXED → `modes/mixed.md`
5. Run the **Close gate** (`gates/close.md`). Produces `close/G<n>.md` and external state changes.
6. Mark G `done` (or `blocked` / `needs-revision`) in `register.md`.

**On true blocker:** mark `blocked`, file `sleeper-tasks --responsible petter` with a link to `<RUN_DIR>`, continue to the NEXT goal. Do not stop the whole run.

**On `needs-revision`:** Beautiful Person flagged the close. Either re-engage the implementer once (only if BP gave a small, specific fix) or file a `sleeper-tasks` follow-up and ship what's there. Mark accordingly.

## Step 2 — Report

When every goal is `done` or `blocked` or `needs-revision`:

1. Assemble `report.md` from `templates/report.md`. Fill in each section.
2. **Self-review** (see `learning.md`): answer the four questions into `<RUN_DIR>/self-review.md`; `<skill-dir>/scripts/learn.mjs review <run-id> --file ... --lesson "..."` (1–3 lessons); then `<skill-dir>/scripts/learn.mjs run-end <run-id> --status <done|partial|aborted> --register <RUN_DIR>/register.md` — it refuses to finalize without the self-review. Optional mid-run `reflect` calls are described in `learning.md`.
3. Print the entire report to stdout.
4. Save to `<RUN_DIR>/report.md`. If the running harness intercepts `Write` for files named `report.md` (some subagent harnesses do, with a "return text not files" heuristic), fall back to `cat <<'EOF' > "$RUN_DIR/report.md" … EOF` via Bash.
5. Stop.

## Mid-run interrupt channel

The user's only mid-run channel into the council is `<RUN_DIR>/INTERRUPT.md`. The council never prompts the user; it just reads this file at well-defined checkpoints if it exists.

**Checkpoints.** Before each gate within Step 1's per-goal loop — i.e., before Frame, before Plan, before Execute, before Close.

**Procedure when found.**
1. Read `<RUN_DIR>/INTERRUPT.md`.
2. Treat the contents as a high-priority Critic-style intervention. Adopt it as the dominant constraint for the next gate's synthesis. Propagate to subagents in their next prompt as `EXTERNAL INTERVENTION: <verbatim contents>`.
3. Move the file to `<RUN_DIR>/interrupts/<UTC-timestamp>.md` to preserve the audit trail.
4. Append a Decision Log entry with `Source: user-interrupt` noted in the Context line.

**Format.** Freeform markdown. The user writes whatever they need to say; the Organizer parses intent.

The Run-start banner (printed at the end of Step 0 Intake) tells the user this channel exists.

## Iteration limits

Council-wide rule: at most **one re-dispatch of subagents per phase**. If the re-dispatch doesn't converge, ship what's there and file a follow-up via `sleeper-tasks` or `sfl meta add`. Don't loop indefinitely — diminishing returns set in fast and the user is paying for tokens.

**Exception:** trivial in-place fixups during the Review gate (typo-class corrections, single-line tweaks the Organizer can make directly without re-dispatching the implementer) are unlimited. The cap applies only to *re-dispatching the implementer*.

**Budget-aware (when a turn budget is set).** If `budget.total` is non-null, treat it as a hard ceiling shared across the whole run: reserve headroom for later goals and gates rather than letting one early fan-out spend `remaining()`, and scale fan-out width down as `remaining()` falls. When `budget.total` is null, use the fixed limits above — no scaling.

Per-gate application:
- **Plan gate** — 1 plan revision after critique; ship whichever version is strongest.
- **Review gate** — unlimited trivial in-place fixups; 1 implementer re-dispatch for non-trivial issues; then blocker.
- **Close gate** — 1 BP-driven re-engage; otherwise file a follow-up.

## Subagent return shape (disk-first convention)

Long-running council sessions live and die by the Organizer's context budget. The single biggest lever is **who writes artifacts to disk**.

**Rule:** subagents own their own files. The Organizer owns the index, the synthesis, and the decisions — not the prose.

Every subagent dispatch in this skill MUST follow this shape:

1. The dispatch prompt tells the subagent the exact file path to write its full output to (e.g. `<run-dir>/frame/<Gn>-librarian.md`).
2. The subagent's *returned message to the Organizer* is short and structured — typically:
   - the file path it wrote to
   - a verdict / classification line if the gate needs one
   - a bounded summary (≤120 words) or a fixed-shape findings list (e.g. top-3, ≤60 words each)
   - nothing else — no echoing of the full body
3. The Organizer reads from disk on demand if it needs more detail for synthesis, then drops it from working context as soon as the synthesis is written.
4. Gate artifacts (`frame/<Gn>.md`, `plan/<Gn>.md`, `close/<Gn>.md`) are **indexes**: synthesis + pointers to the per-role files, not verbatim dumps.

If a subagent returns a wall of prose anyway, the Organizer should treat that as the gate's problem (the dispatch prompt was too loose) and tighten it next time — not paste the wall into the gate artifact.

**Parking lot — catching information underway.** Any subagent (and the Organizer) may append one-line out-of-scope observations — a bug spotted in adjacent code, a stale doc, an idea worth filing — to `<run-dir>/parking-lot.md`. Dispatch prompts SHOULD end their OUTPUT DISCIPLINE block with the standing line: `Out-of-scope observations: append one line each to <run-dir>/parking-lot.md — do not put them in your return.` At Report time the Organizer reads the file once, files items worth keeping (`sleeper-tasks` if substantive, `sfl meta add` if idea-shaped), and lists them under the Report's Parking lot section. No schema, no gate — it is an append-only scratch channel so mid-run gold stops evaporating.

The same rule applies to Skill-tool invocations whose output the Organizer doesn't need to act on directly: prefer skills that write to disk (e.g. `superpowers:writing-plans` saves to `docs/superpowers/plans/...`) and record only the path + acceptance criteria in the Decision Log.

### Fan-out execution: the Workflow tool

The `Workflow` tool is the **native** form of the rule above: `agent()` results live in script variables and never reach the Organizer's context. It is the same principle — *heavy output never transits the Organizer* — enforced by the runtime instead of by prompt discipline.

**When to use it:** if an Execute phase fans out into **≥3 independent units that each produce heavy output** (RESEARCH sections, MIXED parallel tracks), run that fan-out as a `Workflow`. Otherwise dispatch inline. Frame, Plan, and Close always stay in the main session — they are ~2-unit synthesis gates that need the Organizer in the loop. This **replaces** `superpowers:dispatching-parallel-agents` for council Execute-phase fan-out; reach back for that skill only in the one case below where mid-run interruptibility matters more than context savings.

Five rules make a council Workflow safe — the first two are load-bearing:

1. **Return a thin manifest only.** A Workflow's *return value* is poured into Organizer context verbatim. Return ONLY disk paths + a verdict + ≤5 findings (the same shape as an OUTPUT DISCIPLINE payload). Section bodies, drafts, and critiques stay in script vars; they are NEVER part of the return. Returning the assembled draft re-introduces exactly the leak this tool prevents.
2. **Final artifacts still go to disk.** Skip the disk write only for hand-offs *between agents in the same script* (an in-script Assembler reads sections from vars). The phase's final outputs — `draft.md`, `critic-pass.md`, each section — MUST still be written to the run dir. The Organizer's drill-in synthesis runs *after* the script exits, when vars are gone, and reaches only disk; the run dir stays the source of truth and the audit trail.
3. **Schema, not prose.** Encode each contract as a JSON `schema` on `agent()` (validated, auto-retried). The prose OUTPUT DISCIPLINE blocks remain the contract for plain main-loop `Agent` dispatch, which has no schema enforcement.
4. **Re-dispatch inside a Workflow is cold.** `SendMessage` (continue an agent with its context intact) is a main-loop tool — not callable from a Workflow script. The one allowed re-dispatch inside a Workflow is a fresh `agent()` call; pass the prior attempt's disk path in its prompt to carry context.
5. **Visibility + the interrupt blind window.** Background Workflows emit progress to `/workflows`, not the transcript, and cannot be interrupted mid-run. So `log()` one line before launch (`"delegated <phase> for <Gn> → workflow <id>; watch /workflows"`) and a one-line digest after it returns, keeping phase boundaries visible. INTERRUPT.md is honored at the gate *before* the Workflow launches and the gate *after* it returns — but a nudge written *during* a long fan-out waits until the phase finishes. If a goal needs finer interrupt granularity, keep that fan-out as `superpowers:dispatching-parallel-agents` in the main loop instead.

**Resume (single-run scope only).** A killed fan-out resumes via `Workflow({scriptPath, resumeFromRunId})` — completed `agent()` calls replay from cache. This recovers an in-flight *phase*, not the whole session: `register.md` and `decisions.md` on disk rebuild the Organizer's state on re-read, but in-flight gate context does not survive, so a resumed run re-enters at the last completed gate.

## Model, tools & plan mode

**Model & effort.** Dispatch most roles at the inherited default. Override only where it pays, by *capability tier*, and use aliases — never pinned model ids, which rot across model generations:
- Cheapest tier that can stitch/search text → Librarian recall (also `agentType: Explore`), RESEARCH Assembler.
- Strongest available tier / higher effort → synthesis-heavy roles: Critic, Beautiful Person, MIXED reconciliation.

(As of 2026-05 the tiers are `haiku` < `sonnet` < `opus`; effort runs `low`→`max`, default `high`. Update this one line as models change.)

**Deferred tools.** Subagents (and Workflow agents) needing MCP or deferred tools — `sleeper-tasks`, `sfl`, the wiki MCP, `TaskCreate` — must `ToolSearch select:<name>` to load the schema before the first call. Don't assume a deferred tool is callable by name alone.

**Never enter plan mode.** The council is an autonomous executor. `EnterPlanMode` halts all edits and `ExitPlanMode` forces a user approval — breaking both the no-pausing rule and the run. `superpowers:writing-plans` produces plan files without touching plan mode.

## Composition with superpowers

When invoking another skill, use the `Skill` tool with the exact name. Do not re-implement.

| Phase | Skill |
|---|---|
| Plan (CODE) | `superpowers:writing-plans` |
| Execute (CODE) | `superpowers:subagent-driven-development` |
| Per-task TDD | `superpowers:test-driven-development` (inside subagent-driven-development) |
| Per-task review | internal to `superpowers:subagent-driven-development` (spec + quality, per task) |
| Phase review (CODE, once per goal) | `gates/review.md` — Critic assumption review on the cumulative diff |
| Debugging an in-flight failure | `superpowers:systematic-debugging` |
| Execute-phase fan-out (≥3 units) | `Workflow` tool — see [Fan-out execution](#fan-out-execution-the-workflow-tool) |
| Interruptible fan-out (exception) | `superpowers:dispatching-parallel-agents` |
| Web-heavy RESEARCH execute | `deep-research` skill (optional wholesale delegate — see `modes/research.md`) |
| Verify before close | `superpowers:verification-before-completion` |

## Important context

- Code changes are committed when finished. The Close gate handles it.
- The wiki is a git-tracked tree of markdown files at `~/thoughts/wiki/`. Writes are file-based — create or edit the article file and update `~/thoughts/INDEX.md`. The `thoughts-autocommit` PM2 service auto-commits the change after a 30s debounce. Conventions (slug rules, required structure, `[[topic-name]]` links) live in `~/thoughts/.claude/skills/wiki-maintenance/SKILL.md`.
- The `sfl` CLI is for SFL ideas; `sleeper-tasks` CLI is for tasks; both are installed.
- The user is `petter`. Address them as such in any text the user will read (commit messages, wiki entries, the Report).
