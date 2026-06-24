# Design Intake Stage

## Purpose

Use this stage for `enhancement` and `maintenance` Plane tasks before any
implementation routing. It prepares a high-signal brief for a human
approve/reject gate. The runner must not infer approval from natural-language
comments; the human gate is expressed with the `Review Approved` or
`Review Rejected` Plane state.

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
- `docs/harness/runs/<key>/context/source-issue.md`
- `docs/harness/runs/<key>/context/tracker-feedback.md`, if present
- `docs/harness/runs/<key>/context/issue-context.json`

## Rules

- Do not edit product code, tests, package metadata, generated files, or
  formal spec/history files.
- Do not invent product decisions. If a question needs human judgment, record it
  as a question with a recommended default.
- Inspect existing code and docs when they can answer a question directly.
- Use `CONTEXT.md` only as domain language. Do not turn it into an implementation
  plan.
- Recommend an ADR only when the choice is hard to reverse, surprising without
  context, and based on a real trade-off.

## Output

Write the artifact to:

```text
docs/harness/runs/<key>/design-intake.md
```

Use this structure:

```markdown
# Design Intake: <key>

## Status

- State: Design Intake
- Verdict: human-review-required

## Plane Reply

<Concise note for the control plane. State what needs human discussion next.>

## Current Understanding

<What the task asks for, grounded in Plane/GitHub text and repo evidence.>

## Repo Findings

<Existing docs, code paths, constraints, or terminology that matter.>

## Discussion Questions

1. <Question>
   Recommended answer: <default, if one is defensible>
   Why it matters: <implementation or product consequence>

## Candidate Scope

<Smallest coherent scope that could move forward after human approval.>

## ADR Candidates

<None, or specific candidate ADRs with the reason they meet the ADR bar.>

## Non-Goals

<Boundaries that should stay out of the first implementation slice.>
```

`## Plane Reply` should be short enough to read in Plane and should not contain
raw trace logs. Tell the human to move the item to `Review Approved` or
`Review Rejected` plus feedback. Link-worthy detail belongs in the artifact
body. Follow `docs/harness/guides/human-review-brief.md`; the first screen must
say what the human is deciding and what the agent recommends.

Also write the matching Publish Plan JSON:

```text
docs/harness/runs/<key>/publish/design-intake.json
```

Use `docs/harness/guides/publishing.md` for the schema. The `artifact.path`
must point to the design intake Markdown artifact and the `artifact.sha256`
must match its current contents.
