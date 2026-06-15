# Agent Stage Specs

This directory defines repo-owned stage identities for external runners.

External trackers and runners may choose which stage to start, but the stage
contract itself lives here. A runner should pass task metadata and artifact
paths, then instruct the worker to read the matching stage spec.

Stages:

- [investigation.md](investigation.md): runtime-first bug investigation and
  evidence completion.
- [rca-review.md](rca-review.md): adversarial RCA review and loop gate.

