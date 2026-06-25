# Adopt Plane-Backed Agent Harness

BLP uses a Plane-backed, artifact-first harness for unattended agent work.

Plane is the control panel for task state, short feedback, links, child tasks,
and Project Page dossiers. The repository is the source of truth for stage
contracts, domain language, validation commands, and canonical run artifacts.
The external runner chooses stages, launches workers, validates their artifacts
and Publish Plan JSON, and projects comments, links, dossiers, and state
changes back to Plane+.

Repo-local workers do not call Plane APIs unless a stage spec explicitly
authorizes BLP-owned child work-item creation. They do not run interactive CLI
discussion workflows. They write the requested stage artifact and matching
Publish Plan JSON under `docs/harness/runs/<archive-key>/`. The generic runner
publisher never creates child work items from Publish Plan `children`.

Human review is expressed through Plane states. For non-bug design gates, a
human moves the item from `Human Review` to `Review Approved` or
`Review Rejected`. For bug-fix work, investigation, RCA review, fix design,
implementation, and code review are agent-to-agent by default; final merge
approval uses `Ready to Merge`.
