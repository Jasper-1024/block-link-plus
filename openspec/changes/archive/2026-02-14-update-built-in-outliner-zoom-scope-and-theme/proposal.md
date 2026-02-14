# Proposal: Update Built-in Outliner/Zoom Scope and Theme Support

## Why
- Enhanced List Blocks is opt-in and file-scoped, but the vendored built-in `obsidian-outliner` / `obsidian-zoom` modules currently affect all editors once enabled. This creates surprises in non-enabled notes (global styles, global event interception).
- Upstream outliner disables some list visuals (better list styles, vertical lines) when a community theme is enabled, which blocks the intended "outliner" experience for most theme setups.

## What Changes
- Add an option to scope built-in Outliner/Zoom list interactions + styling to Enhanced List Blocks enabled files (Live Preview only).
- Apply vendored list CSS only within scoped editors (no global visual impact in non-enabled files).
- Remove default-theme gating for vendored list visuals so they work with community themes (using Obsidian CSS variables).

## Non-Goals
- Perfect parity across every theme; visuals may still vary by theme.
- Replacing upstream outliner/zoom logic; this change is a small, targeted patch for scope + theme.

## Validation Plan
- `openspec.cmd validate update-built-in-outliner-zoom-scope-and-theme --strict --no-interactive`
- `npm.cmd test -- --runInBand`
- `npm.cmd run build-with-types`
- Manual smoke (desktop):
  - In an Enhanced List enabled file, click-to-zoom / dnd / vertical lines work.
  - In a non-enabled file, these features do not intercept clicks/drags and do not add list styling.
  - With a non-default theme enabled, list visuals still render (if toggled on in settings).

