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

2. **Synthesize as Organizer.** Possible outcomes:
   - Both accept → mark task done, move on.
   - One says fix-ups → apply fix-ups (small, in-place edits or one more implementer dispatch), then re-review.
   - Either says redo, OR three consecutive review cycles fail to converge → declare a true blocker on this goal: file a `sleeper-tasks` entry and move to the next goal.

3. **Append a Decision Log entry.**
