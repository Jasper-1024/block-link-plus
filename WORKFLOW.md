# BLP Agent Workflow

This is the short overview for Codex, Plane-backed runners, and repo-local
agents. Detailed stage rules live under [docs/harness](docs/harness/README.md).

## Ownership

- The repository is the source of truth for agent policy, stage specs, domain
  language, and validation commands.
- Plane supplies task identity, state, labels, and short task text.
- The external runner chooses a stage, launches workers, and records repo
  artifacts.
- Runner-managed Plane comments, links, child tasks, Project Page dossiers, and
  state changes are projected from repo-local Publish Plan JSON files.
- Foreground Plane operations still use the global `plane-ops` skill.
- Repo-local unattended workers do not embed Plane API calls.

## Required Map

- [AGENTS.md](AGENTS.md): top-level table of contents.
- [CONTEXT.md](CONTEXT.md): Matt-style glossary only.
- [docs/agents](docs/agents): Matt skill context for issue tracking, triage,
  and domain docs.
- [docs/harness/workflow.json](docs/harness/workflow.json): machine-readable
  runner contract.
- [docs/harness/stages](docs/harness/stages/index.md): stage identities,
  required inputs, artifact sections, and gate semantics.
- [docs/harness/guides/publishing.md](docs/harness/guides/publishing.md):
  Publish Plan JSON schema, idempotency, and Plane+ dossier rules.

## Lanes

Bug lane:

```text
investigation -> rca-review -> fix-design -> fix-design-review
-> implementation -> code-review -> Human Review -> Ready to Merge -> finalize
```

Non-bug lane:

```text
enhancement|maintenance parent -> design-intake -> Human Review
-> CLI grill-with-docs -> to-prd -> to-issues
-> foreground plane-ops or runner publisher projects accepted artifacts
-> runner executes only AFK + agent-ready child items
```

Bug work follows `.codex/skills/diagnose/SKILL.md`. Feature, refactor, and
unclear product work starts with `.codex/skills/grill-with-docs/SKILL.md`.
Accepted design is synthesized with `.codex/skills/to-prd/SKILL.md`, broken
into vertical slices with `.codex/skills/to-issues/SKILL.md`, and projected to
Plane+ through a machine-readable Publish Plan or explicit foreground
`plane-ops` operation. Implementation follows
`.codex/skills/tdd/SKILL.md`. Periodic technical-debt review uses
`.codex/skills/improve-codebase-architecture/SKILL.md`.

`grill-with-docs`, `to-prd`, `to-issues`, and architecture grilling are
foreground CLI/HITL workflows. They are not unattended runner stages.

## Runtime Evidence

For `cdp-required` tasks, and for bugs involving Obsidian DOM, CodeMirror
state, plugin lifecycle, focus, scroll, settings, or real editor behavior,
runtime evidence is mandatory before RCA or fix-plan claims.

Use [docs/harness/guides/cdp-runtime.md](docs/harness/guides/cdp-runtime.md).
If the runtime cannot be started or reused, stop with Runtime Blocked and record
the exact failed command.

## Human Gates

Human Review means an agent stage has finished and a person must choose the next
step. It is not proof that the issue is merged, released, or accepted.

For feature/refactor parents, use Human Review as the handoff into CLI
discussion. After a PRD or issue breakdown is accepted, publish one
machine-readable Publish Plan JSON for runner projection, or use the global
`plane-ops` skill for foreground updates. Do not copy/paste Plane updates
through the UI unless the human explicitly chooses that manual fallback.

For finalization, do not move `Human Review` back to `Todo` or `In Progress`.
Move it to `Ready to Merge` only after accepting the code-review result and
wanting the runner to perform mechanical commit/merge finalization.

## Validation

Use the smallest validation that proves the claim, then broaden as risk grows:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm run build-with-types
corepack pnpm run obsidian:debug-env
node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/<snippet>.js"
corepack pnpm run agent:workflow-check
```

Run artifacts belong under `docs/harness/runs/<archive-key>/`. For GitHub
backed Plane items the runner uses `GH-<issue>-<plane-key>` such as
`GH-34-BLP-2`; Plane-only items use `PLANE-<plane-key>`. Raw prompts, event
streams, turn metadata, and runtime command logs belong under
`docs/harness/runs/<archive-key>/trace/<stage>/`. Publish Plan JSON files belong
under `docs/harness/runs/<archive-key>/publish/<stage>.json`.
