# Evidence Handoff Format

Use this structure for middle-flow investigation handoffs and Human Review
summaries. Keep it factual and scoped to the confirmed behavior.

For runtime-gated claims, also follow
[runtime-proof-package.md](runtime-proof-package.md). For any stage that routes
to `Human Review`, make the control-plane text follow
[human-review-brief.md](human-review-brief.md).

```markdown
## Status

- State: Middle-flow / Human Review / Blocked
- Task: <tracker id or issue title>
- Workspace: <worktree path and branch>
- Plane dossier: <work item / Project Page URL / none>

## Scope

- Classification: confirmed bug / possible bug / feature request / docs / cluster
- In scope:
- Out of scope:

## Evidence

- Issue claim:
- Static evidence:
- Runtime evidence:
- Runtime proof package:
- Commands run:
- Files inspected:

## Root Cause

- Owner layer:
- Exact files/functions/selectors:
- Why this explains the evidence:
- Cluster split, if any:

## Fix Plan

- Proposed change:
- Files expected to change:
- Why this is the smallest correct fix:
- Risks:

## Validation Plan

- Targeted tests:
- Full tests/build:
- CDP/runtime checks:
- Manual checks:

## Open Questions / Risks

- <items needing human decision or runtime confirmation>

## Publication Targets

- Work item comment:
- Work item links:
- Project Page dossier:
- Wiki/doc collection:
- Repo artifact:
- Publish Plan JSON:
```

Rules:

- Separate observed facts from hypotheses.
- For runtime-gated tasks, keep static orientation separate from confirmed
  evidence. If the CDP runtime check fails, use State: Runtime Blocked and
  leave Root Cause / Fix Plan as not established.
- Include exact commands and summarize important output.
- Cite file paths and line numbers when available.
- Do not claim a fix is validated unless the validation command or CDP check ran.
- If no code was changed, say so.
- Keep tracker comments concise. Publish the full handoff as a repo artifact
  and Project Page dossier, then link or index it from Plane.
- For runner-managed stages, write
  `docs/harness/runs/<key>/publish/<stage>.json` following
  `docs/harness/guides/publishing.md`.
