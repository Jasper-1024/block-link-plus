# Tasks: Add Enhanced List Blocks Ops (Zoom/Outliner UI)

## 1. OpenSpec
- [x] 1.1 Finalize settings + behavior requirements in spec
- [x] 1.2 Run `openspec validate add-enhanced-list-blocks-ops-zoom --strict`

## 2. Enable scope + conflicts
- [x] 2.1 Reuse enable-scope gate (folders/files/frontmatter `blp_enhanced_list: true`)
- [x] 2.2 Detect conflicts with `obsidian-zoom` / `obsidian-outliner` and refuse enabling corresponding BLP modules

## 3. Zoom
- [x] 3.1 Implement zoom-in/out for current list subtree (Live Preview)
- [ ] 3.2 (Optional) Breadcrumbs header in zoom mode

## 4. Subtree ops (current file)
- [x] 4.1 Move subtree up/down commands
- [x] 4.2 Indent/outdent subtree commands (toggleable)

## 5. Drag and Drop (current file)
- [x] 5.1 Drag subtree by bullet area
- [x] 5.2 Drop zones + reorder within lists

## 6. UI (toggleable)
- [x] 6.1 Vertical indentation lines (scoped to enabled files)
- [x] 6.2 Bullet threading (highlight active block path)

## 7. Tests
- [x] 7.1 Ops + zoom range tests
- [x] 7.2 Scope/conflict tests
