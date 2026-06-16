# Agent Harness Index

This directory contains the repo-owned guide for future agents working on Block
Link Plus issues.

## Start Here

- [../../AGENTS.md](../../AGENTS.md): short top-level map for agents.
- [../../WORKFLOW.md](../../WORKFLOW.md): maintained Plane-backed harness task workflow.
- [bug-investigation.md](bug-investigation.md): issue investigation process.
- [cdp-validation.md](cdp-validation.md): isolated Obsidian/CDP validation.
- [openspec-gates.md](openspec-gates.md): when OpenSpec is required.
- [evidence-format.md](evidence-format.md): required handoff format.
- [stages/index.md](stages/index.md): repo-owned runner stage identities.

## Existing Sources Of Truth

- [../../openspec/project.md](../../openspec/project.md): project conventions.
- `openspec/specs/`: accepted behavior.
- `openspec/changes/`: proposed or in-progress behavior changes.
- [../../doc/debug/isolated-obsidian-cdp.md](../../doc/debug/isolated-obsidian-cdp.md):
  isolated Obsidian runtime.
- [../../doc/debug/cdp-script-inventory.md](../../doc/debug/cdp-script-inventory.md):
  CDP script and snippet ownership.
- `scripts/start-obsidian-debug-env.ps1`: launches disposable Obsidian runtime.
- `scripts/obsidian-cdp.js`: default project CDP client.
- `scripts/cdp-snippets/`: project regression and smoke snippets.
- `.codex/skills/blp-enhanced-list-ui-debug/`: specialized Enhanced List UI
  debugging guidance.

`memory-bank/` is historical project context. Verify against current source,
OpenSpec, and runtime behavior before relying on it.

## Run Archives

`docs/agent/runs/<key>/` is the durable archive for one tracked task. The stage
handoff files at that level are the canonical inputs for later stages of the
same task. `context/` stores the tracker/source snapshots used for that run.
`trace/` stores raw runner prompts, event streams, turn metadata, and runtime
command logs for audit and debugging.

These archives are allowed to live on the main branch as process evidence, but
they are not normal task context. Future agents should use them only when a
stage spec, runner prompt, or human request explicitly names them.

Do not scan historical run archives or `trace/` directories as normal context.
Read only the artifacts named by the current stage spec or the runner prompt.
Use older run archives only when a human explicitly asks for historical
comparison or when the current stage spec names them as evidence.

The repo `.rgignore` excludes raw `trace/` files from normal ripgrep searches.
Use `rg --no-ignore` only when explicitly auditing historical traces.

## Quick Rule

For direct bugs, investigate and prove the current behavior first. For new or
changed behavior, start with OpenSpec.
