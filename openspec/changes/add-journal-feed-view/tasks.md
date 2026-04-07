## 1. OpenSpec
- [x] 1.1 Add a new `journal-feed-view` capability spec for anchor-only continuous journals
- [x] 1.2 Validate the change with `openspec.cmd validate add-journal-feed-view --strict --no-interactive`

## 2. Architecture
- [x] 2.1 Add anchor frontmatter parsing + defaulting for Journal Feed behavior config
- [x] 2.2 Resolve source daily notes from core Daily Notes settings (folder + format) and sort descending
- [x] 2.3 Add a new `Journal Feed View` type and anchor-only routing
- [x] 2.4 Implement per-day detached leaf mounting (native Markdown editor) + focus bridging + safe cleanup

## 3. Feed UI & Behavior
- [x] 3.1 Implement descending initial window selection near today
- [x] 3.2 Implement bottom-triggered lazy append for older day files
- [x] 3.3 Render per-day headers linked to underlying source files
- [x] 3.4 Mount/unmount per-day editors lazily based on viewport visibility (intersection observer + root margin)
- [x] 3.5 Add safe invalid-config / empty-source state and source-view escape hatch

## 4. Verification
- [x] 4.1 Add unit tests for config parsing, source resolution, and windowing behavior
- [x] 4.2 Add regression tests proving direct opens of daily-note source files keep existing behavior (CDP smoke)
- [x] 4.3 Add regression tests proving edits remain isolated to the touched day file (CDP smoke)
- [x] 4.4 Run typecheck + Jest (`tsc -noEmit -skipLibCheck`, `npm test -- --runInBand`)
- [x] 4.5 Run an Obsidian/CDP smoke test for anchor open, lazy loading, and per-file persistence

## 5. Docs
- [x] 5.1 Document Journal Feed anchor frontmatter and usage flow
- [x] 5.2 Document V1 boundaries: no takeover of Obsidian Daily Notes, no cross-file operations
