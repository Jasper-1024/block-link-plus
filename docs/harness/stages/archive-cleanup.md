# Archive Cleanup Stage

## Identity

This stage is runner-owned. It is not a Codex sub-agent prompt.

When a finalized Plane item is moved to `Ready to Archive`, the runner performs
the local cleanup that should happen after the patch is already merged and the
task is no longer active.

## Preconditions

The runner must stop without deleting local state if any precondition fails:

- the workflow is the BLP git-worktree workflow
- the main BLP worktree is clean
- `docs/harness/runs/**/trace/` is ignored by git
- `docs/harness/runs/<key>/finalize.md` has verdict `completed`
- `docs/harness/runs/<key>/publish/finalize.json` exists and matches the
  finalization artifact hash
- the issue branch is already merged into the main worktree `HEAD`
- the worker worktree has no unexpected residue beyond runner state and
  `docs/harness/runs/<key>/trace/`

## Runner Actions

If all preconditions pass, the runner:

- copies worker-local `docs/harness/runs/<key>/trace/` back into the matching
  ignored path in the main worktree
- snapshots worker-local `runner-state.json` into the ignored trace path when
  it differs from the main worktree copy
- removes the issue worktree
- deletes the merged issue branch
- comments on the Plane item
- archives the Plane item

## Failure Semantics

If cleanup fails, the runner leaves the Plane item unarchived, moves it back to
`Human Review`, and comments with the reason. It must not delete the worker
worktree after a failed precondition.
