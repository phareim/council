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
- **`templates/`** — Goal Register, Decision Log entry, final Report.
- **`IMPROVEMENTS.md`** — record of the process-improvement plan (P1–P6, all items shipped).

## Design principle: heavy output never transits the Organizer

To keep the Organizer's context lean enough for long, multi-goal runs, every subagent dispatch follows one rule: **the subagent writes its full output to a known file path; it returns only a verdict + a short, bounded summary.** Gate artifacts (`frame/<Gn>.md`, `plan/<Gn>.md`, `close/<Gn>.md`) are indexes pointing at per-role files, not verbatim transcripts. See `SKILL.md` → "Subagent return shape (disk-first convention)".

For **Execute-phase fan-out** (RESEARCH sections, MIXED parallel tracks, ≥3 independent units) the skill uses the `Workflow` tool, which enforces the same principle natively — `agent()` results live in script variables and never reach the Organizer; the script returns only a thin manifest, with final artifacts still written to the run dir. Frame/Plan/Close stay in the main session. See `SKILL.md` → "Fan-out execution: the Workflow tool". The skill also adopts schema-validated returns, per-role model/effort selection, `SendMessage` re-dispatch, worktree isolation for concurrent file mutation, and `ToolSearch` for deferred tools — see `IMPROVEMENTS.md` P5.

## Mid-run nudge

The council never prompts the user, but the user has a one-way push channel: write to `<RUN_DIR>/INTERRUPT.md` (freeform markdown). The Organizer reads it at the next gate boundary, treats it as a high-priority intervention, and archives it. See `SKILL.md` → "Mid-run interrupt channel".
