# Council of Experts

Autonomous multi-goal Claude Code skill. Hands the council one or more free-text goals; each runs through Frame → Plan → Execute → Close gates with five personalities (Librarian, Starter, Critic, Organizer, Beautiful Person) and ships the result. Once goals are accepted, the session does not pause for input — the user reads the live transcript and the run directory.

The matching `/council` slash command lives in [phareim/sleeper](https://github.com/phareim/sleeper/blob/main/claude/commands/council.md). This repo holds the skill content that Claude Code loads when `/council` is invoked.

## Install

```bash
git clone git@github.com:phareim/council.git ~/github/council
ln -s ~/github/council ~/.claude/skills/council-of-experts
```

The skill loads automatically on the next Claude Code session start.

## Where to read

- **`SKILL.md`** — entry point: lifecycle, the per-goal loop, mid-run interrupt channel, iteration limits, the disk-first subagent-return-shape convention, Workflow fan-out, model/tool/plan-mode rules, composition with `superpowers:` skills.
- **`personalities/`** — one file per role (Librarian, Starter, Critic, Organizer, Beautiful Person).
- **`gates/`** — Frame, Plan, Review, Close procedures.
- **`modes/`** — CODE, RESEARCH, MIXED Execute pipelines.
- **`templates/`** — Goal Register, Decision Log entry, live Status heartbeat, final Report.
- **`scripts/learn.mjs` + `learning.md`** — the meta-learning loop: SQLite memory of past runs (two mandatory writes, one mandatory read; `run-end` refuses to finalize without a self-review).
- **`IMPROVEMENTS.md`** — record of the process-improvement plan (P1–P6, all items shipped).

## Design principle: heavy output never transits the Organizer

To keep the Organizer's context lean enough for long, multi-goal runs, every subagent dispatch follows one rule: **the subagent writes its full output to a known file path; it returns only a verdict + a short, bounded summary.** Gate artifacts (`frame/<Gn>.md`, `plan/<Gn>.md`, `close/<Gn>.md`) are indexes pointing at per-role files, not verbatim transcripts. See `SKILL.md` → "Subagent return shape (disk-first convention)".

For **Execute-phase fan-out** (RESEARCH sections, MIXED parallel tracks, ≥3 independent units) the skill uses the `Workflow` tool, which enforces the same principle natively — `agent()` results live in script variables and never reach the Organizer; the script returns only a thin manifest, with final artifacts still written to the run dir. Frame/Plan/Close stay in the main session. See `SKILL.md` → "Fan-out execution: the Workflow tool". The skill also adopts schema-validated returns, per-role model/effort selection, `SendMessage` re-dispatch, worktree isolation for concurrent file mutation, and `ToolSearch` for deferred tools — see `IMPROVEMENTS.md` P5.

## Mid-run nudge

The council never prompts the user, but the user has a one-way push channel: write to `<RUN_DIR>/INTERRUPT.md` (freeform markdown). The Organizer reads it at the next gate boundary, treats it as a high-priority intervention, and archives it. See `SKILL.md` → "Mid-run interrupt channel".

## Long runs on sparse goals (P7)

The skill's home turf is long, unattended runs on large, loosely specified goals. Four mechanisms serve that shape specifically:

- **Charter** — L-sized/sparse goals get a printed interpretation (reading, scope in/out, top-3 risky assumptions, ambition tier) right after Frame, so the user has something dense to react to via `INTERRUPT.md` while redirecting is still cheap. (`gates/frame.md` step 4b)
- **Milestones** — L-sized goals split risk-first into 2–5 milestones; M1 is the walking skeleton, and every milestone Close commits, pushes, and verifies. A wrong charter assumption surfaces as a small shipped M1, not hours of unshipped work. (`gates/frame.md`, `templates/register.md`)
- **Status heartbeat + resume** — `<RUN_DIR>/STATUS.md` is overwritten at every gate boundary (the live view); and because each gate's completion is the existence of its index artifact, `/council resume <run-dir>` re-enters a dead session deterministically from `register.md` + `STATUS.md` + the last Decision Log entry. (`SKILL.md` → "Run status heartbeat", "Resuming a run")
- **Drift checks** — during long CODE executes, the Organizer checks after each Workflow stage whether the plan's downstream assumptions still hold, and amends the plan file in place (uncapped, logged) rather than discovering the decay at Review. (`modes/code.md`)
