# CDP Script Inventory

This inventory defines where CDP-related scripts should live.

## Project-Level Entrypoints

Keep these in `scripts/` because they are used across BLP runtime debugging,
issue validation, and release verification:

- `scripts/start-obsidian-debug-env.ps1`: starts a fresh isolated Obsidian profile and debug vault, links the current repo as the plugin, enables community plugins, and prints the CDP context.
- `scripts/obsidian-cdp.js`: default CDP client for BLP work.
- `scripts/cdp-screenshot-pair.js`: project visual-regression helper.

## Project Runtime Snippets

Keep project-level runtime checks in `scripts/cdp-snippets/`. These snippets
should have a header describing the scenario and a current
`node scripts/obsidian-cdp.js eval-file ...` command.

Broad smoke scripts may expose current product issues and should not be treated
as release gates unless they pass in the current debug environment.

Examples:

- `inline-edit-embed-bottom-padding.js`
- `inline-edit-embed-jump-affordance.js`
- `journal-feed-view-smoke.js`
- `journal-feed-subfolder-smoke.js`
- `journal-feed-systemline-hide-smoke.js`

Broad smoke examples:

- `file-outliner-smoke.js`

## Skill-Owned Resources

Keep skill-specific knowledge under `.codex/skills/<skill>/`.

- `obsidian-runtime-debug/scripts/cdp_*.ps1`: portable fallback CDP helpers, not the default BLP repo entrypoint.
- `obsidian-runtime-debug/references/snippets.md`: generic Runtime.evaluate and instrumentation snippets.
- `blp-enhanced-list-ui-debug/references/*`: Enhanced List file map, selectors, and measurement snippets.

If a future script only measures Enhanced List handles, vertical lines, or scoped
Live Preview list geometry, place it under
`.codex/skills/blp-enhanced-list-ui-debug/scripts/` instead of the project-level
`scripts/cdp-snippets/` folder.

## Archive

Keep historical one-off probes under `scripts/cdp-snippets/archive/`.

- `archive/tmp-imported/`: imported scratch snippets from older investigations.
- `archive/outliner-editor-investigation/`: focused investigation probes that are not part of the default regression set.

Archived scripts may remain runnable, but they are not part of the standard
validation surface unless a current investigation explicitly names them.
