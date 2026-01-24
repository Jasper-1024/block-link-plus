# Tasks: Embed vslinko Outliner/Zoom as Built-in Modules

## 1. OpenSpec
- [x] 1.1 Update proposal/design/specs for built-in modules
- [x] 1.2 Run `openspec validate add-enhanced-list-blocks-ops-zoom --strict`

## 2. Vendor code + licensing
- [ ] 2.1 Vendor `obsidian-outliner@4.9.0` source + `styles.css`
- [ ] 2.2 Vendor `obsidian-zoom@1.1.2` source + `styles.css`
- [ ] 2.3 Add/refresh MIT notices and license files in `THIRD_PARTY_NOTICES.md` + `third_party/licenses/`

## 3. Integration layer
- [ ] 3.1 Add BLP settings: enable built-in Outliner/Zoom + persist upstream settings
- [ ] 3.2 Implement external-plugin conflict detection and auto-disable built-in modules
- [ ] 3.3 Wire built-in Outliner module (register extensions/commands, apply CSS)
- [ ] 3.4 Wire built-in Zoom module (register extensions/commands, apply CSS, expose `window.ObsidianZoomPlugin`)

## 4. Remove custom Enhanced List Blocks Ops
- [ ] 4.1 Remove BLP custom ops code (zoom/move/indent/dnd/vertical-lines/threading) and related settings UI
- [ ] 4.2 Ensure remaining Enhanced List Blocks features (`blp-view`, id repair, etc) still work

## 5. Tests & validation
- [ ] 5.1 Update/remove tests that covered removed custom ops
- [ ] 5.2 Add smoke tests for built-in module gating (enabled/disabled + conflict)
- [ ] 5.3 Run `npm test`
- [ ] 5.4 Run `npm run build-with-types`
