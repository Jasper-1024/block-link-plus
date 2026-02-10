# Proposal: update-file-outliner-view-feature-toggles

## Why
The v2 File Outliner View aims to provide a Logseq-like block editing experience, but some affordances (drag-and-drop, zoom navigation, active-block emphasis) can be distracting or undesirable depending on the file/workflow. Users need first-class toggles to enable/disable these behaviors without changing the core file protocol or engine.

## What Changes
- Add Outliner (v2) settings toggles to enable/disable:
  - bullet-handle drag-and-drop
  - bullet-click zoom navigation
  - active block emphasis line/highlight
- Ensure the settings are localized (en/zh/zh-TW) and apply to already-open Outliner View leaves.

## Non-Goals
- No changes to the Outliner v2 file protocol / serialization invariants.
- No persistence changes for zoom/collapse state.

## Impact
- Affected capability: `file-outliner-view`, `settings-configuration`.
- Affected code: `src/types/index.ts`, `src/ui/SettingsTab.ts`, `src/features/file-outliner-view/*`, `src/css/custom-styles.css`, `src/shared/i18n.ts`.
- Backwards compatible: defaults preserve current behavior.

