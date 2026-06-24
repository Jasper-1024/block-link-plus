# Quality Gates

These are BLP's current agent-facing golden principles. They are intentionally
mechanical: future agents should be able to check them without asking a human to
reconstruct project taste from chat history.

## Principles

- Repo-local truth: durable workflow rules, evidence, and decisions live in the
  repo. Plane is the control panel projection.
- Runtime before RCA: real Obsidian behavior requires CDP proof before root
  cause, fix design, or validation claims.
- Bounded scope: solve the accepted issue slice. Split clusters before
  implementation.
- TDD evidence is a gate: design or routing defines behavior slices,
  implementation records Red/Green/Refactor evidence, and code review validates
  that evidence.
- Review loops stay intact: investigation, RCA review, fix design, design
  review, implementation, and code review are separate responsibilities.
- Human gates are state gates: comments carry feedback; Plane state carries
  approval or rejection.
- Temporary probes stay temporary: exploratory scripts belong under `.tmp/`
  unless deliberately promoted into `scripts/cdp-snippets/`.
- Audience boundaries stay clean: user docs live under `doc/`; harness,
  runtime, and development docs live under `docs/`.
- Validation is evidence: record exact commands and important output, including
  commands that could not run.

## Current Mechanical Gates

- `corepack pnpm run agent:workflow-check` validates doc boundaries, required
  harness paths, retired workflow paths, and workflow manifest structure.
- Stage workers must write both the Markdown artifact and Publish Plan JSON.
- Publish Plan artifact hashes must match the artifact content.
- Runtime-gated tasks must follow
  [runtime-proof-package.md](runtime-proof-package.md).
- Human-review stages must follow
  [human-review-brief.md](human-review-brief.md).
- TDD-gated implementation stages must follow [tdd.md](tdd.md).

## Escalation

When an agent cannot satisfy a gate, it should stop with the narrowest accurate
handoff: `runtime-blocked`, `context-blocked`, `validation-failed`,
`needs-revision`, or `human-review-required`. Do not silently broaden scope to
make progress.
