# Obsidian CDP Snippets

Use these with:

```powershell
$env:OB_CDP_PORT='<port-from-output>'
node scripts/obsidian-cdp.js eval '<JS HERE>'
```

For multi-line JS, prefer writing a repo snippet and running `eval-file`. If the repo Node helper is unavailable, use the bundled PowerShell fallback:

```powershell
$js = @'
(() => {
  return app.workspace.getActiveFile()?.path;
})()
'@
powershell -NoProfile -ExecutionPolicy Bypass -File .codex/skills/obsidian-runtime-debug/scripts/cdp_eval.ps1 -Port <port-from-output> -TargetTitleRegex 'Obsidian' -Expression $js
```

## Safe Observation

Active file path:

```js
app.workspace.getActiveFile()?.path
```

## Reset / Baseline Helpers (Deterministic Repro Notes)

Open a note by vault path:

```js
(async () => {
  const p = "Review/_blp-ai-workbench.md"; // TODO
  const f = app.vault.getAbstractFileByPath(p);
  if (!f) throw new Error("File not found: " + p);
  await app.workspace.getLeaf(false).openFile(f);
  return app.workspace.getActiveFile()?.path ?? null;
})()
```

Overwrite a note's file content and force the active editor buffer to match:

```js
(async () => {
  const p = "Review/_blp-ai-workbench.md"; // TODO
  const t = "- baseline\n"; // TODO
  let f = app.vault.getAbstractFileByPath(p);
  if (!f) f = await app.vault.create(p, t);
  else await app.vault.modify(f, t);

  await app.workspace.getLeaf(false).openFile(f);
  const v = app.workspace.activeLeaf?.view;
  if (v?.editor?.setValue) v.editor.setValue(t);
  return { path: app.workspace.getActiveFile()?.path ?? null, length: t.length };
})()
```

Dump basic view/editor info:

```js
(() => {
  const leaf = app.workspace.getMostRecentLeaf?.() ?? app.workspace.activeLeaf;
  const view = leaf?.view;
  const editor = view?.editor;
  return {
    viewType: view?.getViewType?.(),
    filePath: view?.file?.path ?? app.workspace.getActiveFile?.()?.path ?? null,
    hasEditor: !!editor,
  };
})()
```

Snapshot editor text and cursor (best-effort; depends on view type):

```js
(() => {
  const leaf = app.workspace.getMostRecentLeaf?.() ?? app.workspace.activeLeaf;
  const editor = leaf?.view?.editor;
  if (!editor) return { ok: false, reason: 'no view.editor' };
  return {
    ok: true,
    cursor: editor.getCursor?.(),
    selection: editor.getSelection?.(),
    value: editor.getValue?.(),
  };
})()
```

## Text Boundary / Newline Debugging

Print char codes around an offset (adjust `i`):

```js
(() => {
  const leaf = app.workspace.getMostRecentLeaf?.() ?? app.workspace.activeLeaf;
  const editor = leaf?.view?.editor;
  const text = editor?.getValue?.() ?? '';
  const i = 100; // TODO
  const start = Math.max(0, i - 20);
  const end = Math.min(text.length, i + 20);
  return {
    start,
    end,
    slice: text.slice(start, end),
    codes: Array.from(text.slice(start, end)).map(c => c.charCodeAt(0)),
  };
})()
```

## Runtime Instrumentation (Monkeypatch)

Patch `replaceRange` to log args + stack (reload window to undo):

```js
(() => {
  const leaf = app.workspace.getMostRecentLeaf?.() ?? app.workspace.activeLeaf;
  const editor = leaf?.view?.editor;
  if (!editor) return 'no view.editor';
  if (editor.__cdpPatchedReplaceRange) return 'already patched';

  editor.__cdpPatchedReplaceRange = true;
  const orig = editor.replaceRange?.bind(editor);
  if (!orig) return 'editor.replaceRange not found';

  editor.replaceRange = function (...args) {
    console.log('[cdp] replaceRange', args);
    console.log('[cdp] stack', new Error().stack);
    return orig(...args);
  };

  return 'patched replaceRange';
})()
```

Patch `setValue` similarly:

```js
(() => {
  const leaf = app.workspace.getMostRecentLeaf?.() ?? app.workspace.activeLeaf;
  const editor = leaf?.view?.editor;
  if (!editor) return 'no view.editor';
  if (editor.__cdpPatchedSetValue) return 'already patched';

  editor.__cdpPatchedSetValue = true;
  const orig = editor.setValue?.bind(editor);
  if (!orig) return 'editor.setValue not found';

  editor.setValue = function (...args) {
    console.log('[cdp] setValue', args);
    console.log('[cdp] stack', new Error().stack);
    return orig(...args);
  };

  return 'patched setValue';
})()
```

## CM6 Transaction Trace (Live Preview)

Patch `view.editor.cm.dispatch` and write a ring-buffer trace to `window.__cdpTrace`:

```js
(() => {
  const leaf = app.workspace.getMostRecentLeaf?.() ?? app.workspace.activeLeaf;
  const cm = leaf?.view?.editor?.cm;
  if (!cm) return { ok: false, reason: "no view.editor.cm (not a CM6 editor?)" };
  if (cm.__cdpPatchedDispatch) return { ok: true, already: true };

  const trace = (window.__cdpTrace = window.__cdpTrace ?? []);
  const push = (kind, payload) => {
    trace.push({ t: new Date().toISOString(), kind, payload });
    if (trace.length > 500) trace.splice(0, trace.length - 500);
  };

  cm.__cdpPatchedDispatch = true;
  const orig = cm.dispatch.bind(cm);
  cm.dispatch = function (...specs) {
    try {
      push("cm.dispatch", specs.map((s) => ({
        changes: s?.changes?.toString?.() ?? null,
        hasSelection: !!s?.selection,
        effects: s?.effects?.length ?? null,
        annotations: s?.annotations?.length ?? null,
      })));
      push("stack", String(new Error().stack || ""));
    } catch {
      // ignore
    }
    return orig(...specs);
  };

  return { ok: true, patched: "cm.dispatch" };
})()
```

Read the last 50 trace entries:

```js
(() => (window.__cdpTrace ?? []).slice(-50))()
```

Clear the trace:

```js
(() => ((window.__cdpTrace = []), "cleared"))()
```

## UI Automation (CDP Input)

Use `node scripts/obsidian-cdp.js call` to invoke methods like `Input.dispatchMouseEvent`. Use `.codex/skills/obsidian-runtime-debug/scripts/cdp_call.ps1` only as fallback.

Example mouse move (coordinates are CSS pixels in the window):

```powershell
$params = '{\"type\":\"mouseMoved\",\"x\":200,\"y\":200,\"button\":\"none\"}'
powershell -NoProfile -ExecutionPolicy Bypass -File .codex/skills/obsidian-runtime-debug/scripts/cdp_call.ps1 `
  -Port <port-from-output> `
  -TargetTitleRegex 'Obsidian' `
  -Method 'Input.dispatchMouseEvent' `
  -ParamsJson $params
```

For drag-and-drop, send a sequence:
- `mousePressed` (left)
- multiple `mouseMoved`
- `mouseReleased` (left)
