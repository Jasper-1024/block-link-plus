# OpenSpec Gates

OpenSpec is required when the requested work changes intended behavior. Direct
bug investigation is appropriate when the work is to understand or restore
existing behavior.

## Use OpenSpec For

- New capabilities or user-visible workflows.
- Breaking behavior, schema, command, settings, or API changes.
- Architecture shifts or cross-cutting implementation patterns.
- Security or performance work that changes behavior.
- Ambiguous requests where the intended behavior is not clear.

Start by reading [../../openspec/AGENTS.md](../../openspec/AGENTS.md), then run:

```powershell
openspec list
openspec list --specs
```

Do not implement an OpenSpec change before proposal approval.

## Usually Direct Investigation

- Regressions where expected behavior is already covered by specs, docs, tests,
  or shipped behavior.
- Runtime evidence gathering.
- Narrow bug fixes that restore intended behavior.
- Test additions for existing behavior.
- Documentation-only harness changes.

For direct investigation, still read relevant specs when they define expected
behavior. If the fix plan would alter the spec, stop and create or request an
OpenSpec proposal.

## Conflict Check

Before implementation, check active changes for overlap:

```powershell
openspec list
rg -n "<capability-or-keyword>" openspec/changes openspec/specs
```

If a pending change owns the same behavior, call that out in the handoff.
