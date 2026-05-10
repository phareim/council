# RESEARCH mode

Used when the goal produces a knowledge artifact (wiki entry, write-up) and changes no code.

No `superpowers` skill matches this directly — this pipeline is council-defined.

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
   RESEARCH OUTLINE:
   <full outline>

   Does this outline produce something a person would want to read? If yes, say so. If not, propose the smallest revision that would fix the framing.
   ```

2. Apply BP's suggestions to the outline before Execute. If BP's revision is substantive (changes the section count, reframes the target artifact), the Organizer judges whether to re-run the critique pass or accept BP's framing as-is.

## Execute step

For each section in the outline, dispatch a research subagent. Use `superpowers:dispatching-parallel-agents` if there are 3+ independent sections; otherwise dispatch sequentially or in pairs.

Each research subagent gets:
- The full outline (so it can avoid duplicating)
- ITS section to write
- Tools allowed: `WebSearch`, `WebFetch`, `Bash`, `Read`, `Grep`
- Instruction: "Write a focused markdown section answering the section question. Cite sources inline as `[#1](url)`. End with a list of open questions you couldn't resolve."

Save each section to `<run-dir>/work/<Gn>/section-<N>.md`.

After all sections are in:
1. Assemble the full draft (sections in order, with a short lede if helpful) into `<run-dir>/work/<Gn>/draft.md`. This is the file the Close gate will read.
2. Run a Critic subagent on the assembled draft. Embed `personalities/critic.md` and ask: "Review this assembled research write-up for evidence quality, claims-without-sources, gaps, and overstatements." Save the Critic's response to `<run-dir>/work/<Gn>/critic-pass.md` and apply suggested fixes back into `draft.md`.

## Blockers

- A section subagent reports it cannot find sources for its question → if the question is core to the goal, mark goal `blocked`. If the question is incidental, drop the section, note it as an open question in the final write-up, and continue.
- Two failed Critic cycles → ship the current draft and file a `sleeper-tasks` follow-up.

## Close

Run the Close gate (`gates/close.md`). Beautiful Person assembles the final wiki entry from the sections (in human voice, not section-dump format), writes it to `~/thoughts/wiki/<slug>.md`, updates `~/thoughts/INDEX.md`, and creates the SFL idea. Git commits and pushes are handled by the `thoughts-autocommit` PM2 service.
