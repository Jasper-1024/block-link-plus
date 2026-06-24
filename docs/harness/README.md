# Agent Harness

This directory is the repo-owned knowledge base for Plane-backed BLP agent
runs. Keep this file short: it is a map, not the manual.

## Start Here

- [../../AGENTS.md](../../AGENTS.md): top-level agent map.
- [../../WORKFLOW.md](../../WORKFLOW.md): maintained workflow overview.
- [workflow.json](workflow.json): runner-readable workflow contract.
- [stages/index.md](stages/index.md): stage identities and artifact contracts.

## Guides

- [guides/cdp-runtime.md](guides/cdp-runtime.md): isolated Obsidian/CDP runtime.
- [guides/evidence-format.md](guides/evidence-format.md): investigation handoff shape.
- [guides/publishing.md](guides/publishing.md): Publish Plan JSON and Plane+ projection contract.
- [guides/hitl-plane-publishing.md](guides/hitl-plane-publishing.md): CLI/HITL Plane publishing boundary.
- [guides/bug-investigation.md](guides/bug-investigation.md): legacy bug lane checklist.

## Matt Skill Context

- [../../CONTEXT.md](../../CONTEXT.md): BLP domain language.
- [../agents/domain.md](../agents/domain.md): how skills consume domain docs.
- [../agents/issue-tracker.md](../agents/issue-tracker.md): Plane/GitHub boundary.
- [../agents/triage-labels.md](../agents/triage-labels.md): category and state labels.
- [../../.codex/skills/grill-with-docs/SKILL.md](../../.codex/skills/grill-with-docs/SKILL.md): feature/refactor clarification.
- [../../.codex/skills/diagnose/SKILL.md](../../.codex/skills/diagnose/SKILL.md): bug diagnosis loop.
- [../../.codex/skills/to-prd/SKILL.md](../../.codex/skills/to-prd/SKILL.md): accepted discussion to PRD.
- [../../.codex/skills/to-issues/SKILL.md](../../.codex/skills/to-issues/SKILL.md): PRD/plan to vertical-slice issues.
- [../../.codex/skills/tdd/SKILL.md](../../.codex/skills/tdd/SKILL.md): vertical-slice implementation.
- [../../.codex/skills/improve-codebase-architecture/SKILL.md](../../.codex/skills/improve-codebase-architecture/SKILL.md): technical-debt and testability review.

## Run Archives

`docs/harness/runs/<archive-key>/` is the durable archive for one tracked task.
The runner derives the archive key from the source task: GitHub-backed Plane
items use `GH-<issue>-<plane-key>` such as `GH-34-BLP-2`, while Plane-only
items use `PLANE-<plane-key>`. Stage artifacts at that level are canonical
inputs for later stages. `context/` stores tracker/source snapshots. `trace/`
stores raw prompts, event streams, turn metadata, and runtime command logs.

Run archives are allowed on the main branch as process evidence, but they are
not normal task context. Future agents should read them only when a stage spec,
runner prompt, or human request explicitly names them.

The repo `.rgignore` excludes raw `trace/` files from normal ripgrep searches.
Use `rg --no-ignore` only when explicitly auditing historical traces.

## Quick Rule

For direct bugs, use `diagnose` and prove current behavior first. Every runner
stage writes both the canonical Markdown artifact and the matching Publish Plan
JSON. For new features, refactors, or unclear behavior changes, use foreground
`grill-with-docs -> to-prd -> to-issues`; `plane-ops` is the foreground skill,
while the unattended runner publishes accepted stage facts through its own
Plane+ API publisher.
