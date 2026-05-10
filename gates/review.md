# Review gate (per task)

Used during CODE-mode execution after each task in the implementation plan.

## Inputs
- Task description (from the plan)
- Diff or commit produced by the implementer

## Procedure

1. **Run two reviews in parallel:**

   a. Invoke `superpowers:requesting-code-review` via the `Skill` tool. This produces a structured technical review.

   b. Dispatch a Critic subagent. Embed `personalities/critic.md` system prompt verbatim, then append:

      ```
      TASK: <task description>
      DIFF:
      <diff content>

      Review this diff with your adversarial perspective. Sections:
      - **Assumptions that may not hold**
      - **Failure modes specific to this diff**
      - **Verdict**: accept | fix-ups-needed | redo
      ```

2. **Synthesize as Organizer** (per [Iteration limits](../SKILL.md#iteration-limits)). Possible outcomes:
   - Both accept → mark task done, move on.
   - One says fix-ups, *trivial* (typo-class, single-line, the Organizer can fix in place) → apply directly and re-review. Trivial fixups are uncapped.
   - One says fix-ups, *non-trivial* → dispatch the implementer ONCE to address; then re-review.
   - Either says redo, OR the implementer re-dispatch did not converge → declare a true blocker on this goal: file a `sleeper-tasks` entry and move to the next goal.

3. **Append a Decision Log entry.**
