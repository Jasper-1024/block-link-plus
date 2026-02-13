# Proposal: Remove Built-in (Vendored) vslinko Outliner/Zoom

## Why
- The v2 File Outliner View supersedes the vendored `obsidian-outliner` / `obsidian-zoom` modules for the intended “Logseq-like blocks” workflow.
- Keeping both implementations increases maintenance cost (settings/UI surface, scoping logic, CSS, tests) and creates user confusion about which “outliner/zoom” is active.
- Removing the vendored modules reduces bundle size and eliminates a class of conflicts/interference risk in non-outliner editing surfaces.

## What Changes
- Remove the built-in vslinko integration feature module and all related settings/UI.
- Stop shipping the vendored vslinko source and CSS that only support the built-in modules.
- Keep File Outliner View + `blp-view` + Inline Edit as-is (no behavior change intended there).

## Non-Goals
- No migration/forward-compat guarantee for old built-in-vslinko settings keys (they may remain in saved data but are ignored).
- No changes to File Outliner View behavior, scope rules, or rendering pipeline beyond removing unused dependencies.

## Validation Plan
- `openspec validate remove-built-in-vslinko-plugins --strict`
- `npm test`
- `npm run build`
- Manual smoke (desktop):
  - Settings show `Basics` + `Outliner` tabs only; no “Built-in Plugins” tab.
  - Plugin loads with no console errors; File Outliner View still opens and edits normally.

