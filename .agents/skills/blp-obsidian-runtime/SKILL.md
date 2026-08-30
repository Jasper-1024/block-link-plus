---
name: blp-obsidian-runtime
description: Use the runner-owned isolated Obsidian/CDP runtime to reproduce, inspect, and validate Block Link Plus behavior. Use for BLP runtime evidence, CDP snippets, screenshots, live editor state, and cdp-required work.
---

# BLP Obsidian Runtime

Use only the task runtime selected by the runner. Read `OB_CDP_PORT`,
`OB_CDP_TITLE_CONTAINS`, `BLP_RUNTIME_TASK_KEY`, and `BLP_RUNTIME_ROOT` from the
inherited environment. Never scan ports, choose 9222, or launch Obsidian
directly. Only the root coordinator may call `ensure_runtime`.

The inherited environment is the task runtime context at turn start. A successful
root `ensure_runtime` response is authoritative for the rest of that turn: if it
returns a different port/environment after recovering the same task runtime, the
root must use that returned context and pass it explicitly to any child doing CDP
work. Children never call `ensure_runtime` or choose a port themselves.

Use `node scripts/obsidian-cdp.js catalog list` to choose a maintained snippet.
Normally run the client without a port override:

```powershell
node scripts/obsidian-cdp.js list
node scripts/obsidian-cdp.js eval "app.workspace.getActiveFile()?.path"
node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/<path>.js"
```

Only after `ensure_runtime` returns a replacement context may the root pass that
returned port explicitly, for example `node scripts/obsidian-cdp.js --port
<returned-port> list`.

Treat `BLP_CDP_EVENT` `slow` as a progress signal. A cleanup failure means the
**task-local** vault/layout/settings scene was changed; record that fact in the
stage evidence and continue to use the same task runtime. A timeout, ambiguous
target, wrong identity, or direct launcher attempt makes the runtime unsafe;
report it to the root coordinator and stop using that instance. Stable
regressions must return the contract documented in `docs/runtime/obsidian-cdp.md`.

For manual debugging outside the harness, allocate the port yourself and pass
it explicitly, commonly `-Port 9222` / `--port 9222`. See
`docs/runtime/obsidian-cdp.md`. For harness lease ownership and retention, see
`docs/harness/guides/cdp-runtime.md`.
