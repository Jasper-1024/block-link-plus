---
name: blp-obsidian-runtime
description: Use the runner-owned isolated Obsidian/CDP runtime to reproduce, inspect, and validate Block Link Plus behavior. Use for BLP runtime evidence, CDP snippets, screenshots, live editor state, and cdp-required work.
---

# BLP Obsidian Runtime

Use only the task runtime selected by the runner. Read `OB_CDP_PORT`,
`OB_CDP_TITLE_CONTAINS`, `BLP_RUNTIME_TASK_KEY`, and `BLP_RUNTIME_ROOT` from the
inherited environment. Never scan ports, choose 9222, launch Obsidian directly,
or change the port. Only the root coordinator may call `ensure_runtime`; child
workers use the inherited environment.

Use `node scripts/obsidian-cdp.js catalog list` to choose a maintained snippet,
then run the client without overriding the lease:

```powershell
node scripts/obsidian-cdp.js list
node scripts/obsidian-cdp.js eval "app.workspace.getActiveFile()?.path"
node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/<path>.js"
```

Treat `BLP_CDP_EVENT` `slow` as a progress signal. A `timeout`, ambiguous target,
wrong identity, cleanup failure, or direct launcher attempt taints the runtime;
report it to the root coordinator and stop using that instance. Stable
regressions must return the contract documented in `docs/runtime/obsidian-cdp.md`.

For manual debugging outside the harness, allocate the port yourself and pass
it explicitly, commonly `-Port 9222` / `--port 9222`. See
`docs/runtime/obsidian-cdp.md`. For harness lease ownership and retention, see
`docs/harness/guides/cdp-runtime.md`.
