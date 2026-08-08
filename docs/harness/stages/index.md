# Agent Stage Specs

This directory defines repo-owned stage identities for external runners.

External trackers and runners may choose which stage to start, but the stage
contract itself lives here. A runner should pass task metadata and artifact
paths, then instruct the worker to read the matching stage spec.

These stage specs are the maintained BLP mainline contract. Do not treat them
as demo prompts or disposable runner-side scaffolding.

The machine-readable stage list and artifact paths are mirrored in
[../workflow.json](../workflow.json). Keep this index, each stage spec, and the
workflow manifest in sync.

Every worker returns two semantic outputs:

- canonical artifact: `docs/harness/runs/<key>/<stage>.md`
- structured Stage Result through the Runner protocol

The Runner validates those outputs and generates
`docs/harness/runs/<key>/publish/<stage>.json`. The Publish Plan schema and
Plane+ projection rules live in
[../guides/publishing.md](../guides/publishing.md).
Runtime-gated stages use
[../guides/runtime-proof-package.md](../guides/runtime-proof-package.md).
Stages that route to `Human Review` use
[../guides/human-review-brief.md](../guides/human-review-brief.md). Cross-task
quality rules live in [../guides/quality-gates.md](../guides/quality-gates.md).
Implementation design, execution, and review use the mode-aware slice rules in
[../guides/tdd.md](../guides/tdd.md).

Stages:

- [design-intake.md](design-intake.md): non-bug enhancement/maintenance parent
  intake that prepares a human approve/reject gate.
- [implementation-routing.md](implementation-routing.md): approved non-bug
  design to same-task implementation or AFK child-task creation with mode-aware slices.
- [investigation.md](investigation.md): runtime-first bug investigation and
  evidence completion, including proposed child scope when the parent is not a
  single fix unit.
- [rca-review.md](rca-review.md): adversarial RCA review, loop gate, and the
  only bug-lane stage that may materialize prior child-scope recommendations.
- [fix-design.md](fix-design.md): accepted-RCA to bounded implementation
  design and mode-aware slice plan.
- [fix-design-review.md](fix-design-review.md): adversarial review of the fix
  design and slice evidence plan before implementation.
- [implementation.md](implementation.md): execute an accepted design with
  TDD, characterization, runtime-fix, or refactor slices plus validation.
- [code-review.md](code-review.md): coordinates independent Contract/Spec and
  Correctness/Standards reviews of one pinned snapshot.
- [finalize.md](finalize.md): mechanical commit/merge finalization after a
  human moves the tracker item to `Ready to Merge`.
- [archive-cleanup.md](archive-cleanup.md): runner-owned local cleanup after a
  human moves a finalized tracker item to `Ready to Archive`.
