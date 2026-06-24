# Harness Publishing

This is the v1 contract between BLP stage workers, the external runner, and
Plane+.

The repo artifact is the source of truth. Plane+ is the control panel projection
of accepted repo facts: state, concise comments, stable links, child tasks, and
one Project Page dossier per parent work item.

## Roles

- Stage agent: writes the stage artifact and a machine-readable Publish Plan.
  It does not call Plane.
- Reviewer agent: accepts, rejects, or routes the stage through the documented
  loop. It also writes a Publish Plan for its verdict.
- Runner: chooses the stage, runs the worker, validates the artifact and Publish
  Plan, routes the verdict, and calls the Plane+ API directly.
- Publisher: runner-owned code that applies the accepted Publish Plan to
  Plane+. It does not make new judgments.
- `plane-ops`: foreground skill for humans and agents doing explicit tracker
  operations outside an unattended stage run.

No persistent Plane+ fact write is allowed unless it is traceable to a checked
repo artifact hash. The exceptions are pure status transitions and mechanical
links such as a GitHub source report.

## Publish Plan Path

Every stage run must write exactly one JSON Publish Plan:

```text
docs/harness/runs/<archive-key>/publish/<stage>.json
```

The plan points at the canonical stage artifact:

```text
docs/harness/runs/<archive-key>/<stage>.md
```

Do not maintain a second Markdown copy of the publication data. The runner
publishes only the JSON plan.

`archive-key` is not the Plane key. GitHub-backed work uses
`GH-<issue>-<plane-key>` such as `GH-34-BLP-2`; Plane-only work uses
`PLANE-<plane-key>`. The Publish Plan `scopeKey` remains the Plane key because
Plane comments, child items, and state transitions still target that work item.

## Schema

```json
{
  "schemaVersion": 1,
  "scopeKey": "BLP-2",
  "stage": "rca-review",
  "verdict": "accepted",
  "artifact": {
    "path": "docs/harness/runs/GH-34-BLP-2/rca-review.md",
    "sha256": "<lowercase sha256>"
  },
  "comment": "RCA review accepted owner layer; split approved.",
  "links": [
    {
      "title": "RCA review",
      "url": "repo:docs/harness/runs/GH-34-BLP-2/rca-review.md"
    }
  ],
  "children": [
    {
      "stableId": "inline-passive-scroll",
      "title": "Fix passive inline embed mount scroll relocation",
      "body": "Scope and acceptance criteria.",
      "labels": ["bug", "agent-ready", "cdp-required"]
    }
  ],
  "page": {
    "summary": "Accepted RCA and split into two bounded child tasks."
  },
  "outOfScope": []
}
```

Required fields:

- `schemaVersion`: must be `1`.
- `scopeKey`: Plane key for the parent or child being handled.
- `stage`: one stage from `docs/harness/workflow.json`.
- `verdict`: one verdict supported by that stage.
- `artifact.path`: repo-relative path under `docs/harness/runs/<archive-key>/`.
- `artifact.sha256`: SHA-256 of `artifact.path`.

Optional fields may be empty but must keep their type:

- `comment`: short Plane timeline note.
- `links`: stable references. `https://` and `http://` links become Plane work
  item links. `repo:` links stay in the dossier when no web repo base is
  configured.
- `children`: child work items to create or update under the scope item.
- `page.summary`: the current dossier summary.
- `outOfScope`: candidate findings that must not create a new parent item.

Unknown stage/verdict combinations are invalid. `runtime-blocked` is accepted
for any stage because the runner can generate that verdict when a CDP command
times out before the worker can complete normal stage output. A SHA mismatch is
invalid. A child without `stableId` and `title` is invalid.

## Idempotency

The publisher keys each action with:

```text
scopeKey + stage + artifact.sha256 + action + stableId
```

Same artifact hash means no duplicate comment or link. A new artifact hash may
add one new concise timeline comment. Child items are upserted with:

```text
external_source = "blp-harness"
external_id = "<scopeKey>:<stableId>"
```

Partial publish failures are rerunnable. Already-applied actions skip or upsert;
failed actions retry once.

## Project Page Dossier

The publisher maintains one Project Page per parent work item. It rebuilds the
whole Page body from the accepted publish log and current child items; it does
not patch paragraphs in place.

The dossier is a human review brief backed by the canonical artifact. The
runner extracts the stage-specific review sections from `artifact.path`; the
Publish Plan keeps only `page.summary` so workers do not maintain a second copy
of the design or implementation text.

The dossier contains:

- Review Brief
- Snapshot
- Scope
- Timeline
- Child Tasks
- Evidence Index
- Current Summary
- Out-of-Scope Candidates

Do not promote single-task findings into Workspace Wiki in v1. Reusable
cross-task rules can be promoted later by a human.

## Failure Policy

Plane+ is an intranet control plane in this workflow. Treat write failures as
exceptional:

- retry each API operation once
- if it still fails, stop the current publish/run path
- do not fall back to session-auth web APIs
- route by Plane state or a short failure comment only when the API is usable

## Release Policy

Release automation is out of scope for v1. Bug and feature work can merge to
the maintained branch after human approval, but version bumps, changelog edits,
tags, and publishing require a manually created release parent or explicit
human instruction.
