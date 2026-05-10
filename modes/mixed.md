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

After both research and code tracks complete, before invoking the Close gate:

1. Organizer reads both outputs.
2. **If the Organizer detects tension** — research recommends approach A while code took approach B; research findings would change the code design; the wiki entry would contradict the commit message — dispatch a Critic subagent. Embed `personalities/critic.md` and append:

   ```
   RESEARCH OUTPUT (summary):
   <draft.md highlights>

   CODE OUTPUT (summary):
   <commit summary + key file diffs>

   Are these two outputs consistent? List specific conflicts and recommend a resolution.
   ```

3. Apply the Critic's resolution by editing the affected output(s) before Close.
4. **If no tension**, skip the dispatch and proceed directly to Close.

(Dependent branch is naturally serialized — research informs code — so reconciliation is implicit.)

## Close

Run the Close gate (`gates/close.md`) ONCE for the whole goal. Beautiful Person produces both a wiki entry and a commit/PR description, cross-linked: the wiki entry includes a link to the commit; the commit message references the wiki URL.
