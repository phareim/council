# Review gate (per task)

Used during CODE-mode execution after each task in the implementation plan.

## Inputs
- Task description (from the plan)
- Diff or commit produced by the implementer

## Why two reviews

The two reviews dispatched at this gate cover different concerns and are not redundant:

- **`superpowers:requesting-code-review`** — structured *technical* review: correctness, conventions, test coverage, regression risk. The skill knows what good code review looks like in code terms.
- **Critic subagent** — *assumption* review: are the premises behind this approach right? Is the task description still the right thing to be doing? Has something downstream changed that would invalidate this work?

Keep both. Stripping one to "save tokens" loses the orthogonal signal — the technical reviewer won't catch a wrong-problem-being-solved, and the Critic won't catch a missing test case.

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
