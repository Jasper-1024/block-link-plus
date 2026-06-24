# Agent Map

Start with `WORKFLOW.md`. It is the repo-owned contract for Plane-backed BLP
agent runs. Runner-readable workflow metadata lives in
`docs/harness/workflow.json`.

## Issue tracker

BLP work is coordinated in Plane; repo-local agents write artifacts and Plane
updates happen through either runner-owned Publish Plans or explicit foreground
`plane-ops` operations. See
`docs/agents/issue-tracker.md`.

## Triage labels

Plane states and labels are mapped to runner-readable task roles. See
`docs/agents/triage-labels.md`.

## Domain docs

BLP uses a single-context `CONTEXT.md` plus lightweight ADRs in `docs/adr/`.
See `docs/agents/domain.md`.

## Harness Boundary

Workers do not call Plane APIs and do not run interactive CLI discussion
workflows. They write the stage artifact and matching Publish Plan JSON. The
runner validates those files and projects accepted facts to Plane+.
