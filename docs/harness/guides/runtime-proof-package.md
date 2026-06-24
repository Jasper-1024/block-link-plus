# Runtime Proof Package

Use this guide when a BLP stage makes a claim about real Obsidian behavior.
Static source inspection can orient the work, but it is not proof for DOM,
CodeMirror, lifecycle, focus, scroll, settings, or editor-behavior bugs.

## Required Shape

Every runtime-gated artifact must make these facts easy to find:

- task key, source issue, archive key, worktree path, and branch
- Obsidian version, vault name, plugin id, plugin version, and CDP port
- build or reload command used before the probe
- exact probe command and important output
- failure proof before the fix, when the stage is investigation or design
- resolution proof after the fix, when the stage is implementation or review
- screenshot, video, DOM snapshot, or JSON trace path when the symptom is visual
  or interactive
- explicit statement of what remains unproved

Store durable evidence under:

```text
docs/harness/runs/<archive-key>/trace/<stage>/
```

Temporary probe scripts belong under `.tmp/<archive-key>/` unless the stage
intentionally promotes a reusable CDP snippet into `scripts/cdp-snippets/`.

## Evidence Levels

- Unit or pure logic bug: source references plus targeted tests can be enough.
- Obsidian runtime bug: CDP proof is required before RCA, design, or validation
  claims.
- Visual, scroll, focus, drag, or editor interaction bug: capture a screenshot
  or video when the visual state matters to the claim.
- Environment-only failure: stop with `runtime-blocked`; do not convert setup
  failure into root cause.

## Stage Expectations

- `investigation`: prove the current failure or record why it was not
  reproduced. Include the falsifiable hypothesis that the evidence supports.
- `fix-design`: name the runtime proof the implementation must repeat. Do not
  claim validation before code exists.
- `implementation`: rerun the accepted proof path after rebuilding/reloading the
  plugin. Record failed validation instead of replacing it with reasoning.
- `code-review`: inspect the patch and independently challenge whether the
  runtime proof matches the accepted design.

## Plane Projection

Plane comments and Project Pages should show the human-review conclusion, not
raw logs. The control-plane brief should answer:

- what behavior was proved
- how it was proved
- what still needs human judgment
- where the canonical artifact and trace live

The repo artifact remains the source of truth.
