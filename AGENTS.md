<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Agent Map

Start with [WORKFLOW.md](WORKFLOW.md). It is the repo-owned contract for
Plane-backed harness task runs; external trackers provide task state only.
Runner-readable workflow metadata lives in
[docs/agent/workflow.json](docs/agent/workflow.json).

For detailed harness guidance, use [docs/agent/index.md](docs/agent/index.md).
It links bug investigation, CDP validation, OpenSpec gates, and handoff formats.

Use OpenSpec when a request adds or changes capabilities, changes architecture,
or is ambiguous enough that the spec must lead. For direct bug investigation,
triage and reproduce the issue first, read the relevant specs as needed, and
only create an OpenSpec change if the fix changes intended behavior.

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

- [doc/debug/isolated-obsidian-cdp.md](doc/debug/isolated-obsidian-cdp.md)
- [doc/debug/cdp-script-inventory.md](doc/debug/cdp-script-inventory.md)
- `scripts/start-obsidian-debug-env.ps1`
- `scripts/obsidian-cdp.js`
