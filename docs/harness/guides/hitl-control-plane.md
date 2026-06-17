# HITL Control Plane

Interactive design work happens in CLI, not in the background runner.

## Boundary

- BLP repo is the durable source of truth for PRDs, issue breakdowns, run
  artifacts, domain language, and validation evidence.
- Plane is the control panel for state, comments, links, and AFK child tasks.
- The persistent runner/control-plane is the only component that holds Plane
  API credentials.
- Repo-local skills and agents must not call Plane APIs directly.

## Feature / Refactor Flow

```text
Plane parent item
-> CLI grill-with-docs discussion
-> repo-local PRD artifact
-> global plane-control-plane skill publishes PRD summary to Plane
-> CLI to-issues vertical-slice breakdown
-> global plane-control-plane skill creates/updates Plane child items
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

Use the global Codex skill `plane-control-plane`. It calls the persistent
runner/control-plane HTTP tools:

- `publish_prd`
- `publish_issue_breakdown`
- `create_or_update_child_item`
- `resolve_human_gate`
- `get_work_item_context`
- `get_publish_status`

The BLP repo never stores the Plane token or runner path.
