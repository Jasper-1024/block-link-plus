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

# Agent skills

BLP uses Matt Pocock's small engineering skills as the first workflow layer.

## Issue tracker

BLP work is coordinated in Plane; repo-local agents write artifacts and Plane
updates happen through explicit `plane-ops` operations. See
`docs/agents/issue-tracker.md`.

## Triage labels

Plane states and labels are mapped to Matt-style triage roles. See
`docs/agents/triage-labels.md`.

## Domain docs

BLP uses a single-context `CONTEXT.md` plus lightweight ADRs in `docs/adr/`.
See `docs/agents/domain.md`.

## Installed skills

- `.codex/skills/setup-matt-pocock-skills/SKILL.md`
- `.codex/skills/grill-with-docs/SKILL.md`
- `.codex/skills/diagnose/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
