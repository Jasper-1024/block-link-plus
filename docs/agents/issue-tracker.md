# Issue Tracker

BLP work is coordinated in Plane.

Plane supplies task identity, state, labels, and short task text. Repo-local
unattended agents must not embed Plane API calls in repo scripts or artifacts.
Tracker comments, links, child items, Project Page dossiers, and state
transitions are projected by the runner from Publish Plan JSON.

Foreground CLI/HITL workflows publish to Plane through the global Codex skill
`plane-ops`. The BLP repo never stores Plane API tokens or runner-local paths.

GitHub issues are source reports when a Plane item includes a GitHub URL or
external id. GitHub content is evidence and context, not the active work state.

## Information Homes

- Work item: current state, owner, labels, priority, and the smallest useful
  task contract for the active bug-fix step.
- Comments: timestamped progress summaries, decisions, blockers, and links to
  canonical artifacts. Keep them short enough to scan as a timeline.
- Links: stable pointers to GitHub reports, repo artifacts, validation traces,
  and Project Page dossiers.
- Project Page dossier: runner-maintained long-form index for a complex bug
  when one work item needs more context than a comment timeline can carry.
- Project wiki or doc collection: reusable cross-bug knowledge, such as
  diagnostics, browser/runtime notes, or repeated validation patterns.
- Repo artifacts: canonical evidence, PRDs, issue breakdowns, and accepted
  investigation handoffs under `docs/harness/runs/<key>/`.

Agent-facing task contracts should be durable:

- Prefer behavior, key interfaces, acceptance criteria, and scope boundaries.
- Avoid file paths or line numbers in tracker comments unless the task is a
  narrow review finding.
- Keep complete evidence and raw traces in `docs/harness/runs/<key>/`; Plane
  comments should summarize and link to the canonical artifact.
- For PRDs and issue breakdowns, write the repo artifact first, then publish a
  concise Plane projection through Publish Plan JSON or foreground `plane-ops`.
  Plane is not the canonical source for long design text.
- Before relying on Project Page automation, run `plane-ops --project-id
  <project-id> capability probe --json` for the project. If Pages are
  session-auth only, stop the runner publishing path; do not automate web-app
  session APIs.
