---
name: council-of-experts
description: Use when invoking /council with one or more goals — orchestrates a long-running, autonomous Claude Code session that runs goals to completion using the Librarian / Starter / Critic / Organizer / Beautiful-Person personality framework on top of superpowers. The session does NOT pause for user input once goals are accepted; it runs until every goal is done or filed as blocked.
---

# Council of Experts

You are running an autonomous council session. The user has handed you one or more goals. Run them to completion.

**Hard rule:** once Intake accepts the goals, you do NOT prompt the user — not for confirmation, not for "should I continue?", not for status — until the final Report. The user reads the live transcript and the run directory. That is the interface.

## Adopt the Organizer role

Read `personalities/organizer.md` and behave as the Organizer for the rest of this run.

## Lifecycle

```
0. Intake             — parse goals, build run directory, write Goal Register
1. Per goal G in order:
   a. Frame gate      — gates/frame.md (Librarian recall, then parallel Starter+Critic, mode classification)
   b. Plan gate       — gates/plan.md (mode-specific draft + critique)
   c. Execute         — modes/<mode>.md (CODE / RESEARCH / MIXED)
   d. Close gate      — gates/close.md (Beautiful Person, external state changes)
2. Report             — assemble templates/report.md, print + save
```

## Step 0 — Intake

1. **Get goals.** They came in one of two ways:
   - As arguments to `/council` (everything after the command name)
   - With no arguments → ask the user ONCE: "What should I work on? Give me one or more goals separated by `;` or newlines." Then do not ask anything else until the Report.

2. **Parse goals.** Split on `;` or newlines. Trim. Drop empty entries. Number them G1, G2, ...

3. **Create the run directory:**

   ```bash
   RUN_TS=$(date -u +%Y-%m-%d-%H%M)
   SLUG=$(echo "<G1 text>" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g' | cut -d- -f1-3)
   RUN_DIR=~/council/runs/${RUN_TS}-${SLUG}
   mkdir -p "$RUN_DIR"/{frame,plan,work,close}
   ```

4. **Write `goals.md`** (raw goals as accepted, one per line).

5. **Write `register.md`** from `templates/register.md`. Substitute `<RUN_ID>`, `<RUN_TIMESTAMP_UTC>`, `<RUN_DIR_ABSOLUTE_PATH>`. Add one block per goal (G1, G2, ...) with `<GOAL_TEXT>` filled in and `Mode: pending`, `Status: pending`.

6. **Initialize `decisions.md`** as an empty file with a single header line: `# Decision Log — <RUN_ID>`.

7. **Print to stdout** so the user (watching the transcript) knows what's about to happen:

   ```
   Council run started.
   Run directory: <RUN_DIR>
   Goals: G1 ... Gn
   Mid-run course-correct: write to <RUN_DIR>/INTERRUPT.md
   ```

   This is the LAST stdout-only update until Report. From here on, all updates are file-based.

## Step 1 — Per-goal loop

For each goal G in `register.md` order:

**Before each gate (steps 2–5 below), the Organizer performs the interrupt check** — see [Mid-run interrupt channel](#mid-run-interrupt-channel).

1. Mark G `in-flight` in `register.md`.
2. Run the **Frame gate** (`gates/frame.md`). Produces `frame/G<n>.md` with synthesis and Mode.
3. Run the **Plan gate** (`gates/plan.md`). Produces `plan/G<n>.md`.
4. Run **Execute** per Mode:
   - CODE → `modes/code.md`
   - RESEARCH → `modes/research.md`
   - MIXED → `modes/mixed.md`
5. Run the **Close gate** (`gates/close.md`). Produces `close/G<n>.md` and external state changes.
6. Mark G `done` (or `blocked` / `needs-revision`) in `register.md`.

**On true blocker:** mark `blocked`, file `sleeper-tasks --responsible petter` with a link to `<RUN_DIR>`, continue to the NEXT goal. Do not stop the whole run.

**On `needs-revision`:** Beautiful Person flagged the close. Either re-engage the implementer once (only if BP gave a small, specific fix) or file a `sleeper-tasks` follow-up and ship what's there. Mark accordingly.

## Step 2 — Report

When every goal is `done` or `blocked` or `needs-revision`:

1. Assemble `report.md` from `templates/report.md`. Fill in each section.
2. Print the entire report to stdout.
3. Save to `<RUN_DIR>/report.md`. If the running harness intercepts `Write` for files named `report.md` (some subagent harnesses do, with a "return text not files" heuristic), fall back to `cat <<'EOF' > "$RUN_DIR/report.md" … EOF` via Bash.
4. Stop.

## Mid-run interrupt channel

The user's only mid-run channel into the council is `<RUN_DIR>/INTERRUPT.md`. The council never prompts the user; it just reads this file at well-defined checkpoints if it exists.

**Checkpoints.** Before each gate within Step 1's per-goal loop — i.e., before Frame, before Plan, before Execute, before Close.

**Procedure when found.**
1. Read `<RUN_DIR>/INTERRUPT.md`.
2. Treat the contents as a high-priority Critic-style intervention. Adopt it as the dominant constraint for the next gate's synthesis. Propagate to subagents in their next prompt as `EXTERNAL INTERVENTION: <verbatim contents>`.
3. Move the file to `<RUN_DIR>/interrupts/<UTC-timestamp>.md` to preserve the audit trail.
4. Append a Decision Log entry with `Source: user-interrupt` noted in the Context line.

**Format.** Freeform markdown. The user writes whatever they need to say; the Organizer parses intent.

The Run-start banner (printed at the end of Step 0 Intake) tells the user this channel exists.

## Composition with superpowers

When invoking another skill, use the `Skill` tool with the exact name. Do not re-implement.

| Phase | Skill |
|---|---|
| Plan (CODE) | `superpowers:writing-plans` |
| Execute (CODE) | `superpowers:subagent-driven-development` |
| Per-task TDD | `superpowers:test-driven-development` (inside subagent-driven-development) |
| Parallel work (MIXED, RESEARCH) | `superpowers:dispatching-parallel-agents` |
| Per-task review | `superpowers:requesting-code-review` |
| Verify before close | `superpowers:verification-before-completion` |

## Important context

- The user's CLAUDE.md (`~/CLAUDE.md`) requires committing and pushing code changes when finished. The Stop hook at `~/.claude/hooks/remind-commit-push.sh` enforces this. The Close gate handles it.
- The wiki is a git-tracked tree of markdown files at `~/thoughts/wiki/`. Writes are file-based — create or edit the article file and update `~/thoughts/INDEX.md`. The `thoughts-autocommit` PM2 service auto-commits and pushes the change after a 30s debounce. Conventions (slug rules, required structure, `[[topic-name]]` links) live in `~/thoughts/.claude/skills/wiki-maintenance/SKILL.md`.
- The `sfl` CLI is for SFL ideas; `sleeper-tasks` CLI is for tasks; both are installed.
- The user is `petter`. Address them as such in any text the user will read (commit messages, wiki entries, the Report).
