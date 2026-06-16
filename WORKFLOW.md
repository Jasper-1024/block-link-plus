# BLP Agent Workflow

## Purpose

This file is the entrypoint for Codex, Plane-backed harness runners, and other
agents working inside Block Link Plus. It defines how to investigate BLP issues
using repo-owned docs, scripts, and specs without relying on external chat
context.

Scope: bug triage, regression investigation, validation planning, and
implementation handoff. Do not move external runner code into this repo.

## Production Status

This workflow is the maintained BLP mainline process. The earlier
`agent-test`/trial runner phase has ended; future tracker-driven issue work
should treat these repo-owned stage specs and artifact rules as the baseline.

External runners may evolve independently, but they must not embed BLP-specific
stage policy as their source of truth. If runner behavior and this repository
disagree, update this workflow or the matching stage spec first, then adjust the
runner to follow it. Machine-readable runner metadata lives in
[docs/agent/workflow.json](docs/agent/workflow.json).

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
5. Reproduce or disprove the report with the required runtime gate. For
   `cdp-required` tasks, and for bugs involving Obsidian DOM, CodeMirror state,
   plugin lifecycle, focus, scroll, settings, or editor behavior, the CDP
   runtime check must pass before root-cause analysis.
6. Capture evidence: issue text assumptions, commands, DOM/runtime facts,
   screenshots if useful, and exact file/function references.
7. Identify root cause. If the report is a cluster, split it into sub-bugs.
8. Produce a bounded investigation handoff. If an RCA review exists, answer its
   specific evidence gaps instead of restarting broad triage. Stop at the
   middle-flow gate unless code changes were explicitly requested.

## Repo-Owned Stage Specs

External runners choose a stage and pass task metadata, but the stage identity
and project-specific workflow live in this repo:

- [docs/agent/stages/investigation.md](docs/agent/stages/investigation.md)
- [docs/agent/stages/rca-review.md](docs/agent/stages/rca-review.md)
- [docs/agent/stages/fix-design.md](docs/agent/stages/fix-design.md)
- [docs/agent/stages/fix-design-review.md](docs/agent/stages/fix-design-review.md)
- [docs/agent/stages/implementation.md](docs/agent/stages/implementation.md)
- [docs/agent/stages/code-review.md](docs/agent/stages/code-review.md)

Runner prompts should point workers at these specs instead of embedding BLP
stage rules in external orchestration code.

## OpenSpec Boundary

OpenSpec remains the product behavior/specification system under `openspec/`.
It is not a runner workflow stage. Agents use
[docs/agent/openspec-gates.md](docs/agent/openspec-gates.md) to decide whether a
task is direct bug restoration or requires a human-approved OpenSpec proposal.
If a stage discovers that a proposal is required, it must stop with
`human-review-required` instead of creating a parallel agent loop.

## Middle-Flow Gate

Middle-flow means evidence, RCA, and gate handoff only. The agent may inspect
files, run read-only commands, and use the isolated Obsidian/CDP runtime for
evidence. The agent must not modify implementation files or tests until the
runner/user asks for implementation. Do not produce an implementation-ready fix
plan while the RCA review loop still has blocking evidence gaps.

For `cdp-required` tasks, middle-flow is runtime-first:

- Static reading is allowed only to understand the task, choose the smallest
  repro path, and locate existing CDP snippets.
- Run the fixed-port CDP runtime check in
  [docs/agent/cdp-validation.md](docs/agent/cdp-validation.md) before claiming
  root cause.
- If Obsidian/CDP cannot start, produce only a Runtime Blocked handoff with the
  exact failed commands and missing prerequisites. Do not submit a root cause,
  implementation target, or fix-design handoff based on static analysis alone.

When RCA review is accepted, the next middle-flow stage is fix design, followed
by adversarial fix-design review. Implementation starts only after fix-design
review accepts the design. The implementation agent must follow
[docs/agent/stages/implementation.md](docs/agent/stages/implementation.md),
make the smallest accepted patch, and record tests, build, and CDP evidence in
`docs/agent/runs/<tracker-key>/implementation.md`. A separate code-review agent
then follows [docs/agent/stages/code-review.md](docs/agent/stages/code-review.md)
and writes `docs/agent/runs/<tracker-key>/code-review.md` before a human merge
or release decision.

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
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm run build-with-types
$env:OB_CDP_PORT='19225'
$env:OB_CDP_TITLE_CONTAINS=' - blp - '
node scripts/obsidian-cdp.js list
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 19225
node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/<snippet>.js"
corepack pnpm run agent:workflow-check
```

`corepack pnpm install --frozen-lockfile` prepares an issue worktree from the
repo-owned lockfile without relying on the user's main checkout. `corepack pnpm
run build-with-types` rebuilds the plugin bundle. Run it for implementation
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

Canonical investigation artifacts belong under:

```text
docs/agent/runs/<tracker-key>/investigation.md
```

Raw prompts, event streams, turn metadata, and runtime command logs belong under
`docs/agent/runs/<tracker-key>/trace/<stage>/`. Plane comments and follow-up
agents should point to the canonical repo-local artifact above, not to raw trace
files. Trace files are audit material, not default task context.
