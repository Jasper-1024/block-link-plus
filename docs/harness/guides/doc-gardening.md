# Doc Gardening

Doc gardening keeps the harness legible for future agents. It is separate from
feature work and should be done in small, reviewable patches.

## What To Scan

- active docs that reference retired harness/debug paths, OpenSpec, or
  memory-bank
- workflow manifest paths that no longer exist
- stage specs that omit required publishing, runtime proof, or human-review
  guidance
- duplicated or contradictory Plane state semantics
- run artifact details copied into active docs
- user-facing docs under `doc/` that include agent-only instructions
- active CDP snippets that are obsolete, one-off, or undocumented

## Output

Use a short repo-local artifact or Plane comment for the gardening finding:

- stale item found
- proposed smallest fix
- validation command
- whether the change is safe to do immediately

Do not rewrite historical run artifacts during gardening unless a human
explicitly requests archival repair.

## Cadence

Run gardening after workflow changes, after repeated agent confusion, and before
turning a manual convention into an automation rule.
