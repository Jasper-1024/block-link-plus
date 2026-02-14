## 1. Spec & Guardrails
- [x] 1.1 Add spec deltas for `file-outliner-view` (insert/fold/zoom/context menu/callout normalization)
- [x] 1.2 Run `openspec validate update-file-outliner-view-logseq-affordances --strict` and fix all issues
- [x] 1.3 Confirm proposal approval before implementation

## 2. Engine Ops (Functional Core)
- [x] 2.1 Add engine op: insert new sibling block after a target block id
- [x] 2.2 Add engine op: delete a block subtree (with sensible focus fallback)
- [x] 2.3 Add unit tests for new engine ops

## 3. Clipboard Serialization (Subtree Copy/Cut)
- [x] 3.1 Add a protocol-level helper to serialize a block subtree to Markdown list text without system tail lines
- [x] 3.2 Add unit tests for clipboard serialization (escape rules, nested blocks, fenced code)

## 4. View UX (Logseq-like Affordances)
- [x] 4.1 Add ephemeral fold state + fold toggle UI for blocks with children
- [x] 4.2 Add zoom state + minimal zoom header/back control; bullet left-click zooms into subtree
- [x] 4.3 Add bullet context menu with the requested actions (copy ref/embed/url, copy/cut/delete, collapse/expand)
- [x] 4.4 Add mouse insert affordance ("new block here") and wire to the engine insert op
- [x] 4.5 Update outliner CDP smoke snippet(s) to reflect the new bullet semantics and cover fold/zoom/menu basics

## 5. Styling
- [x] 5.1 Normalize callout margins inside `.blp-file-outliner-display` to remove extra vertical spacing
- [x] 5.2 Add scoped CSS for fold toggle, insert affordance, and zoom header (theme-aware)

## 6. Validation
- [x] 6.1 `npm test`
- [x] 6.2 `npm run build-with-types`
- [x] 6.3 Manual verification via 9222/9221 + screenshots (hover affordances, fold, zoom, menu)
