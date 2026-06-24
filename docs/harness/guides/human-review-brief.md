# Human Review Brief

Use this guide whenever a stage routes a Plane item to `Human Review`.

The brief is for a human deciding the next state. It is not a copy of the full
artifact and it is not a machine-field dump.

## Required Content

A useful brief answers these questions in the first screen:

- What decision is required now?
- What does the agent recommend?
- Which facts are already proved?
- Which risks or unknowns remain?
- What should happen on approval, rejection, or a request for more evidence?

Use the canonical artifact for details. The Plane Project Page dossier should
extract the review sections from that artifact, and `page.summary` in the
Publish Plan should be a concise human-readable summary.

## State Semantics

The runner never infers approval from comments.

- Approve design or routing: move the Plane item to `Review Approved`.
- Reject design or routing: add feedback, then move the item to
  `Review Rejected`.
- Accept final code-review for merge finalization: move the item to
  `Ready to Merge`.
- Leave unresolved questions in `Human Review`.

Comments and linked Pages are context for the next agent run. Plane state is the
machine-readable gate.

## Bad Briefs

Do not publish briefs whose main content is only:

- artifact path and SHA
- stage name and verdict
- a generic sentence such as "ready for review"
- raw logs, trace output, or JSON blobs

Those facts may appear in the dossier, but they cannot replace the decision
summary.
