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
Symphony-like task runs; external trackers provide task state only.

For detailed harness guidance, use [docs/agent/index.md](docs/agent/index.md).
It links bug investigation, CDP validation, OpenSpec gates, and handoff formats.

Use OpenSpec when a request adds or changes capabilities, changes architecture,
or is ambiguous enough that the spec must lead. For direct bug investigation,
triage and reproduce the issue first, read the relevant specs as needed, and
only create an OpenSpec change if the fix changes intended behavior.

Primary validation surfaces:

- `npm test`
- `npm run build-with-types`
- `npm run obsidian:debug-env`
- `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/<snippet>.js"`

CDP references:

- [doc/debug/isolated-obsidian-cdp.md](doc/debug/isolated-obsidian-cdp.md)
- [doc/debug/cdp-script-inventory.md](doc/debug/cdp-script-inventory.md)
- `scripts/start-obsidian-debug-env.ps1`
- `scripts/obsidian-cdp.js`
