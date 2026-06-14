---
name: blp-enhanced-list-ui-debug
description: Debug Obsidian Live Preview list UX issues in Block Link Plus (BLP) Enhanced List Blocks and vendored vslinko outliner/zoom (handles, vertical lines, active connector, code block indentation).
---

# BLP Enhanced List UI Debug

Debug UI/UX issues in Obsidian Live Preview (CM6) for Block Link Plus Enhanced List Blocks and the vendored vslinko outliner/zoom (vertical lines, folding/drag handles, nested code blocks).

## Quick Checklist

- Start the isolated BLP Obsidian runtime using the `obsidian-runtime-debug` skill. In this repo, the default entrypoint is `npm run obsidian:debug-env`.
- Use the returned JSON `port` as `OB_CDP_PORT` for all CDP probes.
- Reproduce in Obsidian with Live Preview enabled.
- Confirm the file is in Enhanced List scope (BLP settings).
- Confirm the editor DOM has expected classes (e.g. `.blp-enhanced-list-handle`, `.blp-vslinko-scope` when scoped).
- Capture: screenshot + minimal markdown snippet + relevant DOM snippet (active list line).
- Run the DevTools snippets in `references/devtools-snippets.md` before changing code.

## Change Map (Own The UX Layer)

- Handle visuals (dot/hover/active, hit target): `src/css/custom-styles.css`
- Handle actions (fold/menu, suppress after DnD): `src/features/enhanced-list-blocks/handle-actions-extension.ts`
- Enhanced List scope gating (folders/files): `src/features/enhanced-list-blocks/enable-scope.ts`
- Nested fenced code block indentation: `src/features/enhanced-list-blocks/codeblock-indent-extension.ts`
- Vendored outliner CSS (vertical line style): `src/css/vendor-obsidian-outliner.css`
- Vendored outliner layout/overlay math: `src/vendor/vslinko/obsidian-outliner/features/VerticalLines.ts`
- Built-in vslinko scope toggling: `src/features/built-in-vslinko/scope-extension.ts`
- Project-level CDP regression scripts: `scripts/cdp-snippets`

(Keep this map lean; add new entries only when they are reliably used.)

## Debug Workflow

1. Confirm scope and state

- Check BLP settings: Enhanced List enabled files/folders; built-in vslinko scope toggle; outliner vertical lines enabled.
- In DevTools console: run `dumpBlpListState()` (see `references/devtools-snippets.md`).

2. Measure mismatch before edits

- For vertical lines: compare bullet center X with the nearest `.outliner-plugin-list-line` X at the same Y.
- For handles: verify the clickable area and the visual anchor are the same element.
- For code blocks: compare code container left edge vs list content start.

3. Fix at the lowest layer that owns the problem

- Prefer CSS-only fixes when the problem is purely visual.
- If an overlay is mispositioned, fix coordinate space math (scrollLeft, content padding, file margins) in the overlay owner (vendored VerticalLines).
- If text layout is wrong, prefer CodeMirror decorations (avoid DOM surgery; keep pos<->DOM mapping stable).

4. Validate fast

- From the repo root: `npm test` then `npm run build`.
- Reload the plugin in Obsidian and rerun the measurement snippet.
- Compare screenshots; do not trust "looks OK" without re-measuring.
- For CDP automation: set `OB_CDP_PORT` from the isolated launcher, then run `node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/<snippet>.js"`.

## Pitfalls / Heuristics

- Avoid hard-coded pixel shifts that depend on theme/font/zoom; prefer measuring and storing a CSS variable when possible.
- Overlay coordinate space: align to the CM6 content start, not the gutter (account for `scrollLeft` + content padding).
- Drag vs click: vslinko sets `body.outliner-plugin-dragging`; suppress click actions immediately after a drag gesture.

## References

- `references/file-map.md`: file map + selectors to search
- `references/devtools-snippets.md`: console snippets to measure geometry and dump state
