# Council process improvements

**Status:** all items shipped. Original batches (P1–P3) landed 2026-05-10; P4 disk-first hardening landed 2026-05-25; P5 (Opus 4.8 + new Claude Code capabilities) landed 2026-05-30; P6 corrections & metabolism landed 2026-06-10; P7 long-run/sparse-goal fit landed 2026-07-21. Open decisions resolved: `INTERRUPT.md` is freeform; iteration-limit standard adopted as proposed (1 re-dispatch + trivial-unlimited at Review); this file kept at repo root as a record of the work.

A working list of process issues identified during the post-extraction review (2026-05-10), with proposed fixes. Items are ordered by leverage — top items will compound across all future runs and should ship first.

Each item is sized **S** (≤30 min), **M** (30–90 min), or **L** (>90 min), and is written so a future `/council` invocation could take its title as a goal.

---

## P1 — High leverage, low cost (do first)

### P1.1 Mid-run course-correct channel via `INTERRUPT.md`

**Status:** shipped.

**Problem.** Once goals are accepted, the council runs to completion. If Frame misreads a goal, the user watches 30 minutes of wrong work scroll by — there's no defined way to nudge mid-run without breaking the no-pausing rule.

**Fix.** Between every gate, the Organizer checks `<run-dir>/INTERRUPT.md`. If present:
1. Read its contents.
2. Treat as a high-priority Critic-style intervention: append to the next gate's input as `EXTERNAL INTERVENTION: <content>`.
3. Add a Decision Log entry with `Source: user-interrupt`.
4. Move the file to `<run-dir>/interrupts/<UTC-timestamp>.md` (keep durable, don't lose the audit trail).

The user gets a one-way push channel; the council never *prompts* — it just reads if the file exists. Document it in the run-start stdout block so the user knows the convention is available.

**Files.** `SKILL.md` (lifecycle Per-goal loop, run-start stdout), one paragraph somewhere central.
**Effort.** S
**Risks.** User has to know the convention exists. Mitigated by documenting in the run-start banner and the Report.
**Open question.** Freeform text vs. structured (`scope: G2`, `priority: high`)? Recommend freeform — the Organizer is good at parsing intent.

### P1.2 Goal Register exposes the acceptance criterion

**Status:** shipped.

**Problem.** Register tracks status/mode but not "what does done look like?" — that lives buried in `frame/Gn.md`. The register's value as a single-glance dashboard is reduced.

**Fix.** After Frame synthesis, the Organizer writes a one-line acceptance criterion to the register block:
```
## G1: <GOAL_TEXT>
- Mode: CODE
- Acceptance: <one-line synthesized criterion — what makes this goal "done">
- Status: in-flight
- Plan: docs/superpowers/plans/<id>.md
- Output: —
```

**Files.** `templates/register.md`, `gates/frame.md` (synthesis step writes the line).
**Effort.** S
**Risks.** None.

### P1.3 Decision Log becomes load-bearing, not write-only

**Status:** shipped.

**Problem.** The Organizer appends to `decisions.md` after each gate, but no later step reads it. It ends up archival rather than informing later synthesis.

**Fix.** Add a single line at the top of `gates/plan.md` and `gates/close.md` procedures: `Read the most recent decisions.md entry for <Gn>; carry forward its synthesis into your prompt to subagents.` No new infrastructure — just discipline.

**Files.** `gates/plan.md`, `gates/close.md`.
**Effort.** S
**Risks.** None.

---

## P2 — Worth doing, more involved

### P2.1 Standardize iteration limits across gates

**Status:** shipped.

**Problem.** Plan gate allows 1 revision; Review gate allows 3 cycles; Close gate allows 1 re-engage. The variation reads like drift, not design.

**Fix.** Standardize to: **"1 re-dispatch attempt allowed; if not resolved, ship + file follow-up"**, with one exception at the Review gate: trivial in-place fixups (typo-class, single-line changes the Organizer can make directly) are unlimited; *re-dispatching the implementer* is capped at 1 attempt. Document the standard at the top of each gate.

**Files.** `gates/plan.md`, `gates/review.md`, `gates/close.md`.
**Effort.** S
**Risks.** Review's existing 3-cycle rule is intentional for tight loops on small fixes — preserve that with the trivial-fixup carve-out.
**Open question.** Get user buy-in on the standard before changing anything. The "1 + trivial-unlimited" rule is one proposal; "2 cycles everywhere" is another; status quo is fine if there's a reason.

### P2.2 MIXED-mode reconciliation step

**Status:** shipped.

**Problem.** Research and code can run in parallel under MIXED mode and produce conflicting findings (e.g., research says use lib A; code already used lib B). Currently Beautiful Person closes both, but BP isn't qualified to resolve substantive conflicts.

**Fix.** After both tracks complete (parallel branch only — dependent branch already serializes), insert a reconciliation step in `modes/mixed.md`:
1. Organizer reads both outputs.
2. If conflicts detected (Organizer's judgment), dispatch a Critic subagent specifically asking: `"Are these two outputs consistent? List specific conflicts and recommend a resolution."`
3. Apply the resolution by editing the affected output(s) before Close.

If no conflicts, skip the dispatch and proceed directly to Close. Cheap when not needed.

**Files.** `modes/mixed.md` (new "Reconciliation" step between Execute and Close, parallel branch only).
**Effort.** M
**Risks.** False-positive conflict detection burns a subagent dispatch. Mitigated: only dispatch if the Organizer's gut says there's tension.

### P2.3 Beautiful Person at Plan stage for RESEARCH and MIXED

**Status:** shipped.

**Problem.** A research outline that's tonally off from the start produces sections that all need rewriting at Close — expensive.

**Fix.** Add a 30-second BP pass on the *plan* in RESEARCH and MIXED modes. Single subagent, single response: `"Does this outline produce something a person would want to read? Smallest revision that would fix the framing if not."` CODE-mode plans are exempt — BP isn't a code reviewer, and `superpowers:writing-plans` already constrains the format.

**Files.** `modes/research.md` (Plan step), `modes/mixed.md` (Plan step).
**Effort.** S
**Risks.** Adds a dispatch per non-CODE goal. Worth verifying empirically after one or two runs that the catches justify the cost.

---

## P3 — Nice to have

### P3.1 Degrade gracefully when no dispatch tool is available

**Status:** shipped.

**Problem.** Frame and Plan gates fall back to "voice both Starter and Critic in-session" if there's no `Agent` tool. This collapses to "Organizer thinks both ways" — exactly the averaging the synthesis discipline forbids.

**Fix.** In the no-dispatch fallback, voice ONLY the Critic (adversarial-from-cold-context is hardest to fake when the same actor plays both sides). Skip Starter; the Organizer is already biased toward action by virtue of running the show, so its native voice covers the generative role adequately.

**Files.** `gates/frame.md`, `gates/plan.md` (fallback paragraph in each).
**Effort.** S
**Risks.** None — the fallback is rarely-traveled.

### P3.2 Document the per-task Review duplication

**Status:** shipped.

**Problem.** At the Review gate, both `superpowers:requesting-code-review` and a Critic subagent run. Looks redundant; future readers may strip one.

**Fix.** Add a one-paragraph note at the top of `gates/review.md` distinguishing the two:
- `superpowers:requesting-code-review` — structured *technical* review: correctness, conventions, test coverage.
- Critic subagent — *assumption* review: are the premises behind this approach right?

Keep both; make the rationale explicit.

**Files.** `gates/review.md`.
**Effort.** S
**Risks.** None.

---

---

## P4 — Long-running session hardening (2026-05-25)

Identified during a session about making `/council` survive much longer runs (toward "effectively indefinite"). The Organizer's context budget is the bottleneck: the model can't trigger `/compact` on itself, so the only lever inside the skill is reducing what lands in parent context per goal.

### P4.1 Disk-first subagent return shape

**Status:** shipped.

**Problem.** Across five sites, the Organizer was the writer-of-record for prose produced by subagents — Frame artifacts pasted three role responses "verbatim", per-task Review pulled two full reviews in-band, Research Execute returned N full sections and then assembled them in-context, Plan critiques returned full critique bodies, Close pulled BP's rewritten commit message and (for RESEARCH/MIXED) wiki entry through the parent. Per-goal context cost compounded fast; CODE-mode Review compounded *per task*.

**Fix.** One central rule (new section in `SKILL.md`): subagents own their files; the Organizer owns the index and the decisions. Each gate restates this concretely:
- Frame: Librarian/Starter/Critic write to `<Gn>-<role>.md`; frame artifact is an index + synthesis.
- Review: tech + Critic reviews to `reviews/task-<N>-{tech,critic}.md`; diff staged to disk so even the Critic reads from disk.
- Plan: critics write to `<Gn>-{starter,critic}.md`; plan body referenced by path through Execute; small-fixes-needed becomes an in-place `Edit` (no re-dispatch).
- Close: commit message staged at `close/<Gn>-commit-msg.txt`; BP rewrites in place; `git commit -F` keeps the message out of context.
- Research: section subagents write their own sections; a dedicated Assembler subagent reads sections from disk and writes `draft.md`; Critic-on-draft reads from disk.
- Mixed: reconciliation Critic reads draft + diff from disk.

**Files.** `SKILL.md`, `gates/{frame,plan,review,close}.md`, `modes/{research,mixed}.md`. README.md updated to document the design principle.
**Effort.** M
**Risks.** Subagents may revert to wall-of-prose returns if prompt discipline is loose. Mitigated: each dispatch prompt carries an explicit "OUTPUT DISCIPLINE" block listing exactly what to return and what NOT to echo.
**Followup signal to watch.** First multi-goal real run after this change — count how often the Organizer ends up reading per-role files on-demand vs. relying on the structured returns. If on-demand reads are frequent, the structured-return shapes are too lean.

---

## P5 — Opus 4.8 + new Claude Code capabilities (2026-05-30)

**Status:** shipped. Design adversarially pressure-tested by a 3-lens review swarm (workflow-semantics, council-invariants, skill-authoring) plus a cold-read consistency pass before shipping; every blocker/major finding folded in.

**Problem.** The skill predated the `Workflow` tool, schema-validated structured returns, `SendMessage` agent continuation, per-agent model override / `agentType`, worktree isolation, `ToolSearch` deferred tools, turn budgets, and the explicit plan-mode tools. The disk-first convention was hand-rolling, in prose, the exact context isolation the `Workflow` tool now provides natively.

**Fix.** Hybrid, not rewrite — the Organizer-as-spine architecture and the transcript + run-dir + INTERRUPT interface are unchanged.
- `SKILL.md` — folded a `### Fan-out execution: the Workflow tool` subsection *into* the existing disk-first section (one home for the "heavy output never transits the Organizer" principle, so the two don't drift). It's a conditional, not a "MAY": ≥3 independent heavy-output units in an Execute phase → use a Workflow; it *replaces* `dispatching-parallel-agents` for that role, which survives only as the named exception when mid-run interruptibility matters. Five safety rules, two load-bearing: **return a thin manifest only** (a Workflow's return value enters Organizer context), and **final artifacts still go to disk** (post-Workflow synthesis reads disk, not vanished script vars). Plus: schema over prose inside Workflows; re-dispatch inside a Workflow is a cold `agent()` (no `SendMessage`); `log()` for transcript visibility + the INTERRUPT blind-window tradeoff; resume scoped to a single in-flight phase, not full-session durability.
- `SKILL.md` — new compact "Model, tools & plan mode" section: model guidance by *capability tier* with aliases (no pinned ids that rot) and a dated one-liner of current tiers; `ToolSearch select:` for deferred/MCP tools; a strengthened never-enter-plan-mode rule (it halts the run, not just prompts).
- `SKILL.md` — budget-aware iteration limits: reserve headroom when `budget.total` is set, fixed limits when null.
- `gates/{review,plan,close}.md` — `SendMessage`-to-continue for the main-loop re-dispatch, each with the main-loop-only caveat (gate files are read independently).
- `modes/research.md` — Workflow fan-out as the path for ≥3 sections; disk-first dispatch shapes kept verbatim as the interruptible main-loop fallback.
- `modes/mixed.md` — worktree isolation correctly scoped: repo working tree only; run dir (absolute path) shared and safe; don't commit inside the worktree.

**Deferred (intentionally NOT in the always-loaded skill body).** Recurring/scheduled councils via `CronCreate`, and `ScheduleWakeup` to wait on external state, are out of scope for a single run — recorded here rather than bloating `SKILL.md`. If pursued: a cron agent that invokes `/council` with a standing goal set, writing to the same `~/council/runs/` tree.

## P6 — Corrections & metabolism (2026-06-10)

**Status:** shipped. Identified by the council's own self-review run (`~/council/runs/2026-06-10-0621-review-council-skill/`) — the first audit of documentation against actual run-directory evidence.

### P6.1 Fix the P4 stragglers
`personalities/organizer.md` still mandated reading full responses and pasting them "verbatim" into gate artifacts — the exact pattern P4 eliminated everywhere else; the primer the main session loads at Intake was never updated. Also: `gates/frame.md` dangled a "see spec" reference and an incoherent rerun count; `modes/code.md` told the Organizer to copy full plan bodies into the run dir against `gates/plan.md`'s stub rule. All corrected.

### P6.2 Review gate per-task → per-phase
The per-task dual review never executed: both 2026-05-27 CODE runs have empty `work/` dirs, while `superpowers:subagent-driven-development`'s internal spec+quality reviews (per task) and final whole-implementation review covered the technical ground, and the plan-gate Critic caught the HIGH bugs. The gate is now ONE Critic assumption review per goal on the cumulative diff, after Execute. Lesson recorded: protocol denser than what gets executed is not safety, it is noise.

### P6.3 Parking lot + fast path + skill refresh
`<run-dir>/parking-lot.md` — append-only one-liner channel for out-of-scope findings, harvested at Report. Small-goal Frame fast path (skip Starter when Librarian is empty + goal is S-sized). Skill table gained `systematic-debugging` (CODE blockers) and `deep-research` (web-heavy RESEARCH delegate).

### Considered and declined
- **Ad-hoc Specialist slot** (Frame-nominated, skill-backed domain reviewer): no run failed for lack of one, and the Organizer can already embed any skill in any dispatch when a plan calls for it. Codifying a slot adds protocol density for a hypothetical.
- **New persistent personalities** (Historian, Verifier, ...): the five roles cover generative / adversarial / retrieval / synthesis / polish; verification is already a skill invocation at Close.
- **`verify` skill at Close**: redundant with `superpowers:verification-before-completion`.
- **Measurement debts** (P2.3 BP-pass value, P4.1 on-demand read frequency): deferred to the G2 meta-learning database, which is the mechanism that should pay them.

## P7 — Long-run / sparse-goal fit (2026-07-21)

**Status:** shipped. Motivated by a full skill review (Fable 5) against the run evidence: the disk-first work (P4/P5) solved *executing* at length, but the skill's actual niche — long unattended runs on large, sparsely defined goals — still lacked (a) an early dense moment for the human to correct a wrong interpretation, (b) incremental structure so scale doesn't become one monolithic gate cycle, (c) durability across session death, (d) visibility proportional to run length. Five mechanisms, each replacing a failure mode rather than adding a checkpoint (P6.2's lesson observed):

- **P7.1 Charter** — Frame sizes every goal S/M/L; L-sized goals get `frame/<Gn>-charter.md` (reading, scope in/out, top-3 risky assumptions, ambition tier), printed to stdout as the one sanctioned banner exception. Attacks "confidently wrong for two hours" by giving `INTERRUPT.md` a target while redirection is cheap.
- **P7.2 Milestone decomposition** — L-sized goals split risk-first into 2–5 milestones in `register.md`; M1 is the walking skeleton; each milestone runs its own Plan→Execute→Review→Close and *ships* at Close. More gate boundaries = more interrupt reads; wrong assumptions surface as a small shipped M1.
- **P7.3 Deterministic resume** — `/council resume <run-dir>`: rebuild from `register.md` + `STATUS.md` + last Decision Log entry; re-enter at the first missing index artifact (gates are re-entrant by construction — completion IS the artifact). Half-done executes reconcile against git ground truth, never redo shipped work.
- **P7.4 Status heartbeat** — `STATUS.md` overwritten at every gate boundary and Workflow launch/digest (`templates/status.md`); optional single sleeper-tasks mirror for >1 h runs, commented only at milestone Closes. No chat fanout.
- **P7.5 Drift checks** — during long CODE executes, a one-beat plan-decay check after each Workflow stage (~5 tasks); in-place plan amendments are uncapped and logged as `amendment`, distinct from the capped revision loops.

Not done (deliberately): new personalities, more review passes, structured INTERRUPT formats, a supervisor process — all ceremony without an observed failure mode. The `remind-commit-push` Stop-hook friction is mostly dissolved by per-milestone commits (P7.2); a run-dir-aware hook exemption remains open if it still stings.

## Sequencing

- **Batch A (one session, ~1 h):** P1.1, P1.2, P1.3 — all small, all high-leverage. Land together.
- **Batch B (one session, ~2 h):** P2.1, P2.2, P2.3 — medium-scope process changes. Validate Batch A in a real run before tackling these.
- **Batch C (defer):** P3.1, P3.2 — clarity-only changes, ship when convenient.
- **Batch D (2026-05-25):** P4.1 — long-running session hardening via disk-first subagent returns.
- **Batch E (2026-05-30):** P5 — Opus 4.8 + new Claude Code capabilities (Workflow fan-out, schema returns, SendMessage re-dispatch, model tiers, worktree isolation, ToolSearch, budget, plan-mode prohibition).
- **Batch F (2026-06-10):** P6 — corrections & metabolism (organizer.md/frame.md/code.md fixes, per-phase Review gate, parking lot, fast path, skill-table refresh).
- **Batch G (2026-07-21):** P7 — long-run/sparse-goal fit (charter, milestones, resume, status heartbeat, drift checks).

(Historical note: the original "validate Batch A in a real run before Batch B" advice was followed — see `~/council/runs/`. Iteration-limit revisits now route through the learning db, `learning.md`.)

## Open decisions — resolved

1. **`INTERRUPT.md` format** — freeform; the Organizer parses intent.
2. **Iteration-limit standard** — "1 re-dispatch + trivial-unlimited at Review" adopted as proposed.
3. **Where does this live?** — this file stays at the repo root as the record of the work.
