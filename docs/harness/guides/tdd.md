# TDD Slice Evidence

BLP uses TDD as an implementation discipline inside the existing harness
stages. It is not a runner stage, a Plane state, or a separate QA/developer
agent split.

## Principles

- Test public behavior through the highest stable seam available.
- Work in vertical slices: one behavior test, the smallest implementation that
  passes it, then the next behavior.
- Do not write every test first and then all implementation.
- Do not assert private implementation details when a behavior seam can prove
  the same claim.
- Refactor only after the current slice is green.
- Keep source and test changes inside the accepted design or routing boundary.

## Slice Plan

Fix design and implementation routing must define the slices that later
implementation can execute without chat context.

Use this shape:

```markdown
| Slice | Behavior | Public Seam | Expected RED Failure | Minimum GREEN Target | Refactor Allowance | Required Validation |
| --- | --- | --- | --- | --- | --- | --- |
| TDD-1 | <observable behavior> | <test/API/runtime seam> | <expected failing assertion or symptom> | <smallest passing change> | <allowed cleanup or N/A> | <commands/runtime proof> |
```

Rules:

- The behavior must be observable by a user, public API, stable helper, or
  runtime proof path.
- The expected RED failure must correspond to the accepted bug, design goal, or
  child-task contract.
- Runtime-gated work must name the runtime proof package that implementation
  repeats after rebuild or reload.
- A slice that cannot be tested before implementation must explain the blocker
  and name the alternative proof.

## Execution Evidence

Implementation must record what actually happened for every accepted slice:

```markdown
| Slice | Behavior | Public Seam | RED Command / Result | GREEN Change | GREEN Command / Result | REFACTOR Command / Result | Files Touched |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TDD-1 | <behavior> | <seam> | `<command>` -> failed for <expected reason> | <minimal patch> | `<command>` -> passed | `<command>` -> passed, or N/A | <files> |
```

Rules:

- RED must fail for the expected reason before the GREEN patch is claimed.
- GREEN must be the smallest change that satisfies the slice.
- REFACTOR is optional, but if used it must happen after GREEN and rerun the
  relevant validation.
- If the planned test is wrong, stop and record a design or test mismatch
  instead of silently broadening scope.
- If implementation evidence contradicts the accepted design, stop with the
  stage's mismatch verdict.

## Review Checklist

Code review accepts TDD evidence only when:

- every implemented behavior maps to an accepted slice or justified mismatch
- RED evidence is present and fails for the right reason
- GREEN evidence passes targeted validation
- REFACTOR evidence, when present, follows GREEN
- tests target public behavior rather than private structure
- runtime proof matches the accepted runtime package when runtime behavior is in
  scope
