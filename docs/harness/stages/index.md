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

Every stage writes two outputs:

- canonical artifact: `docs/harness/runs/<key>/<stage>.md`
- Publish Plan: `docs/harness/runs/<key>/publish/<stage>.json`

The Publish Plan schema and Plane+ projection rules live in
[../guides/publishing.md](../guides/publishing.md).
Runtime-gated stages use
[../guides/runtime-proof-package.md](../guides/runtime-proof-package.md).
Stages that route to `Human Review` use
[../guides/human-review-brief.md](../guides/human-review-brief.md). Cross-task
quality rules live in [../guides/quality-gates.md](../guides/quality-gates.md).
Implementation design, execution, and review use
[../guides/tdd.md](../guides/tdd.md).

Stages:

- [design-intake.md](design-intake.md): non-bug enhancement/maintenance parent
  intake that prepares a human approve/reject gate.
- [implementation-routing.md](implementation-routing.md): approved non-bug
  design to same-task implementation or AFK child-task creation with TDD slices.
- [investigation.md](investigation.md): runtime-first bug investigation and
  evidence completion.
- [rca-review.md](rca-review.md): adversarial RCA review and loop gate.
- [fix-design.md](fix-design.md): accepted-RCA to bounded implementation
  design and TDD slice plan.
- [fix-design-review.md](fix-design-review.md): adversarial review of the fix
  design and TDD slice plan before implementation.
- [implementation.md](implementation.md): execute an accepted design with
  vertical-slice TDD, regression tests, and runtime validation.
- [code-review.md](code-review.md): adversarial review of the implementation
  patch before human merge/release review.
- [finalize.md](finalize.md): mechanical commit/merge finalization after a
  human moves the tracker item to `Ready to Merge`.
- [archive-cleanup.md](archive-cleanup.md): runner-owned local cleanup after a
  human moves a finalized tracker item to `Ready to Archive`.
