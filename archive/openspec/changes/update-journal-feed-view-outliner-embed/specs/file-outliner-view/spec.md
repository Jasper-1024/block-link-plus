# file-outliner-view Specification (Delta)

## ADDED Requirements

### Requirement: Outliner active editor bridge is focus-based (embedded-safe)

When editing a block in File Outliner View, the plugin MUST keep an `activeEditor` bridge installed while the outliner editor is focused (best-effort), even if the outliner view is hosted inside a detached leaf (e.g. Journal Feed).

At minimum:
- When the outliner block editor has focus, `workspace.activeEditor.editor` MUST refer to the Outliner Suggest Editor instance.
- When focus leaves the outliner editor, the bridge MUST be uninstalled/restored.

#### Scenario: Embedded outliner editor can open link suggest on `[[`
- **GIVEN** an outliner-enabled file is mounted inside Journal Feed using File Outliner View
- **AND** the user enters edit mode and focuses the outliner editor
- **WHEN** the user types `[[`
- **THEN** the Obsidian link/file suggestion UI opens

