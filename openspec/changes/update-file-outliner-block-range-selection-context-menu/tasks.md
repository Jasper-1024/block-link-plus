
## 1. OpenSpec
- [x] 1.1 Add spec delta for block-range selection context menu behavior
- [x] 1.2 Validate openspec change (`openspec.cmd validate update-file-outliner-block-range-selection-context-menu --strict --no-interactive`)

## 2. Implementation
- [x] 2.1 Add root capture `contextmenu` delegation for selected block range
- [x] 2.2 Ensure it does not intercept bullet/editor/embed-editor context menus

## 3. Verification
- [x] 3.1 Add 9222/CDP snippet validating right-click on selected block opens bullet menu
- [x] 3.2 Run `npm test -- --runInBand` and `tsc -noEmit -skipLibCheck`
