# MIXED mode

Used when the goal has both code-shipping and knowledge-artifact dimensions.

## Plan step

1. Decompose the goal into a research plan and a code plan. The Organizer decides whether they are dependent (research must finish first to inform code) or independent (can run in parallel).
2. Write both plans under `<run-dir>/plan/<Gn>/`:
   - `<run-dir>/plan/<Gn>/research.md` — using the RESEARCH-mode outline shape
   - `<run-dir>/plan/<Gn>/code.md` — produced via the council plan procedure (`procedures/writing-plans.md`)
3. Run the Plan gate's critique pass on each plan.
4. Run a BP plan pass on the research outline only (see `modes/research.md` → BP plan pass). The code plan is exempt — the plan procedure's format rules already constrain its shape; BP is not a code reviewer.

## Execute step

Two paths:

**Dependent (research-first):**
1. Run the RESEARCH-mode Execute step (`modes/research.md`) to produce the assembled research artifact at `<run-dir>/work/<Gn>/draft.md` (the same flat path RESEARCH and the Close gate use — research's filenames don't collide with code-track work).
2. Use the research output to refine the code plan if needed (the Organizer judges).
3. Run the CODE-mode Execute step (`modes/code.md`).

**Independent (parallel):**
1. Run the two tracks concurrently — as a `Workflow` `parallel()` stage ([Fan-out execution](../SKILL.md#fan-out-execution-the-workflow-tool)), or via plain parallel `Agent` dispatches in the main loop if the fan-out must stay interruptible mid-run:
   - Research track: runs the RESEARCH-mode Execute step
   - Code track: runs the CODE-mode Execute step
2. Wait for both to complete (or one to fail; in which case the other still runs to completion before Close). Both tracks' artifacts land in the run dir as usual; a Workflow returns only a thin manifest.

**Worktree isolation.** Only when both tracks mutate the *same repo files* concurrently, run them in `isolation: 'worktree'`. Two things are easy to get wrong:
- Worktree isolates the **repo working tree only**. The run dir (`~/council/runs/...`, an absolute path outside the repo) is shared and safe, so disk-first artifacts are unaffected — both tracks read and write the run dir normally.
- A commit made *inside* a worktree lands on that worktree's branch, invisible to the main tree. So the code track must **not commit inside the worktree** — leave the commit to the Close gate, which runs in the main tree against the reconciled result.

Without concurrent contention on the same repo files, the tracks rarely collide (research writes the run dir, code writes the repo), so plain parallel dispatch is cheaper — skip the worktree.

## Reconciliation step (parallel branch only)

Follows the [Subagent return shape](../SKILL.md#subagent-return-shape-disk-first-convention) rule. The reconciliation Critic reads both outputs from disk, not from the Organizer's context.

After both research and code tracks complete, before invoking the Close gate:

1. The Organizer **does not** read the full draft or full diff. It looks only at: the assembled draft's path, the section-subagent key-claim summaries (already in working memory from RESEARCH execute), and the code track's phase-review verdict + top findings (from the Review gate). Based on those structured returns, decide whether tension is plausible.
2. **If tension is plausible**, dispatch a Critic subagent. Embed `personalities/critic.md` system prompt verbatim, then append:

   ```
   RESEARCH DRAFT FILE: <run-dir>/work/<Gn>/draft.md
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
   Out-of-scope observations: append one line each to <run-dir>/parking-lot.md — do not put them in your return.
   ```

3. Apply the Critic's resolutions by editing the affected output(s) before Close. Use `Edit` against the specific files; do not pull the full bodies into Organizer context.
4. **If verdict is `major-conflicts`** and the resolutions would substantively rework either output, file a `sleeper-tasks` follow-up and proceed to Close with the conflict noted in the Close artifact. Per the council-wide iteration cap, do not loop on reconciliation.
5. **If no tension was plausible in step 1**, skip the dispatch and proceed directly to Close.

(Dependent branch is naturally serialized — research informs code — so reconciliation is implicit.)

## Close

Run the Close gate (`gates/close.md`) ONCE for the whole goal. Beautiful Person produces both a wiki entry and a commit/PR description, cross-linked: the wiki entry includes a link to the commit; the commit message references the wiki URL.
