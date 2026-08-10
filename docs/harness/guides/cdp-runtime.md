# Runner-owned CDP runtime

The runner allocates one atomic lease per task from ports 19225–19424. A lease
records task identity, port, PID, profile, vault, worktree, root, and status under
`RUNNER_STATE_DIR` (default `%LOCALAPPDATA%\plane-harness`). Different tasks never
share a port; implementation and code review for the same task reuse a validated
runtime.

For `cdp-required`, the root session starts with a ready runtime. Otherwise the
root may call `ensure_runtime({fresh, reason})` on demand. Child workers never
call the launcher or select ports; they inherit `OB_CDP_PORT`, target filters,
task key, and runtime root from the app-server process.

Every reuse validates the process, `/json/list`, task-specific title
`blp-<task-key>`, vault, plugin link, and worktree. Timeout, cleanup failure,
identity mismatch, direct launcher use, or a different explicit port taints the
lease. The runner kills and rebuilds it within the single shared infrastructure
retry budget. A second failure routes to `Automation Error`.

`Human Review` and `Ready to Merge` retain a valid runtime for two hours. Done
or archive cleanup releases it immediately; expired leases are cleaned during a
later runner scan. Manual usage belongs in [../../runtime/obsidian-cdp.md](../../runtime/obsidian-cdp.md).
