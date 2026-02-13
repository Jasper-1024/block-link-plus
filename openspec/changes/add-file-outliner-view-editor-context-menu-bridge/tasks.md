## 1. Spec & Guardrails
- [x] 1.1 Add spec deltas for `file-outliner-view` (editor context menu bridge + allowlist)
- [x] 1.2 Run `openspec validate add-file-outliner-view-editor-context-menu-bridge --strict` and fix all issues
- [x] 1.3 Confirm proposal approval before implementation

## 2. Settings + i18n
- [x] 2.1 Add settings fields + defaults for the outliner editor context menu bridge
- [x] 2.2 Update Settings UI (Outliner tab) to expose toggle + allowlist textarea
- [x] 2.3 Add i18n keys (en/zh/zh-TW) and extend existing i18n tests

## 3. Editor Context Menu Bridge
- [x] 3.1 Add a `contextmenu` handler for the Outliner editor surface
- [x] 3.2 Build a BLP-owned menu: Cut/Copy/Paste/Paste as text + "Copy block as link/embed/url"
- [x] 3.3 Inject whitelisted plugin `editor-menu` items (best-effort; per-handler isolation; stack-based filtering)

## 4. Tests + 9222
- [x] 4.1 Add Jest coverage for stack plugin-id extraction + menu filtering helpers
- [x] 4.2 Add/extend a CDP snippet that asserts the editor context menu bridge entrypoint fires (9222)

## 5. Validation
- [x] 5.1 `npm test`
- [x] 5.2 `npm run build-with-types`
- [x] 5.3 Run relevant CDP snippets (9222):
  - `scripts/cdp-snippets/file-outliner-smoke.js`
  - New snippet(s) added in this change
