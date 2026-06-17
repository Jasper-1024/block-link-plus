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
[docs/harness/workflow.json](docs/harness/workflow.json).

For detailed harness guidance, use [docs/harness/README.md](docs/harness/README.md).
It links bug investigation, CDP validation, OpenSpec gates, and handoff formats.

BLP now uses Matt Pocock's small engineering skills as the first workflow layer.
For new features, refactors, or unclear product direction, use
`.codex/skills/grill-with-docs/SKILL.md` before implementation planning. For
hard bugs, use `.codex/skills/diagnose/SKILL.md`. For implementation, use
`.codex/skills/tdd/SKILL.md` and work in vertical slices. OpenSpec remains
historical/formal behavior documentation; create or modify OpenSpec only when a
stage or human explicitly asks for a formal spec delta.

## Agent skills

### Issue tracker

BLP work is coordinated in Plane; repo-local agents write artifacts and the
external runner updates Plane. See [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).

### Triage labels

Plane states and labels are mapped to Matt-style triage roles. See
[docs/agents/triage-labels.md](docs/agents/triage-labels.md).

### Domain docs

BLP uses a single-context `CONTEXT.md` plus lightweight ADRs in `docs/adr/`.
See [docs/agents/domain.md](docs/agents/domain.md).

### Installed skills

- `.codex/skills/setup-matt-pocock-skills/SKILL.md`
- `.codex/skills/grill-with-docs/SKILL.md`
- `.codex/skills/diagnose/SKILL.md`
- `.codex/skills/tdd/SKILL.md`

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
