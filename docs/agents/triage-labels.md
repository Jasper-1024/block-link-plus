# Triage Labels And States

BLP maps Matt-style triage roles onto Plane states and labels.

## Categories

- `bug`: broken or regressed behavior.
- `enhancement`: new capability, workflow improvement, or product change.
- `maintenance`: refactor, documentation, release, or harness work.

Each task should have one category role. If a report contains multiple real
bugs or mixes a bug with an enhancement, split it before AFK implementation.

## State Roles

- `needs-triage`: task has not been classified.
- `needs-info`: waiting for reporter or maintainer input.
- `ready-for-agent`: sufficiently specified for an agent run.
- `ready-for-human`: requires product, architecture, risk, or release judgment.
- `wontfix`: will not be actioned.

## Plane Mapping

- `ready-for-agent` maps to `Todo` or `In Progress` plus `agent-ready`.
- Runtime-sensitive bugs should also carry `cdp-required`.
- `ready-for-human` maps to `Human Review`.
- Human approval for final merge maps to `Ready to Merge`.
- Completed work maps to `Done`.

Plane updates happen through explicit `plane-ops` operations outside unattended
stage workers. Repo-local agents write stage artifacts and concise `Plane Reply`
sections for publishing.
