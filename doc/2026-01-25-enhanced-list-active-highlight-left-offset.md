# Enhanced List: Active Block Highlight Left Boundary Misaligned

## Problem

When the caret is inside a multi-line list block (e.g., list item + continuation lines / fenced code),
the "active block" highlight background could start too far to the left. The highlight would bleed into
the indentation/handle area instead of starting near the real editable text column.

This was most visible on nested list items where Obsidian renders the list marker via Live Preview widgets.

## Root Cause

The highlight uses a CSS gradient whose start is driven by a CSS variable:

- `--blp-enhanced-list-active-block-left`

We attempted to measure the content column by calling `coordsAtPos()`/`getBoundingClientRect()` directly during the same
update cycle that moved the selection. In Obsidian Live Preview, list widgets/layout can settle during a later measure
pass, so early measurements can be transient/incorrect.

When the measurement was unreliable, the code fell back to `defaultCharacterWidth * markerLen`, which underestimates the
visual width of Obsidian's bullet widget. That made the highlight start too far left.

## Fix

- Use CodeMirror `EditorView.requestMeasure` to measure the actual content column after layout has stabilized, and then
  update the CSS variable in the write phase.
- Keep the previous (already-measured) value as a temporary seed to avoid flicker; only seed a rough fallback when the
  variable is still unset.
- Start the highlight a tiny bit left of the content column (`2px`) so it feels like a block highlight (Logseq-like).

Files:
- `src/features/enhanced-list-blocks/active-block-highlight-extension.ts`

## Tests

- Added a unit test asserting the CSS variable gets set (non-empty, > 0) when the caret is on a continuation line.

Files:
- `src/features/enhanced-list-blocks/__tests__/active-block-highlight-extension.test.ts`

