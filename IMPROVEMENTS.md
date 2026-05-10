# Council process improvements

**Status:** all items shipped (2026-05-10). Open decisions resolved: `INTERRUPT.md` is freeform; iteration-limit standard adopted as proposed (1 re-dispatch + trivial-unlimited at Review); this file kept at repo root as a record of the work.

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

## Sequencing

- **Batch A (one session, ~1 h):** P1.1, P1.2, P1.3 — all small, all high-leverage. Land together.
- **Batch B (one session, ~2 h):** P2.1, P2.2, P2.3 — medium-scope process changes. Validate Batch A in a real run before tackling these.
- **Batch C (defer):** P3.1, P3.2 — clarity-only changes, ship when convenient.

Run `/council` against this repo with one or two real goals once Batch A lands — empirical signal beats speculation. After 2–3 real runs, revisit P2.1 (iteration-limit standard); the data may suggest a different default than the one proposed here.

## Open decisions (please weigh in)

1. **`INTERRUPT.md` format** — freeform text vs. structured (priority/scope fields)?
2. **Iteration-limit standard** — the proposed "1 re-dispatch + trivial-unlimited" — agree, alternative, or keep status quo?
3. **Where does this live?** — keep this file in repo root, move to `docs/`, or convert each P-item to an `sfl meta` entry under the `council` project?
