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
- `docs/harness/guides/publishing.md`
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
  expectations, and non-goals needed without chat context.

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

## Gate Semantics

Use `same-task-ready` when the approved design is small enough to run the normal
`implementation -> code-review` loop on this Plane item.

Use `split-children` when the Publish Plan creates child work items. Each child
must use `mode: "AFK"` or explicit `afk` and `agent-ready` labels. The parent
returns to `Human Review` after publication.

Use `human-review-required` when the approved design and human feedback conflict,
or when the next routing choice requires human judgment.
