# Proposal: add-file-outliner-view-editor-context-menu-bridge

## Why
The Outliner block editor currently falls back to a minimal OS/Electron context menu (Cut/Copy/Paste only). This breaks key Obsidian workflows inside scoped Outliner files:
- Users lose important context menu actions provided by selected plugins (e.g. Metadata Menu, Highlightr).
- BLP's own "Copy block as link/embed/url" semantics conflict with Outliner expectations (the current block id MUST be the stable reference; selection is only alias text).

## What Changes
- Add an Outliner "editor context menu bridge" that replaces the default editor right-click menu while editing a block.
- The menu provides:
  - Basic clipboard actions (Cut/Copy/Paste/Paste as text)
  - BLP block-copy actions that always use the current block id (selection is alias only)
  - Optional injection of `editor-menu` items from a user-defined allowlist of plugin ids (best-effort)
- Add settings (Outliner tab) for enabling the bridge and configuring the plugin allowlist.

## Impact
- No on-disk format change.
- Menu injection uses non-public details as a best-effort bridge (`workspace._["editor-menu"]` handlers + stack-based plugin id attribution), guarded behind an explicit allowlist.

