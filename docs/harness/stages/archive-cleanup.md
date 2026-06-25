# Archive Cleanup Stage

## Identity

This stage is runner-owned. It is not a Codex sub-agent prompt.

When a Plane item is moved to `Ready to Archive`, the runner performs the local
cleanup that should happen after the task is no longer active. Marking an item
`Done` is terminal and does not ask the runner to clean anything. `Ready to
Archive` is the explicit request to remove local worker residue and archive the
Plane item.

## Preconditions

The runner must stop without deleting local state if any shared precondition
fails:

- the workflow is the BLP git-worktree workflow
- the main BLP worktree is clean
- `docs/harness/runs/**/trace/` is ignored by git
- the issue branch is already merged into the main worktree `HEAD`

Finalized cleanup also requires:

- `docs/harness/runs/<key>/finalize.md` has verdict `completed`
- `docs/harness/runs/<key>/publish/finalize.json` exists and matches the
  finalization artifact hash
- the worker worktree has no unexpected residue beyond runner state and
  `docs/harness/runs/<key>/trace/`

Manual no-op cleanup is used when no finalize artifact exists. This is for
duplicate, already-handled, or otherwise no-op items that a human explicitly
moved to `Ready to Archive`. It requires the worker worktree to have no
unexpected residue beyond:

- generated run artifacts under `docs/harness/runs/<key>/`
- git-ignored paths such as `docs/harness/runs/<key>/trace/` and dependency
  caches

## Runner Actions

If all preconditions pass, finalized cleanup:

- copies worker-local `docs/harness/runs/<key>/trace/` back into the matching
  ignored path in the main worktree
- snapshots worker-local `runner-state.json` into the ignored trace path when
  it differs from the main worktree copy

Manual no-op cleanup:

- copies the worker-local `docs/harness/runs/<key>/` directory into the matching
  main-worktree `docs/harness/runs/<key>/trace/archive-snapshot/` path
- keeps no product code or formal repo artifact in the main worktree

Both cleanup modes:

- removes the issue worktree
- deletes the merged issue branch
- comments on the Plane item
- archives the Plane item

## Failure Semantics

If cleanup fails, the runner leaves the Plane item unarchived, moves it back to
`Human Review`, and comments with the reason. It must not delete the worker
worktree after a failed precondition.
