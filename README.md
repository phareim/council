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

- **`SKILL.md`** — entry point: lifecycle, the per-goal loop, mid-run interrupt channel, iteration limits, composition with `superpowers:` skills.
- **`personalities/`** — one file per role (Librarian, Starter, Critic, Organizer, Beautiful Person).
- **`gates/`** — Frame, Plan, Review, Close procedures.
- **`modes/`** — CODE, RESEARCH, MIXED Execute pipelines.
- **`templates/`** — Goal Register, Decision Log entry, final Report.
- **`IMPROVEMENTS.md`** — record of the post-extraction process-improvement plan (all items shipped).

## Mid-run nudge

The council never prompts the user, but the user has a one-way push channel: write to `<RUN_DIR>/INTERRUPT.md` (freeform markdown). The Organizer reads it at the next gate boundary, treats it as a high-priority intervention, and archives it. See `SKILL.md` → "Mid-run interrupt channel".
