# BLP Agent Workflow

This is the short overview for Codex, Plane-backed runners, and repo-local
agents. Detailed stage rules live under [docs/harness](docs/harness/README.md).

## Ownership

- The repository is the source of truth for agent policy, stage specs, domain
  language, and validation commands.
- Plane supplies task identity, state, labels, and short task text.
- The external runner chooses a stage, launches workers, and records repo
  artifacts.
- Runner-managed Plane comments, links, Project Page dossiers, and state
  changes are projected from repo-local Publish Plan JSON files.
- Child work items are created only by foreground `plane-ops` operations or by
  BLP stage specs that explicitly authorize child creation.
- Foreground Plane operations still use the global `plane-ops` skill.
- Repo-local unattended workers do not embed Plane API calls.

## Required Map

- [AGENTS.md](AGENTS.md): top-level table of contents.
- [CONTEXT.md](CONTEXT.md): BLP domain vocabulary.
- [docs/agents](docs/agents): issue tracking, task roles, and domain docs.
- [docs/harness/workflow.json](docs/harness/workflow.json): machine-readable
  runner contract.
- [docs/harness/stages](docs/harness/stages/index.md): stage identities,
  required inputs, artifact sections, and gate semantics.
- [docs/harness/guides/runtime-proof-package.md](docs/harness/guides/runtime-proof-package.md):
  required shape for runtime evidence packages.
- [docs/harness/guides/human-review-brief.md](docs/harness/guides/human-review-brief.md):
  control-plane review brief rules.
- [docs/harness/guides/quality-gates.md](docs/harness/guides/quality-gates.md):
  BLP agent quality principles and mechanical gates.
- [docs/harness/guides/tdd.md](docs/harness/guides/tdd.md): vertical-slice
  TDD plan, execution evidence, and review checklist.
- [docs/harness/guides/publishing.md](docs/harness/guides/publishing.md):
  Publish Plan JSON schema, idempotency, and Plane+ dossier rules.
- [docs/harness/plans](docs/harness/plans/README.md): cross-task harness plans
  and known process debt.

## Lanes

Bug lane:

```text
investigation -> rca-review -> gate
accepted RCA -> fix-design -> fix-design-review
-> implementation -> code-review -> Human Review -> Ready to Merge -> finalize
```

When investigation proves that the parent bug is not a single fix unit, it may
recommend `split-recommended` or `mitigation-child-recommended`. RCA review may
materialize child work items only after accepting that recommendation; otherwise
it must continue the RCA loop. If RCA review agrees that the bug or cluster is
not currently reproduced and has no evidence-backed fixable RCA or materialized
child scope, it uses `cluster-needs-human-review` and leaves the parent in
Human Review instead of starting fix design.

Non-bug lane:

```text
enhancement|maintenance parent -> design-intake -> Human Review
-> human moves item to Review Approved or Review Rejected
-> implementation-routing
-> same-task implementation OR AFK child tasks
-> implementation -> code-review -> Human Review -> Ready to Merge -> finalize
```

Bug work is an agent-to-agent loop by default: reproduce with runtime evidence,
review the RCA, design the bounded fix as executable TDD behavior slices, review
the design, implement the accepted slices with Red/Green/Refactor evidence, and
review the patch before the final human gate. Feature, refactor, and unclear
product work starts with `design-intake`, then waits for an explicit human
review state before implementation routing.

Do not route unattended workers through interactive CLI discussion workflows.
If product judgment is required, write the question into the artifact and move
the Plane item to `Human Review`.

The runner never infers approval from natural-language comments. Comments and
Project Pages are feedback inputs for the next agent; `Review Approved` and
`Review Rejected` are the machine-readable gate states.

When a task leaves Human Review, the next agent must reconcile readable human
feedback with the prior artifacts before choosing a verdict. Feedback can
change scope, narrow the next evidence request, justify a bounded child-scope
recommendation, or be deferred/rejected with reasons; it is not automatically
binding and must not be silently ignored.

## Runtime Evidence

For `cdp-required` tasks, and for bugs involving Obsidian DOM, CodeMirror
state, plugin lifecycle, focus, scroll, settings, or real editor behavior,
runtime evidence is mandatory before RCA or fix-plan claims.

Use [docs/harness/guides/cdp-runtime.md](docs/harness/guides/cdp-runtime.md)
and [docs/harness/guides/runtime-proof-package.md](docs/harness/guides/runtime-proof-package.md).
If the runtime cannot be started or reused, stop with Runtime Blocked and record
the exact failed command.

## Human Gates

Human Review means an agent stage has finished and a person must choose the next
step. It is not proof that the issue is merged, released, or accepted.
Use [docs/harness/guides/human-review-brief.md](docs/harness/guides/human-review-brief.md)
for the Project Page and comment shape.

For feature/refactor parents, use Human Review as the explicit approve/reject
gate:

- approve: move the item to `Review Approved`; optionally add a short comment
- reject: add feedback in a comment or linked Project Page, then move the item
  to `Review Rejected`
- unresolved: keep the item in `Human Review`

After approval, `implementation-routing` decides whether the same item can enter
implementation or whether AFK child tasks should be created through the
stage-authorized BLP child-creation path. The routing output must include the
TDD slice plan each implementation agent will execute.

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
