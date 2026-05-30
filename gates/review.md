# Review gate (per task)

Used during CODE-mode execution after each task in the implementation plan.

Follows the [Subagent return shape](../SKILL.md#subagent-return-shape-disk-first-convention) rule. This gate runs N times per CODE goal — once per task — so its per-cycle context cost compounds faster than any other gate. The reviewers MUST write their full findings to disk and return only verdict + a bounded findings list.

## Inputs
- Task description (from the plan)
- Task index `<N>` (1-based, from the implementation plan)
- Diff or commit produced by the implementer

## Why two reviews

The two reviews dispatched at this gate cover different concerns and are not redundant:

- **`superpowers:requesting-code-review`** — structured *technical* review: correctness, conventions, test coverage, regression risk. The skill knows what good code review looks like in code terms.
- **Critic subagent** — *assumption* review: are the premises behind this approach right? Is the task description still the right thing to be doing? Has something downstream changed that would invalidate this work?

Keep both. Stripping one to "save tokens" loses the orthogonal signal — the technical reviewer won't catch a wrong-problem-being-solved, and the Critic won't catch a missing test case.

## Procedure

1. **Pre-create the reviews directory** once per goal (idempotent):

   ```bash
   mkdir -p "<run-dir>/work/<Gn>/reviews"
   ```

2. **Run two reviews in parallel:**

   a. Invoke `superpowers:requesting-code-review` via the `Skill` tool. If that skill's harness returns the review body in-band, the Organizer immediately writes it to `<run-dir>/work/<Gn>/reviews/task-<N>-tech.md` and discards the in-band copy. Do not keep the full text in the gate's working synthesis — only the verdict and top findings, extracted in the next step.

   b. Dispatch a Critic subagent. Embed `personalities/critic.md` system prompt verbatim, then append:

      ```
      TASK: <task description>
      DIFF FILE: <run-dir>/work/<Gn>/reviews/task-<N>-diff.patch
      (The Organizer has written the diff to this path. Read it from disk.)

      Review this diff with your adversarial perspective.

      OUTPUT DISCIPLINE:
      1. Write your FULL review (Assumptions that may not hold / Failure modes specific to this diff / supporting reasoning) to <run-dir>/work/<Gn>/reviews/task-<N>-critic.md.
      2. Return to me ONLY:
         - the file path you wrote to
         - Verdict: accept | fix-ups-needed | redo
         - Top 3 findings, each ≤60 words, in the form "[severity] one-line claim — concrete pointer (file:line or test name)"
      Do NOT echo your full review. The Organizer will read your file if it needs more.
      ```

   Before dispatching (b), the Organizer writes the diff to `<run-dir>/work/<Gn>/reviews/task-<N>-diff.patch` via Bash (`git diff <since-ref>..HEAD > ...`) so neither the Critic nor the gate's working synthesis has to carry the diff in-band.

3. **Synthesize as Organizer** (per [Iteration limits](../SKILL.md#iteration-limits)) using only the two structured returns — verdicts + top-3 findings. If the findings conflict or feel under-specified, `Read` the relevant per-reviewer file on demand, then drop it from working memory after the decision is logged. Possible outcomes:
   - Both accept → mark task done, move on.
   - One says fix-ups, *trivial* (typo-class, single-line, the Organizer can fix in place) → apply directly and re-review. Trivial fixups are uncapped.
   - One says fix-ups, *non-trivial* → re-dispatch the implementer ONCE to address; then re-review. When the implementer was a main-loop `Agent`, prefer `SendMessage(to: <implementer agentId>)` to continue it with its context intact over a cold restart. (Inside a Workflow this isn't available — the re-dispatch is a fresh `agent()` call carrying the prior diff's path.)
   - Either says redo, OR the implementer re-dispatch did not converge → declare a true blocker on this goal: file a `sleeper-tasks` entry and move to the next goal.

4. **Append a Decision Log entry.** The entry references the two reviewer files by path; it does NOT inline their bodies. Acceptable format: `tech-review: <path> — <verdict>; critic-review: <path> — <verdict>; decision: <accept | fixup | redo | blocker>; rationale: <≤40 words>`.
