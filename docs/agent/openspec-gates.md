# OpenSpec Boundary

OpenSpec is optional formal behavior documentation for BLP. It is not the
default entry point for new features, refactors, or unclear product work.

Start feature/refactor clarification with:

- `CONTEXT.md`
- `.codex/skills/grill-with-docs/SKILL.md`
- `docs/agents/domain.md`

Create or update OpenSpec only when a stage or human explicitly asks for a
formal behavior delta, or when an accepted design changes behavior that existing
specs already treat as authoritative.

## Usually Use Grill With Docs

- New capabilities or user-visible workflows.
- Breaking behavior, schema, command, settings, or API changes.
- Architecture shifts or cross-cutting implementation patterns.
- Security or performance work that changes behavior.
- Ambiguous requests where intended behavior is not clear.

## Usually Direct Diagnosis

- Regressions where expected behavior is already covered by docs, tests, specs,
  or shipped behavior.
- Runtime evidence gathering.
- Narrow bug fixes that restore intended behavior.
- Test additions for existing behavior.
- Documentation-only harness changes.

For direct diagnosis, still read relevant specs when they define expected
behavior. If the fix plan would alter documented behavior, stop with
`human-review-required` unless the human has explicitly asked for OpenSpec work.

## If OpenSpec Is Explicitly Needed

Read [../../openspec/AGENTS.md](../../openspec/AGENTS.md), then run:

```powershell
openspec list
openspec list --specs
```

Do not implement an OpenSpec change before proposal approval.
