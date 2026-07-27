# CODE mode

Used when the goal changes code in a repo and produces no separate knowledge artifact.

All procedures here are council-owned (since 2026-07-27; distilled from the superpowers
fallbacks that shipped the 2026-07-13 taste-maker run, plus techniques worth keeping from
superpowers 6.2.0). Do not invoke `superpowers:*` skills even if a session lists them —
these files are canonical.

## Plan step

Run the council plan procedure — `procedures/writing-plans.md` — via one strongest-tier
planner agent. The plan lands at `<repo>/docs/plans/YYYY-MM-DD-<slug>.md`. Record the
council-local stub at `<run-dir>/plan/<Gn>.md` (`Plan: <canonical-path>` + acceptance
criterion) per the Plan gate. Do not copy the plan body; the path is the reference.

Then run the Plan gate's critique pass (`gates/plan.md` steps 2-4) on the plan.

## Execute step

Record the starting SHA first (the Review gate's diff anchor):

    mkdir -p "<run-dir>/work/<Gn>" && git rev-parse HEAD > <run-dir>/work/<Gn>/execute-start-sha

**The pipeline is a Workflow-based build** (see [Fan-out execution](../SKILL.md#fan-out-execution-the-workflow-tool)):

- Sequential stages commit their own work; parallel agents write disjoint files and
  REPORT (never write) shared-file changes; ONE integrator stage serializes builds and
  shared-file merges (2026-07-13 lesson — zero git races across 8 agents).
- **Every implementer prompt carries the TDD line:** "Write the failing test first, run
  it and confirm it fails for the right reason, then make it pass with minimal code.
  Commit test + implementation together."
- **Every implementer's return contract folds in one combined spec+quality self-check:**
  does the diff meet the task's requirements exactly (nothing missing, nothing extra),
  and would a fresh reviewer approve it? Schema-enforce the return (status, commits,
  one-line test summary, concerns).
- No pauses between tasks — continuous execution per the council's no-pausing rule. Stop
  only for a blocker or genuine ambiguity.

**Never trust an implementer's success report.** An agent saying "done, tests pass" is a
claim, not evidence. After each stage returns, the Organizer verifies against ground
truth: the commits exist (`git log`), the diff touches what the task said
(`git diff --stat`), and — for load-bearing stages — the named test command actually
passes when run. Fresh evidence or it didn't happen.

**Re-dispatch shape.** The council cap (one implementer re-dispatch per phase,
[Iteration limits](../SKILL.md#iteration-limits)) is unchanged — but spend it well: when
a fix attempt already failed once, the re-dispatch should be a FRESH implementer at a
more capable tier carrying the prior attempt's disk artifacts, not the same agent asked
to try harder. An implementer that can't see its own bug after two looks won't find it on
the third.

**Drift checks (long executes).** Plans decay while they execute. After each Workflow
stage returns (or every ~5 completed tasks in a plain agent-dispatch execute), the
Organizer spends one in-session beat against the plan: did this stage's manifest
invalidate anything downstream — an interface that came out different from what a later
task assumes, a dependency that proved wrong, a task now moot? If yes, **amend**: `Edit`
the plan file directly, append a Decision Log entry marked `amendment` (≤2 sentences),
refresh `STATUS.md`, and carry on. Amendments are uncapped — they are steering, not
iteration; the capped loops (plan revision, implementer re-dispatch) are untouched. If
drift invalidates the milestone's acceptance criterion itself, stop the execute and
re-enter the Plan gate — that consumes the one plan revision.

After all tasks complete, run the Review gate (`gates/review.md`) ONCE on the cumulative
diff — the Critic's assumption-level review of the whole phase.

## Debugging an in-flight failure

When an implementer hits an unexpected failure (test won't pass, behavior makes no
sense), run ONE structured pass before any retry — never blind-fix:

1. Read the actual error completely (message, stack, line numbers) — it often contains
   the answer.
2. Reproduce it deliberately; note what changed recently (`git diff`, new deps, config).
3. **Multi-component failure? Instrument the boundaries BEFORE hypothesizing:** log what
   enters and exits each component in the chain, run once, and let the evidence say
   WHICH layer breaks — then investigate that layer. Don't guess across a stack.
4. One hypothesis at a time, smallest possible change to test it. Didn't hold? New
   hypothesis — never stack a second fix on top of an unverified first.

**The architecture breaker: three failed fixes means the problem is the design, not the
code.** If fixes keep revealing new coupling in different places, or each fix creates
symptoms elsewhere — stop dispatching fix #4. That is a wrong-architecture signal:
treat it as a blocker, file it with the evidence trail, and let the goal's plan (or the
human) decide. This rule is deliberately pressure-proof — it applies MOST when the run
is nearly done and one more fix feels close.

If still stuck after the structured pass, treat as a blocker.

## Blockers

- The phase Review gate fails to converge after its one implementer re-dispatch → mark
  goal `blocked`, file `sleeper-tasks` with link to plan and run dir, continue to the
  next goal.
- The debugging pass above ends stuck, or trips the architecture breaker → same.
- An implementer subagent reports a blocker it cannot resolve (e.g. needs an API key,
  requires a service restart) → mark goal `blocked`, file `sleeper-tasks`, continue.

## Close

Run the Close gate (`gates/close.md`). The commit happens there.
