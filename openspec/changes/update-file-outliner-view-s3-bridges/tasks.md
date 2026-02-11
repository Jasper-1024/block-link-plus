## 1. Spec & Guardrails
- [x] 1.1 Add spec deltas for `file-outliner-view` (S3 suggest bridging + embed DOM normalize)
- [x] 1.2 Run `openspec validate update-file-outliner-view-s3-bridges --strict` and fix all issues
- [x] 1.3 Confirm proposal approval before implementation

## 2. Embed DOM Normalize (Outliner display)
- [ ] 2.1 Add a renderer post-pass that normalizes internal markdown embeds to include `.markdown-embed-content`
- [ ] 2.2 Add Jest coverage for the DOM normalize helper (pure function over a jsdom tree)
- [ ] 2.3 Add/extend a CDP snippet that asserts `![[file#^id-id]]` renders multiple lines in outliner display (9222)

## 3. EditorSuggest Bridging (Outliner editor)
- [ ] 3.1 Implement a minimal editor wrapper for the outliner CM6 view (`coordsAtPos/getLine/posAtCoords/containerEl.win/hasFocus`)
- [ ] 3.2 Bridge `workspace.editorSuggest` for `[[` and `/` triggers (no full CM6 stack copy)
- [ ] 3.3 Add CDP snippet coverage to verify link suggest + slash suggest show in outliner editor (9222)

## 4. Validation
- [ ] 4.1 `npm test`
- [ ] 4.2 `npm run build-with-types`
- [ ] 4.3 Run relevant CDP snippets (9222):
  - `scripts/cdp-snippets/file-outliner-smoke.js`
  - `scripts/cdp-snippets/file-outliner-inline-embed-hide-system-lines.js`
  - `scripts/cdp-snippets/file-outliner-inline-embed-routing.js`
  - New snippets added in this change
