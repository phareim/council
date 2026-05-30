# RESEARCH mode

Used when the goal produces a knowledge artifact (wiki entry, write-up) and changes no code.

No `superpowers` skill matches this directly — this pipeline is council-defined.

Follows the [Subagent return shape](../SKILL.md#subagent-return-shape-disk-first-convention) rule. Research execute is the second-largest context leak in the council (N section bodies through the Organizer + an assembly pass), so this mode pushes all heavy bodies to disk and uses a dedicated assembler subagent.

## Plan step

The plan is a research outline. Write it directly to `<run-dir>/plan/<Gn>.md` with this shape:

```markdown
# Research plan — <Gn>: <goal>

## Target artifact
- Type: wiki-entry | sfl-idea | chat-note
- Location: <wiki path / SFL tag / chat thread>
- Estimated length: <small (1-2 paragraphs) | medium (1 page) | long (multi-section)>

## Outline
1. <Section title> — <one-sentence what-it-answers>
2. <Section title> — <one-sentence what-it-answers>
3. ...

## Sources to consult
- Web: <general areas, e.g. "frontier-lab blog posts, MCP spec docs">
- Internal: <e.g. "existing wiki entries on related topics", "chat history via sleepy">

## Open questions to resolve
- <question>
- <question>
```

Then run the Plan gate's critique pass on the outline.

## BP plan pass

After the critique pass converges, run a 30-second Beautiful Person pass on the outline:

1. Dispatch a Beautiful Person subagent. Embed `personalities/beautiful-person.md` and append:

   ```
   RESEARCH OUTLINE FILE: <run-dir>/plan/<Gn>.md
   (Read it from disk.)

   Does this outline produce something a person would want to read?

   OUTPUT DISCIPLINE:
   - If yes: return a one-line "ship as-is" verdict.
   - If no: write your proposed revised outline to <run-dir>/plan/<Gn>-bp-revision.md, and return ONLY the file path + a ≤80-word summary of what you changed and why.
   Do NOT echo the outline back to me.
   ```

2. If BP returned a revision, the Organizer reads `<Gn>-bp-revision.md`, applies the smallest version that addresses BP's note to `<run-dir>/plan/<Gn>.md`, and (if the revision is substantive — changes section count or reframes the target artifact) decides whether to re-run the critique pass or accept BP's framing as-is. Drop the revision file from working memory once applied.

## Execute step

For each section in the outline, dispatch a research subagent. Use `superpowers:dispatching-parallel-agents` if there are 3+ independent sections; otherwise dispatch sequentially or in pairs.

Each research subagent gets:
- The PATH to the outline (`<run-dir>/plan/<Gn>.md`) — they read it from disk
- The section number and title ITS section is responsible for
- Tools allowed: `WebSearch`, `WebFetch`, `Bash`, `Read`, `Grep`
- Embedded instructions, verbatim:

  ```
  Write a focused markdown section answering the section question. Cite sources inline as [#1](url). End with a list of open questions you couldn't resolve.

  OUTPUT DISCIPLINE:
  1. Write your FULL section to <run-dir>/work/<Gn>/section-<N>.md.
  2. Return to me ONLY:
     - the file path you wrote to
     - word count
     - up to 5 key-claim bullets (≤25 words each)
     - up to 3 open questions you couldn't resolve
     - source count (number of distinct URLs cited)
  Do NOT echo the section body. The Organizer / assembler will read your file.
  ```

The Organizer's working memory after all section dispatches: N short structured returns. No section bodies.

After all sections are in:

1. **Dispatch an Assembler subagent.** Do not assemble in the Organizer — that's what burns context. The Assembler reads the section files from disk and writes the draft.
   - `subagent_type`: `general-purpose`
   - `description`: `"Assemble draft for goal <Gn>"`
   - `prompt`:

     ```
     You are the Assembler for council goal <Gn>.

     OUTLINE FILE: <run-dir>/plan/<Gn>.md
     SECTION FILES: <run-dir>/work/<Gn>/section-1.md ... section-<N>.md

     Read the outline and all section files. Produce a single assembled draft:
     - Sections in outline order
     - A short lede paragraph if helpful (≤80 words) framing what the piece is about
     - Preserve inline citations as written
     - Append a "## Open questions" section at the end aggregating the open questions from each section (deduplicated)
     - Append a "## Sources" section listing distinct cited URLs in citation order

     Write the assembled draft to <run-dir>/work/<Gn>/draft.md.

     Return to me ONLY:
     - the file path you wrote to
     - final word count
     - distinct source count
     - any sections you had to skip or flag as incoherent (with a one-line reason each)
     Do NOT echo the draft.
     ```

2. **Dispatch a Critic subagent on the assembled draft.** Embed `personalities/critic.md` system prompt verbatim, then append:

   ```
   DRAFT FILE: <run-dir>/work/<Gn>/draft.md
   (Read it from disk.)

   Review this assembled research write-up for evidence quality, claims-without-sources, gaps, and overstatements.

   OUTPUT DISCIPLINE:
   1. Write your FULL review to <run-dir>/work/<Gn>/critic-pass.md.
   2. Return to me ONLY:
      - the file path you wrote to
      - Verdict: accept | targeted-fixes | rework
      - Up to 5 targeted fixes, each ≤40 words, in the form "[paragraph or section anchor] one-line claim — concrete fix"
   Do NOT echo the draft or your full review.
   ```

3. **Apply fixes.** If the verdict is `targeted-fixes`, the Organizer applies them directly to `draft.md` using the per-fix anchors (Edit tool, not full rewrites). If the verdict is `rework`, dispatch the Assembler ONCE more with the Critic's findings file path in its prompt; then ship whichever version is stronger (per the council-wide iteration cap).

## Blockers

- A section subagent reports it cannot find sources for its question → if the question is core to the goal, mark goal `blocked`. If the question is incidental, drop the section, note it as an open question in the final write-up, and continue.
- Two failed Critic cycles → ship the current draft and file a `sleeper-tasks` follow-up.

## Close

Run the Close gate (`gates/close.md`). Beautiful Person reads `draft.md` from disk and writes the final wiki entry (in human voice, not section-dump format) directly to `~/thoughts/wiki/<slug>.md`, updates `~/thoughts/INDEX.md`, and creates the SFL idea. Git commits are handled by the `thoughts-autocommit` PM2 service.
