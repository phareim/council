# Frame gate

Per goal. Produces a synthesized framing and a Mode classification.

Follows the [Subagent return shape](../SKILL.md#subagent-return-shape-disk-first-convention) rule: each subagent writes its full response to its own file under `<run-dir>/frame/`. The Organizer only ever sees short structured returns and assembles a thin synthesis.

## Inputs
- Goal text (from `register.md`)
- Goal ID (e.g. `G1`)
- Run directory path

## Procedure

1. **Dispatch the Librarian (sequential, before Starter and Critic)** — its findings become context for the parallel pair. Single subagent dispatch via the `Agent` tool. If the harness has no subagent-dispatch tool, the Organizer performs the librarian search itself per `personalities/librarian.md` and writes the result directly to `<run-dir>/frame/<Gn>-librarian.md`. The dispatch:
   - `subagent_type`: `general-purpose`
   - `description`: `"Recall prior work for goal <Gn>"`
   - `prompt`: load `personalities/librarian.md`, embed the system-prompt blockquote verbatim at the top, then append:

     ```
     GOAL: <goal text>

     Search the surfaces listed in your personality file for prior work touching this goal.

     OUTPUT DISCIPLINE:
     1. Write your FULL findings (Most relevant / Possibly relevant / Nothing found + Recommendation) to <run-dir>/frame/<Gn>-librarian.md using the format in your personality file.
     2. Return to me ONLY:
        - the file path you wrote to
        - your Recommendation line, verbatim
        - the count of items in each bucket (e.g. "Most relevant: 2, Possibly relevant: 1")
     Do NOT echo the bodies of the items you found. The Organizer will read your file if it needs detail.
     Out-of-scope observations: append one line each to <run-dir>/parking-lot.md — do not put them in your return.
     ```

   Wait for the response.

   **Small-goal fast path.** If the Librarian reports no prior work AND the goal is unambiguous and S-sized (single file or single artifact, no architectural choice to make), the Organizer MAY skip the Starter dispatch and send only the Critic — the Organizer's own action bias stands in for the generative role, same rationale as the no-dispatch-tool fallback below. Note `fast path` in the Decision Log entry. When in doubt, dispatch both; the pair is the default.

2. **Dispatch Starter and Critic in parallel.** Single message, two parallel subagent dispatches via the `Agent` tool (in some harnesses called `Task`; if it appears under `ToolSearch` as a deferred tool, fetch it first with `ToolSearch select:Agent`). If the harness has no subagent-dispatch tool at all, voice ONLY the Critic in-session — write its framing directly to `<run-dir>/frame/<Gn>-critic.md`. Skip Starter — the Organizer's native voice (already biased toward action by virtue of running the show) covers the generative role adequately, and adversarial-from-cold-context is the hardest role to fake while playing both sides. Synthesis discipline applies unchanged. Each call:
   - `subagent_type`: `general-purpose`
   - `description`: `"Frame goal <Gn>"` (Starter) or `"Critique goal <Gn>"` (Critic)
   - `prompt`: load the personality file (`personalities/starter.md` or `personalities/critic.md`) and embed the system-prompt blockquote verbatim at the top of the Agent prompt, then append:

     ```
     GOAL: <goal text>

     LIBRARIAN RECOMMENDATION: <verbatim Recommendation line from step 1>
     LIBRARIAN FINDINGS FILE: <run-dir>/frame/<Gn>-librarian.md
     (Read this file if and only if you need the detail to frame this goal well.)

     Frame this goal. Write your FULL response — with sections Reframing / Strongest version / Top risks-or-objections / signature line — to <run-dir>/frame/<Gn>-<role>.md (role = "starter" or "critic" — whichever you are).

     Return to me ONLY:
     - the file path you wrote to
     - your signature line, verbatim (Top recommendation / Strongest objection)
     - a ≤120-word synthesis-ready summary (the single thing the Organizer most needs to know from your framing)
     Do NOT echo your full response. The Organizer will read your file if it needs detail.
     Out-of-scope observations: append one line each to <run-dir>/parking-lot.md — do not put them in your return.
     ```

3. **Wait for both responses.**

4. **Synthesize as Organizer:**
   - You have the three short returns (path + recommendation/signature + summary). That is usually enough.
   - If the summaries conflict or feel thin, `Read` the per-role files on demand — but drop them from working memory as soon as the synthesis paragraph below is written.
   - If the Librarian found prior work that fundamentally changes what the goal is asking for — e.g., it's already done, or there's an open task — note this in the synthesis and consider revising the goal in `register.md`. In extreme cases (prior work shipped exactly this), file the goal to `sleeper-tasks` as `already-done` and move to the next goal.
   - Adopt the strongest reframing.
   - Adopt the most cogent risk.
   - **Classify the Mode** using the truth table:
     - Code? Does this goal change code in a repo? (yes → has code dimension)
     - Research? Does this goal produce knowledge artifacts to read later? (yes → has research dimension)
     - Code dimension only → CODE. Research dimension only → RESEARCH. Both → MIXED. Neither → rerun rule below.
   - If neither dimension applies, re-run the Frame gate ONCE with a stricter prompt: `"This goal as written has neither a code change nor a knowledge artifact. Reframe it as one or both, OR explain why it cannot be."` If the rerun still yields neither dimension, file the goal to `sleeper-tasks` as needs-clarification and continue to the next goal.
   - **Write a one-line Acceptance criterion** — concrete terms for what makes this goal "done", referencing mode-specific outputs (e.g. `"commit on main with tests green"`, `"wiki/foo.md reachable from INDEX.md, ≥3 sources cited"`). This goes into `register.md` in step 7 below.

5. **Write `<run-dir>/frame/<Gn>.md`** as an INDEX, not a transcript:

   ```markdown
   # Frame — <Gn>: <goal text>

   ## Role files
   - Librarian: ./<Gn>-librarian.md — <Recommendation line>
   - Starter:   ./<Gn>-starter.md   — <signature line>
   - Critic:    ./<Gn>-critic.md    — <signature line>

   ## Organizer synthesis
   <reframing + adopted risks + mode classification + reasoning + how Librarian findings shaped the synthesis>
   ```

   The role bodies stay in their per-role files. Do NOT paste them into this index.

6. **Append a Decision Log entry** to `<run-dir>/decisions.md` using `templates/decision.md`.

7. **Update `register.md`**: set `Mode: <CODE|RESEARCH|MIXED>` and `Acceptance: <one-line>` for this goal.
