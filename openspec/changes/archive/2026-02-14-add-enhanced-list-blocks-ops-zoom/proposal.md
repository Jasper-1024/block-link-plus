# Proposal: Embed vslinko Outliner/Zoom as Built-in Modules

## Summary
This change replaces BLP’s custom “Enhanced List Blocks Ops” implementation with **vendored, built-in** copies of vslinko’s plugins:

- `obsidian-outliner` (`4.9.0`)
- `obsidian-zoom` (`1.1.2`)

Users only install/enable **BLP**, then can toggle “Built-in Outliner” / “Built-in Zoom” inside BLP settings. Behavior SHOULD remain as close to upstream as possible (original commands, key overrides, drag-and-drop, vertical lines, zoom UI/guardrails, etc.).

To avoid double-registration and unpredictable behavior:
- If the external `obsidian-outliner` plugin is enabled, BLP MUST default-disable the built-in Outliner module.
- If the external `obsidian-zoom` plugin is enabled, BLP MUST default-disable the built-in Zoom module.

## Why
- BLP’s reimplementation diverged significantly from upstream outliner/zoom behavior; keeping parity is costly.
- Vendoring allows us to reuse mature logic and then fix bugs locally even if upstream is slow to merge.
- Users get “install one plugin, enable what you need” without chasing multiple plugin dependencies.

## Goals
- Provide built-in Outliner/Zoom modules that are as close to upstream as practical.
- Keep MIT notices/licenses intact and visible in this repository.
- Allow enabling/disabling built-in modules via BLP settings.
- Auto-disable built-in modules when the corresponding external plugin is enabled.
- Remove the custom Enhanced List Blocks Ops implementation (zoom/move/indent/dnd/vertical-lines/threading) to avoid duplicate behavior.

## Non-Goals
- 1:1 perfection across all themes (upstream itself has theme constraints).
- Fixing upstream bugs as part of the first integration pass (bugfixes come after “as-is” integration is verified).

## Validation Plan
- Ensure `npm test` passes.
- Ensure `npm run build-with-types` passes.
- Ensure `openspec validate add-enhanced-list-blocks-ops-zoom --strict` passes.
