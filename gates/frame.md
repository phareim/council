# Frame gate

Per goal. Produces a synthesized framing and a Mode classification.

## Inputs
- Goal text (from `register.md`)
- Goal ID (e.g. `G1`)
- Run directory path

## Procedure

1. **Dispatch the Librarian (sequential, before Starter and Critic)** — its findings become context for the parallel pair. Single subagent dispatch via the `Agent` tool. If the harness has no subagent-dispatch tool, the Organizer performs the librarian search itself per `personalities/librarian.md` and writes the result into the gate artifact's Librarian section. The dispatch:
   - `subagent_type`: `general-purpose`
   - `description`: `"Recall prior work for goal <Gn>"`
   - `prompt`: load `personalities/librarian.md`, embed the system-prompt blockquote verbatim at the top, then append:

     ```
     GOAL: <goal text>

     Search the surfaces listed in your personality file for prior work touching this goal. Return the format specified there.
     ```

   Wait for the response.

2. **Dispatch Starter and Critic in parallel.** Single message, two parallel subagent dispatches via the `Agent` tool (in some harnesses called `Task`; if it appears under `ToolSearch` as a deferred tool, fetch it first with `ToolSearch select:Agent`). If the harness has no subagent-dispatch tool at all, voice both Starter and Critic in-session by reading their personality files and writing both responses into the gate artifact — synthesis discipline applies unchanged. Each call:
   - `subagent_type`: `general-purpose`
   - `description`: `"Frame goal <Gn>"` (Starter) or `"Critique goal <Gn>"` (Critic)
   - `prompt`: load the personality file (`personalities/starter.md` or `personalities/critic.md`) and embed the system-prompt blockquote verbatim at the top of the Agent prompt, then append:

     ```
     GOAL: <goal text>

     LIBRARIAN FINDINGS:
     <full Librarian response, including Recommendation>

     Frame this goal. Produce a markdown response with these sections:
     - **Reframing**: what is this goal really asking for, in your voice?
     - **Strongest version**: the most ambitious version that could plausibly succeed (Starter) / the version most likely to actually ship (Critic)
     - **Top risks/objections**: the most likely failure modes
     - End with the personality's signature line (Top recommendation / Strongest objection)
     ```

3. **Wait for both responses.**

4. **Synthesize as Organizer:**
   - Read all three (Librarian, Starter, Critic) fully.
   - If the Librarian found prior work that fundamentally changes what the goal is asking for — e.g., it's already done, or there's an open task — note this in the synthesis and consider revising the goal in `register.md`. In extreme cases (prior work shipped exactly this), file the goal to `sleeper-tasks` as `already-done` and move to the next goal.
   - Adopt the strongest reframing.
   - Adopt the most cogent risk.
   - **Classify the Mode** using the truth table:
     - Code? Does this goal change code in a repo? (yes → has code dimension)
     - Research? Does this goal produce knowledge artifacts to read later? (yes → has research dimension)
     - CODE / RESEARCH / MIXED / reject — see spec.
   - If neither dimension applies, re-run the Frame gate ONCE with a stricter prompt: `"This goal as written has neither a code change nor a knowledge artifact. Reframe it as one or both, OR explain why it cannot be."` After two failed reruns, file the goal to `sleeper-tasks` as needs-clarification and continue to the next goal.
   - **Write a one-line Acceptance criterion** — concrete terms for what makes this goal "done", referencing mode-specific outputs (e.g. `"commit pushed to main with tests green"`, `"wiki/foo.md reachable from INDEX.md, ≥3 sources cited"`). This goes into `register.md` in step 7 below.

5. **Write `<run-dir>/frame/<Gn>.md`:**

   ```markdown
   # Frame — <Gn>: <goal text>

   ## Librarian
   <verbatim Librarian response>

   ## Starter
   <verbatim Starter response>

   ## Critic
   <verbatim Critic response>

   ## Organizer synthesis
   <reframing + adopted risks + mode classification + reasoning + how Librarian findings shaped the synthesis>
   ```

6. **Append a Decision Log entry** to `<run-dir>/decisions.md` using `templates/decision.md`.

7. **Update `register.md`**: set `Mode: <CODE|RESEARCH|MIXED>` and `Acceptance: <one-line>` for this goal.
