# Implementation Slice Evidence

BLP uses test-first reasoning inside the implementation stage. It is not a
runner stage, Plane state, or separate QA/developer-agent loop. The evidence
mode must match the kind of work instead of forcing ceremonial RED evidence.

## Evidence Modes

- `tdd`: introduce one observable failing behavior, make the smallest change
  that passes it, then refactor while green.
- `characterization`: lock down already-working or legacy behavior before a
  change; sensitivity or mutation probes may strengthen the evidence but are
  not labelled as genuine RED.
- `runtime-fix`: reproduce a runtime symptom, apply the smallest correction,
  rebuild or reload, and repeat the same proof package.
- `refactor`: establish a green baseline, change structure without changing
  behavior, and rerun the same validation.

## Principles

- Test public behavior through the highest stable seam available.
- Work in vertical slices with one independently reviewable claim at a time.
- Do not write every test first and then all implementation.
- Do not assert private implementation details when a behavior seam can prove
  the same claim.
- Refactor only from a known-green baseline.
- Keep source and test changes inside the accepted design or routing boundary.

## Slice Plan

Fix design and implementation routing define slices that implementation can
execute without chat context:

```markdown
| Slice | Mode | Behavior | Public Seam | Before Evidence | Minimum Change | After Evidence | Refactor Allowance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S-1 | <tdd, characterization, runtime-fix, or refactor> | <observable claim> | <test/API/runtime seam> | <expected RED, baseline, or reproduction> | <smallest scoped change> | <commands/runtime proof> | <allowed cleanup or N/A> |
```

The planned before-state must correspond to the accepted claim. Runtime-gated
work names the proof package to repeat after rebuild or reload. If a slice
cannot be tested at a stable seam, record why and name the alternate proof.

## Execution Evidence

Implementation records what actually happened for every accepted slice:

```markdown
| Slice | Mode | Before Command / Result | Change | After Command / Result | Refactor / Revalidation | Files Touched |
| --- | --- | --- | --- | --- | --- | --- |
| S-1 | <mode> | `<command>` -> <result> | <minimal patch> | `<command>` -> <result> | <result or N/A> | <files> |
```

Mode-specific requirements:

- `tdd`: before evidence fails for the expected behavior reason; after evidence
  passes the same public seam.
- `characterization`: record the green baseline and what the test constrains;
  do not rename an optional mutation check to RED.
- `runtime-fix`: record the symptom before the change and repeat the same
  runtime package after rebuild or reload.
- `refactor`: record a green baseline and the unchanged post-refactor result.

If the planned test is wrong or evidence contradicts the accepted contract,
stop with the stage's mismatch verdict instead of silently broadening scope.

## Review Checklist

Code review accepts slice evidence only when every implemented behavior maps to
an accepted slice, the declared mode is honest, the before and after evidence
use a stable behavior seam, any refactor follows a green baseline, and required
runtime proof matches the accepted package. Implementation self-reports remain
claims until the review or deterministic gates reproduce them.
