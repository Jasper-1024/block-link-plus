# BLP Agent Workflow

## Purpose

This file is the entrypoint for Codex, Plane-backed harness runners, and other
agents working inside Block Link Plus. It defines how BLP uses repo-local Matt
Pocock engineering skills, Obsidian/CDP runtime evidence, and stage artifacts
without relying on external chat context.

Do not move external runner code into this repo. The runner supplies task
identity, tracker state, and artifact paths; the repo owns the stage policy.

## Production Status

This workflow is the maintained BLP mainline process. External runners may
evolve independently, but they must not embed BLP-specific stage policy as their
source of truth. If runner behavior and this repository disagree, update this
workflow or the matching stage spec first, then adjust the runner to follow it.

Machine-readable runner metadata lives in
[docs/agent/workflow.json](docs/agent/workflow.json).

## Matt Skills Baseline

BLP installs the following repo-local skills:

- `.codex/skills/setup-matt-pocock-skills/SKILL.md`
- `.codex/skills/grill-with-docs/SKILL.md`
- `.codex/skills/diagnose/SKILL.md`
- `.codex/skills/tdd/SKILL.md`

Agents should also read:

- [CONTEXT.md](CONTEXT.md): BLP domain language.
- [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md): Plane/GitHub boundary.
- [docs/agents/triage-labels.md](docs/agents/triage-labels.md): role/state mapping.
- [docs/agents/domain.md](docs/agents/domain.md): how to consume context docs.

## Tracker Relationship

Plane supplies task identity, status, labels, and task text only. Repo-local
agents must not call Plane APIs. Treat this repo, its skills, and
`docs/agent/` as the working contract. The runner writes comments, links, and
state transitions back to Plane.

## Workspace Expectations

Use an issue-specific git worktree, not the user's main worktree. At the start
and end of a run, record `git status --short`. Keep disposable Obsidian
profile/vault state out of git.

Documentation-only harness tasks may edit repo docs. Bug investigation and
design stages must not edit source, tests, package metadata, generated files,
CDP scripts, or OpenSpec specs unless implementation is explicitly requested.

## Bug Lane

Bug work follows `.codex/skills/diagnose/SKILL.md`:

1. Build a feedback loop.
2. Reproduce the reported symptom.
3. Generate ranked falsifiable hypotheses.
4. Instrument one hypothesis at a time.
5. Fix with a regression test when a correct seam exists.
6. Clean up probes and record the cause.

For `cdp-required` tasks, and for bugs involving Obsidian DOM, CodeMirror state,
plugin lifecycle, focus, scroll, settings, or editor behavior, the CDP runtime
check must pass before root-cause analysis.

The runner-visible bug lane remains:

```text
investigation -> rca-review -> fix-design -> fix-design-review
-> implementation -> code-review -> Human Review -> Ready to Merge -> finalize
```

## Feature And Refactor Lane

New features, behavior changes, unclear product work, and large refactors start
with `.codex/skills/grill-with-docs/SKILL.md`.

The goal is to align language, scenarios, boundaries, and hard-to-reverse
decisions before implementation. Update `CONTEXT.md` only when a
project-specific term is resolved. Add an ADR only when the decision is
hard-to-reverse, surprising without context, and the result of a real trade-off.

Do not use the bug RCA loop as a substitute for feature discussion. If a Plane
task needs product or architecture judgment, stop with `human-review-required`
and state what must be clarified.

## Implementation Lane

Implementation follows `.codex/skills/tdd/SKILL.md`.

Use vertical slices:

- one behavior test at the highest stable public seam
- the smallest implementation that makes that test pass
- repeat for the next behavior
- refactor only after the slice is green

Tests should verify behavior through public interfaces, not private
implementation details. Mock only at system boundaries. For Obsidian runtime
behavior, pair tests with the smallest CDP validation that proves the behavior
in the real app.

## Repo-Owned Stage Specs

External runners choose a stage and pass task metadata, but the stage identity
and project-specific workflow live in this repo:

- [docs/agent/stages/investigation.md](docs/agent/stages/investigation.md)
- [docs/agent/stages/rca-review.md](docs/agent/stages/rca-review.md)
- [docs/agent/stages/fix-design.md](docs/agent/stages/fix-design.md)
- [docs/agent/stages/fix-design-review.md](docs/agent/stages/fix-design-review.md)
- [docs/agent/stages/implementation.md](docs/agent/stages/implementation.md)
- [docs/agent/stages/code-review.md](docs/agent/stages/code-review.md)
- [docs/agent/stages/finalize.md](docs/agent/stages/finalize.md)

Runner prompts should point workers at these specs instead of embedding BLP
stage rules in external orchestration code.

## OpenSpec Boundary

OpenSpec remains historical and formal behavior documentation under
`openspec/`. It is not the default first step for new work.

Use `grill-with-docs` first for feature/refactor clarification. Create or update
OpenSpec only when a stage or human explicitly asks for a formal behavior delta,
or when an accepted design changes documented behavior and a formal spec record
adds value.

## Human Review

Human Review means the agent has finished the requested investigation or change
and needs a person to decide what happens next. It is not proof that the issue
is merged, released, or fully accepted.

For the final merge path, do not move `Human Review` back to `Todo` or
`In Progress`. Move it to `Ready to Merge` only after the human accepts the
code-review result and wants the runner to perform mechanical finalization.

## Validation Commands

Use the smallest validation that proves the claim, then broaden as risk grows.

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm run build-with-types
corepack pnpm run obsidian:debug-env
$env:OB_CDP_PORT='19225'
$env:OB_CDP_TITLE_CONTAINS=' - blp - '
node scripts/obsidian-cdp.js list
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 19225
node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/<snippet>.js"
corepack pnpm run agent:workflow-check
```

`corepack pnpm install --frozen-lockfile` prepares an issue worktree from the
repo-owned lockfile without relying on the user's main checkout. Run
`corepack pnpm run build-with-types` for implementation validation or when
generated output is expected; otherwise prefer targeted tests and CDP evidence.

## Run Archives

Canonical artifacts belong under:

```text
docs/agent/runs/<tracker-key>/
```

Raw prompts, event streams, turn metadata, and runtime command logs belong under
`docs/agent/runs/<tracker-key>/trace/<stage>/`. Plane comments and follow-up
agents should point to canonical repo-local artifacts, not raw trace files.
