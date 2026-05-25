# MIXED mode

Used when the goal has both code-shipping and knowledge-artifact dimensions.

## Plan step

1. Decompose the goal into a research plan and a code plan. The Organizer decides whether they are dependent (research must finish first to inform code) or independent (can run in parallel).
2. Write both plans under `<run-dir>/plan/<Gn>/`:
   - `<run-dir>/plan/<Gn>/research.md` — using the RESEARCH-mode outline shape
   - `<run-dir>/plan/<Gn>/code.md` — produced by `superpowers:writing-plans`
3. Run the Plan gate's critique pass on each plan.
4. Run a BP plan pass on the research outline only (see `modes/research.md` → BP plan pass). The code plan is exempt — `superpowers:writing-plans` already constrains its shape; BP is not a code reviewer.

## Execute step

Two paths:

**Dependent (research-first):**
1. Run the RESEARCH-mode Execute step (`modes/research.md`) to produce the assembled research artifact in `<run-dir>/work/<Gn>/research/`.
2. Use the research output to refine the code plan if needed (the Organizer judges).
3. Run the CODE-mode Execute step (`modes/code.md`).

**Independent (parallel):**
1. Invoke `superpowers:dispatching-parallel-agents` via the `Skill` tool with two parallel tracks:
   - Research track: runs the RESEARCH-mode Execute step
   - Code track: runs the CODE-mode Execute step
2. Wait for both to complete (or one to fail; in which case the other still runs to completion before Close).

## Reconciliation step (parallel branch only)

Follows the [Subagent return shape](../SKILL.md#subagent-return-shape-disk-first-convention) rule. The reconciliation Critic reads both outputs from disk, not from the Organizer's context.

After both research and code tracks complete, before invoking the Close gate:

1. The Organizer **does not** read the full draft or full diff. It looks only at: the assembled draft's path, the section-subagent key-claim summaries (already in working memory from RESEARCH execute), and the code track's per-task review verdicts (already in working memory from the Review gate). Based on those structured returns, decide whether tension is plausible.
2. **If tension is plausible**, dispatch a Critic subagent. Embed `personalities/critic.md` system prompt verbatim, then append:

   ```
   RESEARCH DRAFT FILE: <run-dir>/work/<Gn>/research/draft.md
   CODE DIFF FILE: <run-dir>/close/<Gn>-diff.patch
   (Stage the code diff via `git diff <merge-base>..HEAD > <path>` BEFORE dispatching, same as the Close gate does. Read both from disk.)

   Are these two outputs consistent? Specifically: does the wiki entry's framing match what the code actually does? Are there claims in the draft that the diff contradicts, or vice versa?

   OUTPUT DISCIPLINE:
   1. Write your FULL analysis to <run-dir>/work/<Gn>/reconciliation.md.
   2. Return to me ONLY:
      - the file path you wrote to
      - Verdict: consistent | minor-conflicts | major-conflicts
      - Up to 5 conflicts, each ≤40 words, in the form "[location] one-line claim — recommended resolution (edit draft.md | edit code | reconcile in commit message)"
   Do NOT echo either output or your full analysis.
   ```

3. Apply the Critic's resolutions by editing the affected output(s) before Close. Use `Edit` against the specific files; do not pull the full bodies into Organizer context.
4. **If verdict is `major-conflicts`** and the resolutions would substantively rework either output, file a `sleeper-tasks` follow-up and proceed to Close with the conflict noted in the Close artifact. Per the council-wide iteration cap, do not loop on reconciliation.
5. **If no tension was plausible in step 1**, skip the dispatch and proceed directly to Close.

(Dependent branch is naturally serialized — research informs code — so reconciliation is implicit.)

## Close

Run the Close gate (`gates/close.md`) ONCE for the whole goal. Beautiful Person produces both a wiki entry and a commit/PR description, cross-linked: the wiki entry includes a link to the commit; the commit message references the wiki URL.
