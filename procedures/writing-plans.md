# Council procedure: writing implementation plans (CODE)

Council-owned since 2026-07-27. Distilled from `superpowers:writing-plans` (v6.2.0) — the
plan *format* is theirs and proven; the dispatch shape is the council's. The superpowers
plugin is retired on this host; this file is canonical.

## Dispatch

ONE planner agent at the strongest available tier writes the plan to
`<repo>/docs/plans/YYYY-MM-DD-<slug>.md` and returns only the path + the acceptance
criterion (disk-first rule as always). The planner's prompt carries: the goal, the Frame
synthesis path, the acceptance criterion, and this procedure's format rules below —
pasted or referenced by path.

## Format rules (give these to the planner)

**Audience assumption:** write for a skilled engineer with ZERO context for this codebase
and questionable taste. Document which files to touch, the exact code, how to test it.
DRY. YAGNI. TDD. Frequent commits.

**Header:** goal (one sentence), architecture (2-3 sentences), tech stack, and a
**Global Constraints** section — project-wide requirements copied verbatim (version
floors, naming rules, exact values). Every task implicitly includes this section.

**Per task:**

- **Files:** exact paths — Create / Modify (with line ranges when known) / Test.
- **Interfaces:** Consumes (exact signatures from earlier tasks) / Produces (exact names
  and types later tasks rely on). A task's implementer sees only their own task; this
  block is how they learn what neighbors expect.
- **Steps, bite-sized (2-5 min each), checkbox syntax:** write the failing test (real
  code in the plan) → run it, verify it fails for the right reason → minimal
  implementation (real code) → run it, verify pass → commit.

**Task right-sizing:** a task is the smallest unit that carries its own test cycle and is
worth a fresh reviewer's gate. Fold setup/scaffolding into the task whose deliverable
needs it; split only where a reviewer could reject one task while approving its neighbor.

**No placeholders — these are plan failures:** "TBD", "add appropriate error handling",
"write tests for the above" (without the actual test code), "similar to Task N" (repeat
the code — tasks are read out of order), steps that describe without showing, references
to types or functions no task defines.

## Planner self-review (before returning)

1. **Coverage:** every Frame-synthesis requirement maps to a task. List gaps.
2. **Placeholder scan:** search for the failure patterns above; fix inline.
3. **Type consistency:** names and signatures used in later tasks match what earlier
   tasks defined. `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

## After the plan exists

The stub rule is unchanged (`gates/plan.md`): record `<run-dir>/plan/<Gn>.md` as
`Plan: <canonical-path>` + acceptance criterion. The Organizer never holds the plan body
in working memory — the path is the reference. Plan critique (Starter + Critic) follows
per the Plan gate.

Historical note: plans from pre-2026-07-27 runs live at `docs/superpowers/plans/…` —
resume reads the path from the stub either way.
