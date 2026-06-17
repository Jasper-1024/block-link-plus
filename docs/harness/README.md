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
- [guides/openspec-boundary.md](guides/openspec-boundary.md): when OpenSpec is required.
- [guides/bug-investigation.md](guides/bug-investigation.md): legacy bug lane checklist.

## Matt Skill Context

- [../../CONTEXT.md](../../CONTEXT.md): BLP domain language.
- [../agents/domain.md](../agents/domain.md): how skills consume domain docs.
- [../agents/issue-tracker.md](../agents/issue-tracker.md): Plane/GitHub boundary.
- [../agents/triage-labels.md](../agents/triage-labels.md): category and state labels.
- [../../.codex/skills/grill-with-docs/SKILL.md](../../.codex/skills/grill-with-docs/SKILL.md): feature/refactor clarification.
- [../../.codex/skills/diagnose/SKILL.md](../../.codex/skills/diagnose/SKILL.md): bug diagnosis loop.
- [../../.codex/skills/tdd/SKILL.md](../../.codex/skills/tdd/SKILL.md): vertical-slice implementation.

## Run Archives

`docs/harness/runs/<key>/` is the durable archive for one tracked task. Stage
artifacts at that level are canonical inputs for later stages. `context/`
stores tracker/source snapshots. `trace/` stores raw prompts, event streams,
turn metadata, and runtime command logs.

Run archives are allowed on the main branch as process evidence, but they are
not normal task context. Future agents should read them only when a stage spec,
runner prompt, or human request explicitly names them.

The repo `.rgignore` excludes raw `trace/` files from normal ripgrep searches.
Use `rg --no-ignore` only when explicitly auditing historical traces.

## Quick Rule

For direct bugs, use `diagnose` and prove current behavior first. For new
features, refactors, or unclear behavior changes, use `grill-with-docs` before
implementation planning. Use OpenSpec only when a stage or human explicitly
needs a formal behavior delta.
