## Constraints (Architecture)

- Outliner block editor remains a standalone CM6 editor ("minimal bridge"): no import of the native Markdown editor extension stack.
- Compatibility scope is limited to Obsidian command/editorCallback based shortcuts.
- Changes must be scoped: do not globally change command behavior outside Outliner block editing.

## Design Overview

### A) Active Editor Bridge (Scoped)

During Outliner block editing, we temporarily provide `app.workspace.activeEditor`:

- `activeEditor.editor` is an adapter backed by Outliner CM6 `EditorView`.
  - Reuse/extend the existing `OutlinerSuggestEditor` (already used for EditorSuggest + editor-menu injection) as the adapter.
- `activeEditor.getMode()` returns `"source"` so core editor commands treat it as source mode.
- The bridged object is marked (e.g. `__blpFileOutlinerBridge = true`) so other code can detect the scope.

The bridge is only active when:
- Outliner is the active leaf
- a block is currently in edit mode
- the Outliner editor host is visible

The bridge is removed when exiting edit mode / losing Outliner edit context.

### B) Strict Allowlist Gate (Editor Commands Only)

To avoid "everything suddenly works" (and potentially breaks), we enforce a strict allowlist:

- Patch `app.commands.executeCommand` (via `monkey-around`) with a wrapper that:
  - Checks whether the current `workspace.activeEditor` is the Outliner bridge
  - If not, delegates to the original command execution immediately
  - If yes, and the command is an editor command, enforces allowlist:
    - Determine owner plugin id from `command.id` prefix (before `:`)
    - If the prefix matches an installed plugin id, treat it as that plugin
    - Otherwise treat as `core`
    - Block if owner id is not allowlisted
  - Non-editor commands are not gated (avoid breaking general commands while Outliner is open)

This makes the feature opt-in and predictable:
- `core` enablement controls core editor shortcuts
- per-plugin enablement controls plugin editor shortcuts

### C) Settings Model

Keep context menu allowlist separate from command allowlist:
- `fileOutlinerEditorContextMenuAllowedPlugins` (existing)
- `fileOutlinerEditorCommandAllowedPlugins` (new)

Add a Settings UI action:
- "Copy from editor menu allowlist" button to set `fileOutlinerEditorCommandAllowedPlugins` to the menu allowlist value
- A short warning text: only command/editorCallback plugins are supported; CM6-injection plugins are not

## Testing Strategy

- Unit tests:
  - normalize/parse allowlist
  - command owner attribution
  - gate decision matrix (bridge active/inactive, editor command/non-editor, allowlisted/not)
- 9222/CDP regression snippet:
  - Create a temp outliner note
  - Enter edit mode
  - Verify `editor:toggle-bold` works with `core` allowed
  - Install a synthetic editor command with id `fake-plugin:do` and verify:
    - blocked when not allowlisted
    - allowed after adding `fake-plugin` to allowlist

