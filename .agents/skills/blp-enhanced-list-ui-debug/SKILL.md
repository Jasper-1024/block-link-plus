---
name: blp-enhanced-list-ui-debug
description: Debug Block Link Plus Enhanced List, File Outliner, inline-edit, list geometry, selection, and navigation behavior in a live isolated Obsidian runtime.
---

# BLP Enhanced List UI Debug

Use the `blp-obsidian-runtime` skill first. Capture a minimal note, expected and
actual behavior, screenshot, relevant DOM, and measured geometry before editing.

Ownership map:

- visuals and hit targets: `src/css/custom-styles.css`
- handle actions: `src/features/enhanced-list-blocks/handle-actions-extension.ts`
- scope: `src/features/enhanced-list-blocks/enable-scope.ts`
- fenced-code indentation: `src/features/enhanced-list-blocks/codeblock-indent-extension.ts`
- vendored line CSS: `src/css/vendor-obsidian-outliner.css`
- overlay geometry: `src/vendor/vslinko/obsidian-outliner/features/VerticalLines.ts`
- built-in scope: `src/features/built-in-vslinko/scope-extension.ts`

Prefer measured coordinate-space fixes over theme-specific pixel offsets. Keep
CodeMirror position/DOM mapping intact. Validate targeted tests, type/build, the
catalogued CDP regression, cleanup, and a screenshot comparison.
