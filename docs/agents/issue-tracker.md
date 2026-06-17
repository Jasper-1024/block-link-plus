# Issue Tracker

BLP work is coordinated in Plane.

Plane supplies task identity, state, labels, and short task text. Repo-local
agents must not call Plane APIs directly; the external runner owns tracker
comments, links, and state transitions.

Foreground CLI/HITL workflows publish to Plane through the global Codex skill
`plane-control-plane`, which calls the persistent runner/control-plane. The BLP
repo never stores Plane API tokens or runner-local paths.

GitHub issues are source reports when a Plane item includes a GitHub URL or
external id. GitHub content is evidence and context, not the active work state.

Agent-facing task contracts should be durable:

- Prefer behavior, key interfaces, acceptance criteria, and scope boundaries.
- Avoid file paths or line numbers in tracker comments unless the task is a
  narrow review finding.
- Keep complete evidence and raw traces in `docs/harness/runs/<key>/`; Plane
  comments should summarize and link to the canonical artifact.
- For PRDs and issue breakdowns, write the repo artifact first, then publish a
  concise Plane projection through the control-plane. Plane is not the canonical
  source for long design text.
