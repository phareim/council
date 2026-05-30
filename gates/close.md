# Close gate

Per goal. Beautiful Person reviews the final outputs and produces external state changes.

Follows the [Subagent return shape](../SKILL.md#subagent-return-shape-disk-first-convention) rule. BP's rewritten commit message and (for RESEARCH/MIXED) the final wiki entry can be large — they are written to disk by BP, not echoed through the Organizer.

## Inputs
- Goal text + Mode (from `register.md`)
- All work artifacts (`<run-dir>/work/<Gn>/`, plan, frame, etc.) — referenced by path
- For CODE: the commits on the current branch (and the cumulative diff)
- For RESEARCH: the assembled draft at `<run-dir>/work/<Gn>/draft.md`

## Procedure

**Before verification**, read the most recent `decisions.md` entry for `<Gn>` (typically the Plan gate's). Beautiful Person should know what trade-offs were already made before suggesting revisions. Do not re-read the full plan or frame role files — the synthesis lines are enough.

1. **Invoke `superpowers:verification-before-completion`** via the `Skill` tool to verify any concrete claims before closing (e.g. "tests pass", "the wiki entry is reachable"). If that skill returns verbose output in-band, the Organizer keeps only the pass/fail summary and (on failure) the first failing command + output — full transcript goes to `<run-dir>/close/<Gn>-verification.md` and is dropped from working memory.

2. **Stage the inputs BP needs on disk** so BP can read from disk rather than have them passed inline:
   - CODE: `git diff <merge-base>..HEAD > <run-dir>/close/<Gn>-diff.patch` (cumulative diff for the goal). Draft an initial commit message at `<run-dir>/close/<Gn>-commit-msg.txt` (one-line subject + short body — the Organizer's first pass).
   - RESEARCH: `draft.md` is already at `<run-dir>/work/<Gn>/draft.md`.
   - MIXED: do both.

3. **Dispatch a single Beautiful Person subagent** (same dispatch shape as the Frame gate, including the no-dispatch-tool fallback: voice in-session if needed). Embed `personalities/beautiful-person.md` system prompt verbatim, then append the mode-specific block:

   **CODE:**
   ```
   GOAL: <goal text>
   MODE: CODE
   DIFF FILE: <run-dir>/close/<Gn>-diff.patch
   COMMIT MESSAGE DRAFT FILE: <run-dir>/close/<Gn>-commit-msg.txt
   (Read both from disk.)

   Apply your craft to the commit message — clarity, voice, the right level of detail. The diff is your context, not something to rewrite.

   OUTPUT DISCIPLINE:
   1. Overwrite <run-dir>/close/<Gn>-commit-msg.txt with your final commit message (subject + body). No surrounding prose.
   2. If you spot code follow-ups (substantive fixes deferred to later, or polish items), write them as a numbered list to <run-dir>/close/<Gn>-followups.md (each: title — one-line description — substantive|polish).
   3. Return to me ONLY:
      - Verdict: ship | ship-with-followups | needs-revision
      - Followups file path (or "none")
      - ≤60-word rationale
   Do NOT echo the commit message or the followups.
   ```

   **RESEARCH:**
   ```
   GOAL: <goal text>
   MODE: RESEARCH
   DRAFT FILE: <run-dir>/work/<Gn>/draft.md
   TARGET WIKI PATH: ~/thoughts/wiki/<slug>.md
   WIKI CONVENTIONS: ~/thoughts/.claude/skills/wiki-maintenance/SKILL.md
   (Read the draft and conventions from disk.)

   Produce the final wiki entry in human voice (not section-dump). Follow the conventions exactly: one-paragraph summary → sections → ## Sources → ## Related topics, with [[topic-name]] links.

   OUTPUT DISCIPLINE:
   1. Write the final wiki entry to ~/thoughts/wiki/<slug>.md.
   2. Update ~/thoughts/INDEX.md to reference it (per the wiki-maintenance conventions).
   3. If you spot follow-ups (related entries to write, sources to chase), write them to <run-dir>/close/<Gn>-followups.md.
   4. Return to me ONLY:
      - Verdict: ship | ship-with-followups | needs-revision
      - Wiki file path
      - Followups file path (or "none")
      - ≤60-word rationale
   Do NOT echo the wiki entry.
   ```

   **MIXED:** combine both blocks; BP writes both the commit message and the wiki entry to their respective paths.

4. **Apply BP's follow-ups** (if any). The Organizer reads `<Gn>-followups.md`, files each as `sleeper-tasks` (if substantive) or `sfl meta add` (if polish), records the IDs in the Close artifact, and drops the file from working memory.

5. **If verdict is `needs-revision`** — re-engage BP exactly once with a tightened prompt (the Organizer's note on what to fix), per the [Iteration limits](../SKILL.md#iteration-limits) cap. If the second pass still says `needs-revision`, file a `sleeper-tasks` follow-up and ship what's there.

6. **Perform external state changes:**
   - CODE: `git commit -F <run-dir>/close/<Gn>-commit-msg.txt`. The `-F` form means the commit message never enters Organizer context as inline text.
   - RESEARCH: BP already wrote the wiki entry and updated INDEX.md. The wiki repo is auto-committed by the `thoughts-autocommit` PM2 service (30s debounce) — no manual git needed. Then `sfl meta add` an idea pointing to the article path.
   - MIXED: do both.

7. **Write `<run-dir>/close/<Gn>.md`** as an index, not a transcript:

   ```markdown
   # Close — <Gn>: <goal text>

   ## Verdict
   <ship | ship-with-followups | needs-revision> — <≤40-word rationale>

   ## Artifacts
   - Commit message file: ./<Gn>-commit-msg.txt
   - Diff file:           ./<Gn>-diff.patch (if CODE/MIXED)
   - Verification log:    ./<Gn>-verification.md (if produced)
   - Followups file:      ./<Gn>-followups.md (or "none")
   - Commit hash:         <hash> (if CODE/MIXED)
   - Wiki path:           ~/thoughts/wiki/<slug>.md (if RESEARCH/MIXED)
   - SFL idea ID:         <id> (if RESEARCH/MIXED)
   - Followup task IDs:   <list>
   ```

8. **Update `register.md`**: set status to `done` (or `needs-revision` if BP said so AND the Organizer decided to file rather than re-engage; in the file-rather-than-re-engage case it's effectively `done` with a follow-up).

9. **Append a Decision Log entry.** References paths from step 7 — does NOT inline the commit message, diff, wiki entry, or followups list.
