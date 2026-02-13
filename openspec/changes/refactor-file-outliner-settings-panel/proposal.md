# Proposal: refactor-file-outliner-settings-panel

## Why
The File Outliner (v2) settings have grown enough that the current UI is hard to use:
- Scope configuration is edited as multi-line textareas, which is error-prone and not discoverable.
- The editor context menu plugin allowlist is also a textarea, but users typically want to pick from installed plugins.
- Behavior settings are presented as a long flat list with only one grouping heading.

## What Changes
- Replace the Outliner scope textareas with list-based editors:
  - Enabled folders: add/remove/reorder rows with folder path suggestions.
  - Enabled files: add/remove/reorder rows with file path suggestions.
- Replace the editor context menu allowlist textarea with a list-based editor:
  - Add/remove/reorder rows with plugin id suggestions (installed plugin ids + `core`).
- Re-group Outliner settings into more focused headings so the panel is scannable.

## Impact
- No settings schema or on-disk format change (arrays remain arrays).
- Existing settings values continue to work; only the UI editing surface changes.
