# BLP Agent Workflow

## Purpose

This file is the entrypoint for Codex, Symphony-like runners, and other agents
working inside Block Link Plus. It defines how to investigate BLP issues using
repo-owned docs, scripts, and specs without relying on external chat context.

Scope: bug triage, regression investigation, validation planning, and
implementation handoff. Do not move external runner code into this repo.

## Tracker Relationship

Plane or another tracker supplies task identity, status, and task text only. Do
not call Plane APIs from repo runs. Treat this repo, its OpenSpec files, and the
agent docs under `docs/agent/` as the working contract.

## Workspace Expectations

Use an issue-specific git worktree, not the user's main worktree. At the start
and end of a run, record `git status --short`. Keep disposable Obsidian
profile/vault state out of git.

Documentation-only harness tasks may edit repo docs. Bug investigation at the
middle-flow gate must not edit source, tests, package metadata, generated files,
CDP scripts, or OpenSpec specs unless implementation is explicitly requested.

## Standard Bug Investigation Flow

1. Read the task text and classify it as confirmed bug, possible bug, feature
   request, documentation issue, or cluster.
2. Read `AGENTS.md`, this file, and [docs/agent/index.md](docs/agent/index.md).
3. Decide whether OpenSpec is required using
   [docs/agent/openspec-gates.md](docs/agent/openspec-gates.md).
4. Locate relevant specs, source files, tests, docs, and CDP snippets with `rg`.
5. Reproduce or disprove the report with the smallest static or runtime check.
6. Capture evidence: issue text assumptions, commands, DOM/runtime facts,
   screenshots if useful, and exact file/function references.
7. Identify root cause. If the report is a cluster, split it into sub-bugs.
8. Produce a fix plan and validation plan. Stop at the middle-flow gate unless
   code changes were explicitly requested.

## Middle-Flow Gate

Middle-flow means evidence, root cause, and fix plan only. The agent may inspect
files, run read-only commands, and use the isolated Obsidian/CDP runtime for
evidence. The agent must not modify implementation files or tests until the
runner/user asks for implementation.

When the next action is implementation, say so explicitly and list the expected
files, risks, and validations before editing.

## Human Review

Human Review means the agent has finished the requested investigation or change
and needs a person to decide what happens next. It is not proof that the issue is
merged, released, or fully accepted. A Human Review handoff must state:

- what was confirmed
- what was not confirmed
- what changed, if anything
- validation performed
- remaining risks or decisions

## Validation Commands

Use the smallest validation that proves the claim, then broaden as risk grows.

```powershell
npm test
npm run build-with-types
npm run obsidian:debug-env
$env:OB_CDP_PORT='19225'
$env:OB_CDP_TITLE_CONTAINS=' - blp - '
node scripts/obsidian-cdp.js list
node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/<snippet>.js"
```

`npm run build-with-types` rebuilds the plugin bundle. Run it for implementation
validation or when generated output is expected; otherwise prefer targeted tests
and CDP evidence during investigation-only runs.

## Investigation Handoff

Use the format in
[docs/agent/evidence-format.md](docs/agent/evidence-format.md). Minimum
sections are:

- Status
- Scope
- Evidence
- Root Cause
- Fix Plan
- Validation Plan
- Open Questions / Risks
