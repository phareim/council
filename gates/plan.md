# Plan gate

Per goal. Produces a mode-specific plan and re-engages Starter and Critic for plan critique.

Follows the [Subagent return shape](../SKILL.md#subagent-return-shape-disk-first-convention) rule. The plan body lives on disk; the gate's job in Organizer context is to decide ship/revise/rework from short verdicts, not to read the plan inline.

## Inputs
- Goal text + Mode (from `register.md`)
- Frame artifact (`<run-dir>/frame/<Gn>.md`) — synthesis only; role bodies are in sibling files

## Procedure

**Before drafting**, read the most recent `decisions.md` entry for `<Gn>` (typically the Frame gate's). Carry its synthesis forward into your prompt to the subagents below — anchor the plan in what was already decided rather than re-deriving it. Do not re-read the full Frame role files unless the synthesis is insufficient.

1. **Draft the plan via the mode pipeline:**
   - CODE → invoke `superpowers:writing-plans` via the `Skill` tool. The plan is saved to `docs/superpowers/plans/...` per that skill. Record the canonical plan path and copy a council-local reference into `<run-dir>/plan/<Gn>.md` (a stub: `Plan: <canonical-path>` plus the acceptance criterion). The Organizer should NOT hold the full plan markdown in working memory after this step — only the path.
   - RESEARCH → see `modes/research.md` Plan section. Write the research outline directly to `<run-dir>/plan/<Gn>.md`. The Organizer is the author here, so the outline is unavoidably in context briefly; drop references to it after the critique pass converges.
   - MIXED → see `modes/mixed.md`. Produces both a research plan and a code plan, both written under `<run-dir>/plan/<Gn>/`.

2. **Re-dispatch Starter and Critic in parallel** for plan critique. Same dispatch shape as the Frame gate (including the no-dispatch-tool fallback: voice in-session if needed). The embedded prompt is:

   ```
   GOAL: <goal text>
   MODE: <CODE | RESEARCH | MIXED>
   FRAME SYNTHESIS FILE: <run-dir>/frame/<Gn>.md
   (Read the "Organizer synthesis" section. Only consult the role files in the same directory if you need detail.)

   PLAN FILE: <canonical plan path>
   (Read the plan from disk.)

   Critique this plan.

   OUTPUT DISCIPLINE:
   1. Write your FULL critique — sections "Missing pieces" (Critic) or "Stronger version" (Starter), "Risks specific to this plan", and any concrete fix suggestions — to <run-dir>/plan/<Gn>-<role>.md (role = "starter" or "critic").
   2. Return to me ONLY:
      - the file path you wrote to
      - Verdict: ship-as-is | small-fixes-needed | needs-rework
      - Top 3 findings, each ≤60 words, in the form "[severity] one-line claim — concrete pointer (plan section heading or task number)"
   Do NOT echo the plan or your full critique.
   ```

3. **Synthesize as Organizer** using only the two structured returns (verdicts + top-3 findings). If the findings conflict or are too thin to decide, `Read` the relevant per-role critique file on demand, then drop it from working memory after the decision is logged.
   - Both `ship-as-is` → proceed to Execute.
   - One or both `small-fixes-needed` → the Organizer applies the listed fixes directly to the plan file with `Edit` (no re-dispatch), then proceeds.
   - Either `needs-rework` → revise the plan once (CODE: re-invoke `superpowers:writing-plans` with the critique findings; RESEARCH/MIXED: Organizer re-drafts) and re-dispatch critics ONCE. Prefer `SendMessage(to: <critic agentId>)` to continue the same critic with its context intact (main-loop dispatch only). After one revision, ship whichever version is strongest.

4. **Append a Decision Log entry** to `<run-dir>/decisions.md`. The entry records: plan path, critic-file path, starter-file path, final verdict, acceptance criterion (copied forward from Frame). It does NOT inline the plan body.

After this gate, treat the plan file path as the source of truth. The Organizer should not be carrying plan prose into the Execute phase — Execute reads from disk (CODE: `superpowers:subagent-driven-development` reads the plan; RESEARCH: section subagents read the outline).
