# Harness Debt

This file records known process debt so future agents do not rediscover it from
old chat context.

## Active

- Runtime proof packages need to be applied consistently to new bug-fix runs.
- Human Review briefs must stay human-readable; artifact paths and hashes are
  supporting evidence, not the main content.
- Runner and BLP workflow fixtures can drift when `docs/harness/workflow.json`
  changes.
- Doc gardening is currently manual plus `agent:workflow-check`; recurring
  background cleanup is not automated yet.

## Deferred

- Release automation, version bumping, changelog updates, tags, and publishing
  are intentionally out of scope until the bug-fix loop is stable.
