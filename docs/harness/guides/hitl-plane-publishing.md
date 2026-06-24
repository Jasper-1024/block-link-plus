# HITL Plane Publishing

Interactive design work happens in CLI, not in the background runner.

## Boundary

- BLP repo is the durable source of truth for PRDs, issue breakdowns, run
  artifacts, domain language, and validation evidence.
- Plane is the control panel for state, comments, links, Project Page pointers,
  and AFK child tasks.
- Foreground Plane updates use the global `plane-ops` skill. Unattended runner
  stages publish through runner-owned Publish Plan JSON.
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

Use `docs/harness/runs/<archive-key>/prd.md` for accepted PRDs and
`docs/harness/runs/<archive-key>/issue-breakdown.md` for approved vertical
slices. When the runner should publish them, write a Publish Plan under
`docs/harness/runs/<archive-key>/publish/<stage>.json`. Keep Plane comments
concise: summary, artifact path, artifact SHA-256, and child item status are
enough.

`archive-key` is runner-owned storage identity. GitHub-backed Plane items use
`GH-<issue>-<plane-key>` such as `GH-34-BLP-2`; Plane-only items use
`PLANE-<plane-key>`. Publish Plan `scopeKey` stays as the Plane work item key.

## Information Layers

- Work item: active state, owner, short task contract, labels, and acceptance
  criteria.
- Work item comments: timeline updates and concise projections of repo
  artifacts. Do not paste full investigations here.
- Work item links: canonical repo artifacts, GitHub source reports, validation
  traces, and Project Page dossiers.
- Project Page dossier: runner-maintained long-form index for complex bug-fix
  work, especially when several comments, source reports, and validations need
  one stable index. The runner sends minimal HTML to Plane+ Pages because this
  self-hosted instance does not render API-written Markdown reliably.
- Repo artifact: canonical, reviewable evidence and accepted design text under
  `docs/harness/runs/<archive-key>/`.

## Project Pages

This workflow targets Plane+, where project Page content is API-key writable.
If the instance changes, verify capability with a read-only probe:

```bash
plane-ops --project-id <project-id> capability probe --json
```

If project pages are not API-key writable, stop the runner publishing path and
route to human review. Do not automate session-auth web-app APIs.

## Publishing

Use the global Codex skill `plane-ops` for foreground Plane comments, links,
state changes, and child item creation. For unattended stages, the runner calls
Plane+ directly from the validated Publish Plan. Keep long-form content in repo
artifacts and Project Page dossiers; comments stay as timeline notes.
