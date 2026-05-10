# Close gate

Per goal. Beautiful Person reviews the final outputs and produces external state changes.

## Inputs
- Goal text + Mode (from `register.md`)
- All work artifacts (`<run-dir>/work/<Gn>/`, plan, frame, etc.)
- For CODE: the unpushed commits on the current branch
- For RESEARCH: the assembled draft

## Procedure

1. **Invoke `superpowers:verification-before-completion`** via the `Skill` tool to verify any concrete claims before closing (e.g. "tests pass", "the wiki entry is reachable").

2. **Dispatch a single Beautiful Person subagent** (same dispatch shape as the Frame gate, including the no-dispatch-tool fallback: voice in-session if needed). Embed `personalities/beautiful-person.md` system prompt verbatim. Provide:
   - Goal text
   - Mode
   - For CODE: the diff(s), proposed commit message draft, file list
   - For RESEARCH: the assembled draft markdown, target wiki path
   - For MIXED: both

   Ask for the response format spelled out in `personalities/beautiful-person.md`.

3. **Apply Beautiful Person's rewrites:**
   - Tonal artifacts → write the rewritten versions to disk before commit/push.
   - Code follow-ups → file as `sleeper-tasks` (if substantive) or `sfl meta add` (if a small future polish). Note IDs in the Close artifact.

4. **Perform external state changes:**
   - CODE: `git commit` (using the BP-rewritten commit message), `git push origin main`. Honors the `~/CLAUDE.md` "always commit and push when finished" rule and the Stop hook at `~/.claude/hooks/remind-commit-push.sh`.
   - RESEARCH: Write the assembled wiki entry to `~/thoughts/wiki/<slug>.md` and update `~/thoughts/INDEX.md`. Slug = lowercase-with-hyphens of the article title. The wiki repo is auto-committed and pushed by the `thoughts-autocommit` PM2 service (30s debounce) — no manual git needed. Article structure must follow the conventions in `~/thoughts/.claude/skills/wiki-maintenance/SKILL.md`: one-paragraph summary → sections → `## Sources` → `## Related topics`, with `[[topic-name]]` links to other wiki articles. Then `sfl meta add` an idea pointing to the article path.
   - MIXED: do both.

5. **Write `<run-dir>/close/<Gn>.md`** with:
   - BP verdict (ship | ship-with-followups | needs-revision)
   - Final artifacts (commit hashes, wiki URL, SFL idea ID, follow-ups)

6. **Update `register.md`**: set status to `done` (or `needs-revision` if BP said so AND the Organizer decided to file rather than re-engage; in the file-rather-than-re-engage case it's effectively `done` with a follow-up).

7. **Append a Decision Log entry.**
