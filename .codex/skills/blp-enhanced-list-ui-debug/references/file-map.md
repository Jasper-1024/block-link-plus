# BLP Enhanced List UI Debug - File Map

This is a quick "where to look" map for UI debugging. Prefer `rg` over manual browsing.

## Main Areas

### Enhanced List Blocks

- `src/features/enhanced-list-blocks/`
- Scope gating: `enable-scope.ts`
- Handle UX:
  - Affordance (CSS class toggling): `handle-affordance-extension.ts`
  - Actions (click/contextmenu + DnD suppression): `handle-actions-extension.ts`
- System line mechanics:
  - Auto create/hide: `auto-system-line-extension.ts`, `hide-system-line-extension.ts`
  - Block id repair: `duplicate-id-repair.ts`
- Nested code block indentation: `codeblock-indent-extension.ts`

### Vendored vslinko Outliner/Zoom (Built-In)

- Outliner features: `src/vendor/vslinko/obsidian-outliner/features/`
  - Vertical lines overlay + geometry: `VerticalLines.ts`
  - Drag/drop: `DragAndDrop.ts`
  - Better list styles: `BetterListsStyles.ts`
- Outliner parser: `src/vendor/vslinko/obsidian-outliner/services/Parser.ts`
- Zoom: `src/vendor/vslinko/obsidian-zoom/`

### BLP Integration / Scoping

- Built-in feature gating: `src/features/built-in-vslinko/`
  - Scope extension (adds `.blp-vslinko-scope`): `scope-extension.ts`
  - Enable/disable + external conflict: `gating.ts`, `index.ts`
- Scope helper: `src/vendor/vslinko/blp-scope.ts`

## CSS

- Handle visuals, hover/active styling, editor-only tweaks:
  - `src/css/custom-styles.css`
- Vendored outliner CSS (vertical lines appearance + overlay container):
  - `src/css/vendor-obsidian-outliner.css`
- Vendored zoom CSS:
  - `src/css/vendor-obsidian-zoom.css`

## Useful Search Patterns

- Handle selectors: `cm-formatting-list-ul`, `blp-enhanced-list-handle`, `list-bullet::after`
- Outliner overlay: `outliner-plugin-list-line`, `outliner-plugin-list-lines-scroller`, `contentContainer.style.marginLeft`
- Active line: `cm-line.cm-active.HyperMD-list-line`
- Code blocks: `HyperMD-codeblock`, `FENCE_LINE_REGEX`, `blp-enhanced-list-codeblock-indented`
