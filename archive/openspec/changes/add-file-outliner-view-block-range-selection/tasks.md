
## 1. OpenSpec
- [x] 1.1 Add spec delta for block-range selection behavior
- [x] 1.2 Validate openspec change (`openspec.cmd validate add-file-outliner-view-block-range-selection --strict --no-interactive`)

## 2. Implementation
- [x] 2.1 Add block-range selection state + DOM class toggling
- [x] 2.2 Add root capture pointer handlers to switch from text selection → block-range selection
- [x] 2.3 Add CSS highlighting for selected blocks
- [x] 2.4 Ensure selection clears on click / enter edit / zoom / collapse

## 3. Verification
- [x] 3.1 Add 9222/CDP snippet validating cross-block drag selection
- [x] 3.2 Run `npm test -- --runInBand` and `tsc -noEmit -skipLibCheck` (esbuild JS `context` may be blocked in some sandboxes)
