# Runner-owned CDP runtime

The runner allocates one persistent lease per unfinished task from ports
19225–19424. A lease records task identity, port, PID, profile, vault,
worktree, root, and status under `RUNNER_STATE_DIR` (default
`%LOCALAPPDATA%\plane-harness`). Different tasks never share a port; all
implementation, review, and revision turns of the same task reuse its lease.

For `cdp-required`, the root session starts with a ready runtime. Otherwise the
root may call `ensure_runtime({fresh, reason})` on demand. Child workers never
call the launcher or select ports. They inherit `BLP_RUNTIME_LEASE_FILE` as well
as the initial CDP environment; `scripts/obsidian-cdp.js` reads the lease file so
it follows a same-task recovery/reallocation even when inherited `OB_CDP_PORT`
is stale. `fresh` is a compatibility/recovery hint, not authority to kill or
replace an identity-matching runtime.

Every ordinary reuse requires exactly one CDP target with an unambiguous
`blp-<task-key>` title boundary, then checks vault, plugin link, and worktree. A
cleanup failure records a task-local scene mutation and invalidates that test
evidence, but does not consume infrastructure retry budget or rebuild the
instance. A timeout, missing/wrong identity, direct launcher use, or unsafe
explicit port is a runtime failure; a foreign owner of the leased port is left
untouched and this task is allocated a new isolated port.

Leases are released when the work item reaches Done, Cancelled, or archive cleanup;
`Human Review`, `Ready to Merge`, and revision states retain the same runtime.
Manual usage belongs in [../../runtime/obsidian-cdp.md](../../runtime/obsidian-cdp.md).
