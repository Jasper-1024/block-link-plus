# Proposal: refactor-file-outliner-inline-edit

## Why
The v2 file-level outliner currently renders block display with Obsidian `MarkdownRenderer`, which produces Reading/Preview DOM (e.g. codeblock copy button + preview-specific styling). This causes UX drift vs the intended Logseq-like experience and creates a long tail of UI patching.

To converge editing UX toward Logseq (IME/undo/selection, key semantics) without reintroducing “Enhanced List” global CM6 fragility, we move the v2 block editor from a textarea to a local CM6 `EditorView` (single instance moved between blocks). For display, we keep `MarkdownRenderer` but explicitly strip preview-only affordances (e.g. `copy-code-button`) and apply the expected `.markdown-rendered` wrapper so theme CSS behaves predictably.

## What Changes
- Keep per-block `MarkdownRenderer` for display, but sanitize it for the outliner surface (no preview-only UI) and wrap with `.markdown-rendered`.
- Replace the outliner textarea editor with a single CM6 `EditorView` instance (moved between blocks) to provide native IME/undo/selection behavior.
- Keep v2 canonical file protocol + functional-core engine; the view becomes a projection driven by the same engine, but editing is performed through CM6.
- Add CDP (9222/9221) screenshot capture to support objective regression checks vs Logseq.

## Non-Goals
- No new “two-state” block modes.
- No task/checkbox semantics; task syntax remains plain text.
- No collapse persistence.

## Impact
- Scoped outliner files render more like an editor (CM6) and less like Reading/Preview HTML.
- Removes preview-only artifacts (e.g. `copy-code-button`) from the outliner UI surface.
