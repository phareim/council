# CODE mode

Used when the goal changes code in a repo and produces no separate knowledge artifact.

## Plan step

Invoke `superpowers:writing-plans` via the `Skill` tool. The implementation plan is saved to that skill's standard location (`docs/superpowers/plans/...`). Copy the resulting plan markdown into `<run-dir>/plan/<Gn>.md` for council-local reference.

Then run the Plan gate's critique pass (`gates/plan.md` step 2-4) on the plan.

## Execute step

Invoke `superpowers:subagent-driven-development` via the `Skill` tool with the plan as input. That skill's "continuous execution" rule aligns with the council's no-pausing rule — there should be no pauses between tasks.

After each task in the plan, run the Review gate (`gates/review.md`) to add the Critic's perspective. The Organizer synthesizes the technical review + Critic review before allowing the next task to start.

## Blockers

- Three consecutive Review-gate cycles fail to converge → mark goal `blocked`, file `sleeper-tasks` with link to plan and run dir, continue to the next goal.
- An implementer subagent reports a blocker it cannot resolve (e.g. needs an API key, requires a service restart) → mark goal `blocked`, file `sleeper-tasks`, continue.

## Close

Run the Close gate (`gates/close.md`). The commit happens there.
