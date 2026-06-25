# Implementation Routing Stage

## Purpose

Use this stage after a human approves a non-bug `design-intake` result by moving
the Plane item to `Review Approved`.

This stage does not implement code. It converts the approved design and any
human feedback into a machine-readable implementation route:

- implement on the same Plane item, or
- create AFK child items with enough scope for unattended implementation.

## Read First

Read these before writing the artifact:

- `AGENTS.md`
- `WORKFLOW.md`
- `CONTEXT.md`
- `docs/agents/domain.md`
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- `docs/harness/guides/human-review-brief.md`
- `docs/harness/guides/publishing.md`
- `docs/harness/guides/quality-gates.md`
- `docs/harness/guides/tdd.md`
- `docs/harness/runs/<key>/design-intake.md`
- `docs/harness/runs/<key>/context/tracker-feedback.md`
- `docs/harness/runs/<key>/context/issue-context.json`

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
- Child tasks are created by this BLP stage through the authorized Plane
  operation, not by non-empty Publish Plan `children`.
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

Also write the matching Publish Plan JSON:

```text
docs/harness/runs/<key>/publish/implementation-routing.json
```

Use `docs/harness/guides/publishing.md` for the schema. The `artifact.path`
must point to the implementation-routing Markdown artifact and the
`artifact.sha256` must match its current contents.

`## TDD Slice Plan` must follow `docs/harness/guides/tdd.md`. If the approved
design cannot be reduced to executable behavior slices, do not route to
implementation; use `human-review-required` and ask for the missing product or
scope decision.

## Gate Semantics

Use `same-task-ready` when the approved design is small enough to run the normal
`implementation -> code-review` loop on this Plane item.

Use `split-children` when this stage creates child work items. Each child must
use explicit `afk` and `agent-ready` labels, and the artifact must list the
created Plane child keys. The Publish Plan `children` array must remain empty.
The parent returns to `Human Review` after publication.

Use `human-review-required` when the approved design and human feedback conflict,
or when the next routing choice requires human judgment.
