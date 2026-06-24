# Agent Map

Start with [WORKFLOW.md](WORKFLOW.md). It is the repo-owned contract for
Plane-backed harness task runs; external trackers provide task state only.
Runner-readable workflow metadata lives in
[docs/harness/workflow.json](docs/harness/workflow.json).

For detailed harness guidance, use [docs/harness/README.md](docs/harness/README.md).
It links bug investigation, CDP validation, HITL Plane publishing, and
handoff formats.

BLP stage specs are the workflow contract. For new features, refactors, or
unclear product direction, `design-intake` prepares a Human Review gate; humans
move the item to `Review Approved` or `Review Rejected`.
`implementation-routing` decides whether to run implementation on the same item
or create AFK child tasks. For bug fixes, investigation, RCA review, fix design,
implementation, and code review are agent-to-agent by default; final merge
approval uses `Ready to Merge`.

Use the global Codex skill `plane-ops` for foreground Plane+ operations. The
unattended runner publishes accepted stage facts from repo-local Publish Plan
JSON files through its own Plane+ API publisher. Keep Plane credentials and
runner-local paths out of this repo.

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
- `corepack pnpm run obsidian:debug-env`
- `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/<snippet>.js"`
- `corepack pnpm run agent:workflow-check`

Runtime-first rule:

- For tasks marked `cdp-required`, or bugs involving Obsidian DOM, CodeMirror
  state, plugin lifecycle, focus, scroll, settings, or real editor behavior, run
  the isolated Obsidian/CDP runtime check before making a root-cause or fix-plan
  claim.
- If the CDP runtime check fails, stop at a Runtime Blocked handoff. Do not promote
  static owner mapping into root cause.

CDP references:

- [docs/debug/isolated-obsidian-cdp.md](docs/debug/isolated-obsidian-cdp.md)
- [docs/debug/cdp-script-inventory.md](docs/debug/cdp-script-inventory.md)
- `scripts/start-obsidian-debug-env.ps1`
- `scripts/obsidian-cdp.js`
