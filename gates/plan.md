# Plan gate

Per goal. Produces a mode-specific plan and re-engages Starter and Critic for plan critique.

## Inputs
- Goal text + Mode (from `register.md`)
- Frame artifact (`<run-dir>/frame/<Gn>.md`)

## Procedure

**Before drafting**, read the most recent `decisions.md` entry for `<Gn>` (typically the Frame gate's). Carry its synthesis forward into your prompt to the subagents below — anchor the plan in what was already decided rather than re-deriving it.

1. **Draft the plan via the mode pipeline:**
   - CODE → invoke `superpowers:writing-plans` via the `Skill` tool. The plan is saved to `docs/superpowers/plans/...` per that skill. Then ALSO copy the plan markdown into `<run-dir>/plan/<Gn>.md` for council-local reference.
   - RESEARCH → see `modes/research.md` Plan section. Write the research outline directly to `<run-dir>/plan/<Gn>.md`.
   - MIXED → see `modes/mixed.md`. Produces both a research plan and a code plan, both written under `<run-dir>/plan/<Gn>/`.

2. **Re-dispatch Starter and Critic in parallel** for plan critique. Same dispatch shape as the Frame gate (including the no-dispatch-tool fallback: voice in-session if needed). The embedded prompt is:

   ```
   GOAL: <goal text>
   MODE: <CODE | RESEARCH | MIXED>
   FRAME SYNTHESIS:
   <synthesis section from frame/<Gn>.md>

   PLAN DRAFT:
   <full plan markdown>

   Critique this plan. Sections:
   - **Missing pieces** (Critic) / **Stronger version** (Starter)
   - **Risks specific to this plan**
   - **Verdict**: ship-as-is | small-fixes-needed | needs-rework
   ```

3. **Synthesize as Organizer.** If both verdicts are `ship-as-is`, proceed. If either says `needs-rework`, revise the plan once and re-dispatch — but only once. After one revision, ship whichever version the Organizer judges strongest.

4. **Append a Decision Log entry** to `<run-dir>/decisions.md`.
