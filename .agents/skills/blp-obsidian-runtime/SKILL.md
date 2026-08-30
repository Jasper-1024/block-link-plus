---
name: blp-obsidian-runtime
description: Use the runner-owned isolated Obsidian/CDP runtime to reproduce, inspect, and validate Block Link Plus behavior. Use for BLP runtime evidence, CDP snippets, screenshots, live editor state, and cdp-required work.
---

# BLP Obsidian Runtime

Use only the task runtime selected by the runner. Read `OB_CDP_PORT`,
`OB_CDP_TITLE_CONTAINS`, `BLP_RUNTIME_TASK_KEY`, `BLP_RUNTIME_ROOT`, and
`BLP_RUNTIME_LEASE_FILE` from the inherited environment. Never scan ports,
choose 9222, or launch Obsidian directly. Only the root coordinator may call
`ensure_runtime`.

`BLP_RUNTIME_LEASE_FILE` is the authoritative, persistent task context. The CDP
client reads its current port automatically, so a same-task recovery/reallocation
is visible to the root and all children even when their inherited `OB_CDP_PORT`
is stale. Do not pass `--port` in normal runner work. Children never call
`ensure_runtime` or choose a port themselves.

Use `node scripts/obsidian-cdp.js catalog list` to choose a maintained snippet.
Normally run the client without a port override:

```powershell
node scripts/obsidian-cdp.js list
node scripts/obsidian-cdp.js eval "app.workspace.getActiveFile()?.path"
node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/<path>.js"
```

Use an explicit `--port` only for manual debugging outside the harness, or when deliberately overriding the task runtime.


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
