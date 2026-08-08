# Implementation Routing Stage

## Purpose

Use this stage after a human approves a non-bug `design-intake` result by moving
the Plane item to `Review Approved`.

This stage does not implement code. It converts the approved design and any
human feedback into a machine-readable implementation route:

- implement on the same Plane item, or
- create AFK child items with enough scope for unattended implementation.

## Stage Context

Use the approved design-intake artifact and its source issue as the accepted
contract. Read tracker feedback only when it contains the human decision or
scope changes relevant to this route. Use `docs/harness/guides/tdd.md` to turn
the accepted behavior into executable vertical slices.

## Rules

- Do not edit product code, tests, package metadata, or generated files.
- Do not reopen product scope unless human feedback explicitly rejects or
  changes the design. If that happens, route back to `human-review-required`.
- Use the approved design-intake artifact as the source of truth.
- Treat `tracker-feedback.md` as human feedback, not as a stage artifact.
- Create child tasks only when the accepted design is too large or naturally
  split into independently verifiable vertical slices.
- Child tasks intended for unattended agents must be AFK and `agent-ready`.
- Each child task body must include the accepted implementation contract, test
  expectations, TDD slice plan, and non-goals needed without chat context.
- Child tasks are created by this BLP stage through its authorized Plane
  operation. The Runner's publication projection never creates child work
  items.
- Same-task implementation contracts must include the TDD slice plan the
  implementation stage will execute.
- If routing returns to `Human Review`, the Plane brief must follow
  `docs/harness/guides/human-review-brief.md`.

## Output

Write the artifact to:

```text
docs/harness/runs/<key>/implementation-routing.md
```

Use this structure:

```markdown
## Status

- State: Implementation Routing
- Verdict: same-task-ready|split-children|human-review-required

## Plane Reply

## Accepted Design

## Human Feedback Considered

## Routing Decision

## Implementation Contract

## TDD Slice Plan

## Child Tasks

## Risks / Open Questions

## Decision
```

`## TDD Slice Plan` must follow `docs/harness/guides/tdd.md`. If the approved
design cannot be reduced to executable behavior slices, do not route to
implementation; use `human-review-required` and ask for the missing product or
scope decision.

## Gate Semantics

Use `same-task-ready` when the approved design is small enough to run the normal
`implementation -> code-review` loop on this Plane item.

Use `split-children` when this stage creates child work items. Each child must
use explicit `afk` and `agent-ready` labels, and the artifact must list the
created Plane child keys. The parent returns to `Human Review` after Runner
publication.

Use `human-review-required` when the approved design and human feedback conflict,
or when the next routing choice requires human judgment.
