# CDP Script Inventory

This inventory classifies CDP scripts for agent use. See
[isolated-obsidian-cdp.md](isolated-obsidian-cdp.md) for runtime setup.

## Stable Project-Level Entrypoints

Keep these in `scripts/` because they are used across BLP runtime debugging,
issue validation, and release verification:

- `scripts/start-obsidian-debug-env.ps1`: starts a fresh isolated Obsidian
  profile and debug vault, links the current repo as the plugin, enables
  community plugins, and prints the CDP context.
- `scripts/obsidian-cdp.js`: default CDP client for BLP work.
- `scripts/cdp-screenshot-pair.js`: project visual-regression helper.

## Current Regression Snippets

Keep reusable project-level runtime checks in `scripts/cdp-snippets/`. Each
snippet should include a scenario header and a current
`node scripts/obsidian-cdp.js eval-file ...` command.

Use these when the issue matches the feature area:

- Inline edit embeds:
  - `inline-edit-embed-bottom-padding.js`
  - `inline-edit-embed-jump-affordance.js`
- File outliner regressions:
  - `file-outliner-arrow-nav-e2e.js`
  - `file-outliner-arrow-nav-scope.js`
  - `file-outliner-block-range-selection.js`
  - `file-outliner-block-range-selection-context-menu.js`
  - `file-outliner-focus-and-scroll-regression.js`
  - `file-outliner-inline-embed-hide-system-lines.js`
  - `file-outliner-inline-embed-routing.js`
  - `file-outliner-search-line-jump.js`
  - `file-outliner-tab-shift-tab-order-regression.js`
  - `file-outliner-task-commands-and-menu.js`
  - `file-outliner-task-single-line.js`
  - `file-outliner-view-embed-inline-edit.js`
  - `file-outliner-view-internal-link-navigation.js`
- Journal feed regressions:
  - `journal-feed-mobile-embedded-layout.js`
  - `journal-feed-subfolder-smoke.js`
  - `journal-feed-systemline-hide-smoke.js`

## Broad Smoke Snippets

Broad smoke scripts exercise a feature area and may expose current product
issues. Do not treat them as release gates unless they pass in the current debug
environment and the run scope says they are required.

- `file-outliner-smoke.js`
- `file-outliner-drag-drop.js`
- `file-outliner-editor-command-bridge.js`
- `file-outliner-editor-context-menu-bridge.js`
- `file-outliner-editor-suggest.js`
- `file-outliner-feature-toggles.js`
- `file-outliner-lazy-display-render.js`
- `file-outliner-open-as-toggle.js`
- `file-outliner-open-source-view.js`
- `file-outliner-paste-and-task-shortcuts.js`
- `file-outliner-reading-range-embed.js`
- `file-outliner-tasks-and-validation.js`
- `file-outliner-ux-1234.js`
- `journal-feed-view-smoke.js`
- `journal-feed-view-proto-check.js`

## Current Debug Probes

Use these for investigation when their names match the symptom. Promote them to
regression snippets only after they become repeatable assertions.

- `debug-inline-edit-system-line.js`
- `debug-outliner-embed-dom.js`
- `debug-outliner-newline-render.js`
- `file-outliner-fence-systemline-repro.js`

## Inline Edit And GitHub #33

GitHub #33 is a cluster. Treat each symptom as a sub-bug before planning a fix.

- Stable #33-related regression:
  - `inline-edit-embed-bottom-padding.js`
- Adjacent inline-edit regression that must not be broken:
  - `inline-edit-embed-jump-affordance.js`
- Useful probes when the symptom mentions system lines or embed DOM:
  - `debug-inline-edit-system-line.js`
  - `debug-outliner-embed-dom.js`

For inline-edit fixes, validate both the targeted symptom and the adjacent jump
affordance when practical.

## Skill-Owned Resources

Keep skill-specific knowledge under `.codex/skills/<skill>/`.

- `obsidian-runtime-debug/scripts/cdp_*.ps1`: portable fallback CDP helpers, not
  the default BLP repo entrypoint.
- `obsidian-runtime-debug/references/snippets.md`: generic Runtime.evaluate and
  instrumentation snippets.
- `blp-enhanced-list-ui-debug/references/*`: Enhanced List file map, selectors,
  and measurement snippets.

If a future script only measures Enhanced List handles, vertical lines, or scoped
Live Preview list geometry, place it under
`.codex/skills/blp-enhanced-list-ui-debug/scripts/` instead of the project-level
`scripts/cdp-snippets/` folder.

## Archive / Scratch Snippets

Keep historical one-off probes under `scripts/cdp-snippets/archive/`.

- `archive/tmp-imported/`: imported scratch snippets from older investigations.
- `archive/outliner-editor-investigation/`: focused investigation probes that
  are not part of the default regression set.

Archived scripts may remain runnable, but they are not part of the standard
validation surface unless a current investigation explicitly names them.
