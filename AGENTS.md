# Agent Map

Start with [WORKFLOW.md](WORKFLOW.md). It is the repo-owned contract for
Plane-backed harness task runs; external trackers provide task state only.
Runner-readable workflow metadata lives in
[docs/harness/workflow.json](docs/harness/workflow.json).

For detailed harness guidance, use [docs/harness/README.md](docs/harness/README.md).
It links bug investigation, runtime proof packages, human review briefs,
quality gates, doc gardening, CDP validation, HITL Plane publishing, and
handoff formats.

BLP stage specs are the workflow contract. For new features, refactors, or
unclear product direction, `design-intake` prepares a Human Review gate; humans
move the item to `Review Approved` or `Review Rejected`.
`implementation-routing` decides whether to run implementation on the same item
or create AFK child tasks, and includes the TDD slice plan for the accepted
implementation contract. For bug fixes, investigation, RCA review, fix design,
implementation, and code review are agent-to-agent by default. Bug-lane child
scope must be proposed by `investigation` first; `rca-review` may materialize it
only after accepting that prior recommendation. Final merge approval uses
`Ready to Merge`.

Use the global Codex skill `plane-ops` for foreground Plane+ operations and for
stage specs that explicitly authorize BLP-owned child work-item creation. The
unattended runner publishes accepted stage facts from repo-local Publish Plan
JSON files through its own Plane+ API publisher, but it must not create child
work items. Keep Plane credentials and runner-local paths out of this repo.

Plane project coordinates for all BLP operations:

- Base URL: `http://192.168.4.22:2080`
- Workspace slug: `work`
- Project identifier: `BLP`
- Project UUID: `9183959f-c689-4826-8ec8-fc7fe4bf33ff`

The global `plane-ops` defaults may point at another project such as `WORK`.
For BLP, always pass `--workspace work` and
`--project-id 9183959f-c689-4826-8ec8-fc7fe4bf33ff`; do not rely on the global
default project. Prefer UUIDs returned by `work-item list` for follow-up detail
or comment requests when the global CLI cannot resolve a readable `BLP-<n>` key.

Windows UTF-8 file reads:

- Runner context files, Plane feedback exports, and repo docs are UTF-8. On
  Windows PowerShell, do not read them with bare `Get-Content`; use
  `Get-Content -LiteralPath <path> -Raw -Encoding UTF8`, or use Python
  `Path(...).read_text(encoding="utf-8")`.
- If human feedback or source context looks like mojibake, re-read it with an
  explicit UTF-8 decoder before making workflow, RCA, split, or child-work
  decisions.

## Agent skills

### Issue tracker

BLP work is coordinated in Plane; repo-local agents write artifacts and Plane
updates happen through either runner-owned Publish Plans or explicit foreground
`plane-ops` operations. See
[docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).

### Triage labels

Plane states and labels are mapped to runner-readable task roles. See
[docs/agents/triage-labels.md](docs/agents/triage-labels.md).

### Domain docs

BLP uses a single-context `CONTEXT.md` plus lightweight ADRs in `docs/adr/`.
See [docs/agents/domain.md](docs/agents/domain.md).

Primary validation surfaces:

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm test`
- `corepack pnpm run build-with-types`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port <task-port>`
- `node scripts/obsidian-cdp.js --port <task-port> eval-file "scripts/cdp-snippets/<snippet>.js"`
- `corepack pnpm run agent:workflow-check`

Quality and review rules:

- [docs/harness/guides/quality-gates.md](docs/harness/guides/quality-gates.md)
- [docs/harness/guides/tdd.md](docs/harness/guides/tdd.md)
- [docs/harness/guides/runtime-proof-package.md](docs/harness/guides/runtime-proof-package.md)
- [docs/harness/guides/human-review-brief.md](docs/harness/guides/human-review-brief.md)
- [docs/harness/guides/doc-gardening.md](docs/harness/guides/doc-gardening.md)

Runtime-first rule:

- For tasks marked `cdp-required`, or bugs involving Obsidian DOM, CodeMirror
  state, plugin lifecycle, focus, scroll, settings, or real editor behavior, run
  the isolated Obsidian/CDP runtime check before making a root-cause or fix-plan
  claim.
- If product/runtime evidence cannot be collected from an otherwise healthy
  task-owned instance, stop at a Runtime Blocked handoff. Runner protocol,
  identity, or tainted-instance failures are retried once and then routed to
  Automation Error. Do not promote static owner mapping into root cause.

CDP references:

- [docs/runtime/obsidian-cdp.md](docs/runtime/obsidian-cdp.md)
- `scripts/cdp-snippets/catalog.json`
- `scripts/start-obsidian-debug-env.ps1`
- `scripts/obsidian-cdp.js`
