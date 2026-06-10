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
