# Frame gate

Per goal. Produces a synthesized framing and a Mode classification.

## Inputs
- Goal text (from `register.md`)
- Goal ID (e.g. `G1`)
- Run directory path

## Procedure

1. **Dispatch Starter and Critic in parallel.** Single message, two parallel subagent dispatches via the `Agent` tool (in some harnesses called `Task`; if it appears under `ToolSearch` as a deferred tool, fetch it first with `ToolSearch select:Agent`). If the harness has no subagent-dispatch tool at all, voice both Starter and Critic in-session by reading their personality files and writing both responses into the gate artifact — synthesis discipline applies unchanged. Each call:
   - `subagent_type`: `general-purpose`
   - `description`: `"Frame goal <Gn>"` (Starter) or `"Critique goal <Gn>"` (Critic)
   - `prompt`: load the personality file (`personalities/starter.md` or `personalities/critic.md`) and embed the system-prompt blockquote verbatim at the top of the Agent prompt, then append:

     ```
     GOAL: <goal text>

     Frame this goal. Produce a markdown response with these sections:
     - **Reframing**: what is this goal really asking for, in your voice?
     - **Strongest version**: the most ambitious version that could plausibly succeed (Starter) / the version most likely to actually ship (Critic)
     - **Top risks/objections**: the most likely failure modes
     - End with the personality's signature line (Top recommendation / Strongest objection)
     ```

2. **Wait for both responses.**

3. **Synthesize as Organizer:**
   - Read both fully.
   - Adopt the strongest reframing.
   - Adopt the most cogent risk.
   - **Classify the Mode** using the truth table:
     - Code? Does this goal change code in a repo? (yes → has code dimension)
     - Research? Does this goal produce knowledge artifacts to read later? (yes → has research dimension)
     - CODE / RESEARCH / MIXED / reject — see spec.
   - If neither dimension applies, re-run the Frame gate ONCE with a stricter prompt: `"This goal as written has neither a code change nor a knowledge artifact. Reframe it as one or both, OR explain why it cannot be."` After two failed reruns, file the goal to `sleeper-tasks` as needs-clarification and continue to the next goal.

4. **Write `<run-dir>/frame/<Gn>.md`:**

   ```markdown
   # Frame — <Gn>: <goal text>

   ## Starter
   <verbatim Starter response>

   ## Critic
   <verbatim Critic response>

   ## Organizer synthesis
   <reframing + adopted risks + mode classification + reasoning>
   ```

5. **Append a Decision Log entry** to `<run-dir>/decisions.md` using `templates/decision.md`.

6. **Update `register.md`**: set `Mode: <CODE|RESEARCH|MIXED>` for this goal.
