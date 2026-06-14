---
name: obsidian-runtime-debug
description: "Diagnose Obsidian Desktop plugin/editor bugs in the live app via Chrome DevTools Protocol (CDP): start or attach to Obsidian, reproduce in a clean note, reset baseline content, run Runtime.evaluate snippets, trace editor text transforms (replaceRange + CM6 transactions), triage plugin vs vendored deps, and turn evidence into regression tests."
---

# Obsidian Runtime Debug

## Overview

Use CDP to interact with a running Obsidian Desktop window and debug problems by observing and instrumenting the real environment (not by guessing from static code).

## Quick Start

### BLP isolated startup

For Block Link Plus in `C:\Users\stati\Git\blp\block-link-plus`, do not wait for the user to start Obsidian manually. Start a disposable isolated Obsidian + CDP environment first:

```powershell
npm run obsidian:debug-env
```

Use the JSON output `port` for later commands:

```powershell
$env:OB_CDP_PORT='<port-from-output>'
$env:OB_CDP_TITLE_CONTAINS=' - blp - '
node scripts/obsidian-cdp.js list
```

The launcher creates a fresh temporary `--user-data-dir`, a fresh debug vault, links `.obsidian/plugins/block-link-plus` to the current repo, enables community plugins through CDP, and verifies `blockLinkPlusLoaded`.

Use the repo CDP client for normal BLP work:

```powershell
node scripts/obsidian-cdp.js eval "app.workspace.getActiveFile()?.path"
node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/<snippet>.js"
```

Fallback only: the bundled PowerShell helpers are portable scripts for environments where the repo Node helper is unavailable. Run them from the repo root by path:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .codex/skills/obsidian-runtime-debug/scripts/cdp_list_targets.ps1 -Port <port-from-output>
```

Evaluate a JS expression in the first matching target (change the regex to match the actual window title):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .codex/skills/obsidian-runtime-debug/scripts/cdp_eval.ps1 `
  -Port <port-from-output> `
  -TargetTitleRegex ' - Note - Obsidian' `
  -Expression 'app.workspace.getActiveFile()?.path'
```

For reusable `Runtime.evaluate` snippets and monkeypatch templates, open `references/snippets.md`.

## Workflow

### 1) Make The Bug Reproducible (In The Live App)

- Prefer a dedicated repro note/file; do not debug in a real daily note.
- Reduce to the smallest input that still breaks; write down exact steps and expected vs actual output.
- Keep the initial text stable (copy/paste the same starting content every run).

### 2) Attach To The Correct Obsidian Target

- Run `node scripts/obsidian-cdp.js list` and pick the target by title. For BLP isolated runs, use `OB_CDP_TITLE_CONTAINS=' - blp - '`.
- If multiple matches exist, refine `-TargetTitleRegex` or use `-WsUrl` directly.

### 3) Observe State Without Mutating It

- Snapshot the document before/after a repro action (text, selection, active file path).
- When debugging text transforms, always log boundary characters around the change (especially `\n`) and offsets/positions.

### 4) Instrument At Runtime (Fastest Way To Find The Responsible Layer)

- Monkeypatch suspicious methods (e.g., editor text APIs) to log args + stack traces.
- Prefer reversible instrumentation: reload the Obsidian window to reset patches.

### 4.5) Trace Editor Text Transforms (When The Bug Is “Text Changed Wrong”)

- Patch `view.editor.replaceRange`/`setValue` to capture call stacks at the Obsidian editor API boundary.
- Patch `view.editor.cm.dispatch` to capture CM6 transaction specs (what change was applied, from where).
- Prefer writing into a global ring buffer (e.g. `window.__cdpTrace`) so you can fetch the trace back via `Runtime.evaluate`.

### 5) Automate UI Actions (Optional)

- If manual repro is flaky, use CDP input events (`Input.dispatchMouseEvent`) to script the interaction.
- Use `node scripts/obsidian-cdp.js call <Method> <JsonParams>` for arbitrary CDP methods. Use the bundled PowerShell `cdp_call.ps1` only as fallback.

### 6) Triage: App/Core vs Plugin vs Vendored Dependency

- Use the live evidence (stack traces + before/after snapshots) to identify which codepath performed the mutation.
- Flip one variable at a time (disable a feature flag, disable a plugin, switch editor mode) to confirm ownership.
- If the stack points into vendored code, prefer: reproduce -> add a regression test -> apply the smallest patch -> leave an upstream reference comment for later sync.

### 7) Turn Findings Into A Fix And A Regression Test (When Coding Starts)

- Encode the minimal repro in a unit/integration test with a small fake host (when real Obsidian APIs are unavailable).
- Add one control test for "normal behavior" so defensive fixes do not introduce new formatting changes.

## Bundled Resources

### scripts/
- `scripts/cdp_list_targets.ps1`: portable fallback to list CDP targets and their `webSocketDebuggerUrl`.
- `scripts/cdp_eval.ps1`: portable fallback to run `Runtime.evaluate` in a selected target.
- `scripts/cdp_call.ps1`: portable fallback to invoke arbitrary CDP methods with JSON params.

### references/
- `references/snippets.md`: ready-to-paste snippets for observing editor state and monkeypatching text APIs.
