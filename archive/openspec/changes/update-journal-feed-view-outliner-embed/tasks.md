## 1. OpenSpec

- [x] 1.1 Add Journal Feed + Outliner embedding requirements (journal-feed-view delta spec)
- [x] 1.2 Add embedded-safe Outliner active editor bridge requirements (file-outliner-view delta spec)
- [x] 1.3 Validate the change with `openspec validate update-journal-feed-view-outliner-embed --strict --no-interactive`

## 2. Journal Feed: Outliner Embeds

- [x] 2.1 Add a detached `FileOutlinerView` embed manager (lifecycle + cleanup)
- [x] 2.2 Journal Feed mounts Outliner View for outliner-enabled day files
- [x] 2.3 Journal Feed keeps MarkdownView embeds for non-outliner day files
- [x] 2.4 Ensure lazy mount/unmount preserves scroll height and saves per-file

## 3. File Outliner View: focus-based active editor bridge

- [x] 3.1 Update bridge gate to allow focused embedded editors (not only active leaf)
- [x] 3.2 Trigger bridge updates on focusin/focusout (embedded leaves don't fire active-leaf-change)
- [x] 3.3 Verify EditorSuggest (`[[`, `/`) still works in normal Outliner panes

## 4. Verification

- [x] 4.1 Run typecheck + Jest (`tsc -noEmit -skipLibCheck`, `npm test -- --runInBand`)
- [x] 4.2 Obsidian/CDP smoke test: mount embedded Outliner day section, enter edit mode, confirm handles + editor + suggests

## 5. Release

- [x] 5.1 Bump patch version + update `manifest.json` + `versions.json`
- [x] 5.2 Tag release (local) after verification
