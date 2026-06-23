# HITL Plane Publishing

Interactive design work happens in CLI, not in the background runner.

## Boundary

- BLP repo is the durable source of truth for PRDs, issue breakdowns, run
  artifacts, domain language, and validation evidence.
- Plane is the control panel for state, comments, links, and AFK child tasks.
- Plane updates are explicit foreground operations through the global
  `plane-ops` skill.
- The BLP repo never stores Plane API credentials or runner-local paths.
- Repo-local unattended stage workers must not embed Plane API calls in repo
  scripts or artifacts.

## Feature / Refactor Flow

```text
Plane parent item
-> CLI grill-with-docs discussion
-> repo-local PRD artifact
-> global plane-ops skill publishes PRD summary to Plane
-> CLI to-issues vertical-slice breakdown
-> global plane-ops skill creates/updates Plane child items
-> runner executes only AFK + agent-ready child items
```

`grill-with-docs`, `to-prd`, and `to-issues` are foreground tools. They may ask
for human confirmation and must not be treated as unattended runner stages.

## Artifact Locations

Use `docs/harness/runs/<key>/prd.md` for accepted PRDs and
`docs/harness/runs/<key>/issue-breakdown.md` for approved vertical slices. Keep
Plane comments concise: summary, artifact path, artifact SHA-256, and child item
status are enough.

## Publishing

Use the global Codex skill `plane-ops` for Plane comments, links, state changes,
and child item creation. Keep long-form content in repo artifacts and publish a
concise Plane projection: summary, artifact path, artifact SHA-256 when useful,
and the next human or AFK action.

Do not reintroduce harness-local tracker adapters or control-plane dependencies
for these HITL publishing steps.
