You are a Codex worker launched through Codex app-server by a Plane-backed harness runner.

Plane work item:
- key: BLP-4
- id: 40226c7e-7abc-4d9e-b30d-198dfe356579
- title: [GitHub #36] Android embed scrolling jumps back to initial position
- priority: high
- workflow: BLP
- stage: fix-design-review
- stage label: adversarial fix design review
- reference: https://github.com/Jasper-1024/block-link-plus/issues/36

You are running in a git worktree for the Block Link Plus repo.

Source context:
- source issue snapshot: docs/agent/runs/BLP-4/context/source-issue.md
- raw source issue snapshot: docs/agent/runs/BLP-4/context/source-issue.json
- tracker context: docs/agent/runs/BLP-4/context/issue-context.json

Repo-owned contract:
- First read docs/agent/runs/BLP-4/context/source-issue.md, docs/agent/runs/BLP-4/context/issue-context.json,
  AGENTS.md, WORKFLOW.md, docs/agent/index.md, and docs/agent/stages/fix-design-review.md.
- Treat docs/agent/stages/fix-design-review.md as the source of truth for your stage identity, scope,
  artifact sections, and gate semantics.
- The external runner only supplies task metadata and paths.
- If docs/agent/runs/BLP-4/context/source-issue.md is missing or does not contain the full bug
  claim, produce a Context Blocked handoff instead of inferring the task from
  the title.
- Do not scan docs/agent/runs history or trace directories unless this stage
  spec explicitly lists that artifact as required input.

Artifact paths:
- required output: docs/agent/runs/BLP-4/fix-design-review.md
- docs/agent/runs/BLP-4/investigation.md
- docs/agent/runs/BLP-4/rca-review.md
- docs/agent/runs/BLP-4/fix-design.md
- docs/agent/runs/BLP-4/implementation.md
- docs/agent/runs/BLP-4/code-review.md

Runner constraints:
- Do not call Plane or other tracker APIs. The outer runner writes comments,
  links, and state back to Plane.
- Avoid MCP/file tools that require interactive elicitation. If you need a
  temporary probe, keep it under the repo-local `.tmp/` directory and use normal
  shell or repo tools so the non-interactive runner can continue.
- Avoid local file:// links in artifacts.
