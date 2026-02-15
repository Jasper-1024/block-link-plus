# Outliner Drag/Move: EOL Newline Consumed (Line Join)

> Status (2026-02 / v2.0.0): This note is historical. The vendored `vslinko/obsidian-outliner` integration was removed in v2.0.0 (BLP now ships its own Outliner view).

## Problem

When reordering list blocks (drag-and-drop / move) in Obsidian Live Preview, a sibling line could lose its line break:

- The next list item becomes appended to the previous line (two `- ...` end up on the same line).
- Visually this shows up as “F’s next item/newline got eaten” after moving an item around it.

This was easiest to trigger when the moved range ended exactly at an end-of-line boundary (EOL).

## Root Cause

Our built-in outliner is vendored from `vslinko/obsidian-outliner`.

That code applies edits via `editor.replaceRange(replacement, changeFrom, changeTo)`.
In an observed Obsidian/CM6 edge case, replacing a multi-line range where `changeTo` points at an EOL position can also
consume the *following* `\n`, which joins the next unchanged line into the previous one.

## Fix

In the vendored `ChangesApplicator`, before calling `replaceRange`:

- If `changeTo` maps to a `\n` character in the underlying document and the `replacement` does not already end with `\n`,
  extend the replaced range to include that newline and re-add it to `replacement`.

This preserves line boundaries even if `replaceRange` consumes the newline in that edge case.

Files:
- `src/vendor/vslinko/obsidian-outliner/services/ChangesApplicator.ts`

## Tests

Added a regression test that simulates the newline-consuming behavior with a `BuggyReplaceRangeEditor`, and also verifies
we do not introduce extra blank lines with a normal `replaceRange` implementation.

Files:
- `src/vendor/vslinko/obsidian-outliner/services/__tests__/ChangesApplicator.test.ts`

