# Council learning loop

The council keeps a SQLite memory of its own runs at `~/council/data/council.sqlite` (tool: `scripts/learn.mjs`, no deps, auto-inits). The loop is deliberately thin — two mandatory writes, one mandatory read, everything else optional. Protocol denser than what gets executed is noise (P6.2's lesson); the tool enforces the loop mechanically so the protocol doesn't have to.

## The loop

| When | What | Mandatory |
|---|---|---|
| Intake (Step 0) | `<skill-dir>/scripts/learn.mjs run-start <run-id> --dir <run-dir> --goals <n>` — prints the lesson digest after registering the run; read it and fold relevant lessons into Frame-gate dispatch prompts as `PRIOR LESSONS:` lines | yes |
| Any gate, any time | `<skill-dir>/scripts/learn.mjs reflect <run-id> --text "..." [--goal Gn] [--phase <gate>]` — one observation about the *process* (not the work) while it is fresh | no |
| Report (Step 2) | Self-review: answer the questionnaire below into `<run-dir>/self-review.md`, then `review <run-id> --file <run-dir>/self-review.md --lesson "..."` (1–3 lessons) | yes |
| Report (Step 2) | `run-end <run-id> --status <done|partial|aborted> --register <run-dir>/register.md` | yes (refuses without the self-review) |

`recall` re-prints the digest any time, bounded (≤40 lines); `--grep <word>` narrows it when a goal touches familiar ground. Invoke the script directly (it is executable) — bare `node` invocation prints an ExperimentalWarning that pollutes captured output.

## Self-review questionnaire

Answer all four in `<run-dir>/self-review.md`, 2–5 sentences each, then distill 1–3 one-line lessons for `--lesson`. These are judgment questions — never report metrics you did not directly observe.

1. **What dragged, got skipped, or got worked around this run?** Where did the written protocol and what actually happened diverge?
2. **Returns discipline:** where did a subagent return leak (wall of prose) or a structured return prove too thin (you had to read the per-role file anyway)?
3. **Cost vs. catch:** did each extra pass (BP plan pass, phase review, critique re-dispatch) earn its cost this run? Name one that did and one that didn't.
4. **Next time:** what should the next run do differently — and is that a *skill edit* (file it: `sfl meta add` on the council repo, or edit now if trivial) or just *discipline* (make it a lesson)?

A lesson is a one-liner a future Organizer can act on at Intake, e.g. `"RESEARCH goals with <3 sections: skip the Workflow, dispatch inline — setup overhead dominated"` — not a diary entry.

## Reading the memory

- Run start: `recall` (mandatory, above).
- Reviewing the skill itself: `recall --limit 30` plus `sqlite3 ~/council/data/council.sqlite` for ad-hoc queries — the `reflections` table holds full self-reviews (`kind='self-review'`), not just the lesson digests.
- The db also pays IMPROVEMENTS.md's standing measurement debts (P2.3 BP-pass value, P4.1 structured-return thinness): questions 2 and 3 collect exactly that signal, run over run.
