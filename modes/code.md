# CODE mode

Used when the goal changes code in a repo and produces no separate knowledge artifact.

**If Intake found `superpowers:*` absent**, every `superpowers:` invocation below has a defined replacement — use the Fallback column of the composition table in `SKILL.md`; do not improvise a new one mid-gate.

## Plan step

Invoke `superpowers:writing-plans` via the `Skill` tool. The implementation plan is saved to that skill's standard location (`docs/superpowers/plans/...`). Record a council-local stub at `<run-dir>/plan/<Gn>.md` — `Plan: <canonical-path>` plus the acceptance criterion — per the Plan gate. Do not copy the plan body; the path is the reference.

Then run the Plan gate's critique pass (`gates/plan.md` step 2-4) on the plan.

## Execute step

Record the starting SHA first (the Review gate's diff anchor):

    mkdir -p "<run-dir>/work/<Gn>" && git rev-parse HEAD > <run-dir>/work/<Gn>/execute-start-sha

Invoke `superpowers:subagent-driven-development` via the `Skill` tool with the plan as input. That skill's "continuous execution" rule aligns with the council's no-pausing rule — there should be no pauses between tasks. Its internal two-stage per-task review (spec compliance + code quality) plus final whole-implementation review IS the technical review; the council does not duplicate it per task.

**Drift checks (long executes).** Plans decay while they execute. After each Workflow stage returns (or every ~5 completed tasks in a plain agent-dispatch execute), the Organizer spends one in-session beat against the plan: did this stage's manifest invalidate anything downstream — an interface that came out different from what a later task assumes, a dependency that proved wrong, a task now moot? If yes, **amend**: `Edit` the plan file directly, append a Decision Log entry marked `amendment` (≤2 sentences), refresh `STATUS.md`, and carry on. Amendments are uncapped — they are steering, not iteration; the capped loops (plan revision, implementer re-dispatch) are untouched. If drift invalidates the milestone's acceptance criterion itself, stop the execute and re-enter the Plan gate — that consumes the one plan revision.

After all tasks complete, run the Review gate (`gates/review.md`) ONCE on the cumulative diff — the Critic's assumption-level review of the whole phase.

## Blockers

- The phase Review gate fails to converge after its one implementer re-dispatch → mark goal `blocked`, file `sleeper-tasks` with link to plan and run dir, continue to the next goal.
- An implementer hits an unexpected failure (test won't pass, behavior makes no sense) → invoke `superpowers:systematic-debugging` before flailing or retrying blind. If still stuck after one structured pass, treat as a blocker.
- An implementer subagent reports a blocker it cannot resolve (e.g. needs an API key, requires a service restart) → mark goal `blocked`, file `sleeper-tasks`, continue.

## Close

Run the Close gate (`gates/close.md`). The commit happens there.
