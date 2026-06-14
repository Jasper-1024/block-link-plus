# Evidence Handoff Format

Use this structure for middle-flow investigation handoffs and Human Review
summaries. Keep it factual and scoped to the confirmed behavior.

```markdown
## Status

- State: Middle-flow / Human Review / Blocked
- Task: <tracker id or issue title>
- Workspace: <worktree path and branch>

## Scope

- Classification: confirmed bug / possible bug / feature request / docs / cluster
- In scope:
- Out of scope:

## Evidence

- Issue claim:
- Static evidence:
- Runtime evidence:
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
```

Rules:

- Separate observed facts from hypotheses.
- For runtime-gated tasks, keep static orientation separate from confirmed
  evidence. If CDP preflight fails, use State: Runtime Blocked and leave Root
  Cause / Fix Plan as not established.
- Include exact commands and summarize important output.
- Cite file paths and line numbers when available.
- Do not claim a fix is validated unless the validation command or CDP check ran.
- If no code was changed, say so.
