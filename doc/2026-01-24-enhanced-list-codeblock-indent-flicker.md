# Enhanced List: Code Block Indent "Flicker" After Edits

## Problem

When editing inside a nested fenced code block (inside a list item) in Obsidian Live Preview:

- Adding/removing a line above the code block, or inserting a new code line (e.g. `Enter` inside the fence),
  could cause the code block to momentarily "jump" horizontally (indent render mismatch).
- The mismatch was not permanent; moving the cursor / waiting a tick would often restore the correct alignment.

## Repro (Typical)

1. In a list item, add a nested fenced code block:
   ```md
   - parent
     line
     ```bash
     ls -alth
     ```
   - sibling
   ```
2. Put the caret on `ls -alth`, press `Enter` (or insert/delete a line above).
3. Observe the code block indent briefly shifting, then snapping back.

## Root Cause

`codeblock-indent-extension` aligns nested fenced code block lines by shifting them with a per-line `margin-left`
decoration, using nearby list indentation as the reference.

In Live Preview, the opening fence line is often rendered as a "header widget" (language label), and Obsidian's
list indentation styles can transiently settle across ticks right after an edit. Sampling the opening fence line
caused the computed delta to briefly be wrong (often near-zero), producing a visible "jump left" flicker.

A second (rarer) transient state was also observed: right after certain edits, the fenced code line's own padding
(used to compute `margin-left = listIndent - codePadding`) could momentarily be missing. If we sampled during that
moment, we'd compute a too-large `margin-left`, and when the padding "snapped back" the code block would appear
shifted until the next editor update (e.g., cursor move).

## Fix

- Sample the *code block indentation padding* from the first content line after the opening fence (when available),
  instead of sampling from the opening fence line itself.
- Improve `readListPaddingInlineStartPx()` to treat `0` as "unset" and fall through to other style sources
  (notably `padding-inline-start` which Obsidian uses).
- Add guards/caching so transient tiny indent values don't overwrite stable measurements.
- Cache the last known *code line padding* so transient "0px" reads after edits don't cause a visible jump.

Files:
- `src/features/enhanced-list-blocks/codeblock-indent-extension.ts`

## Tests

- Added/extended unit tests covering:
  - Aligning nested fenced code blocks to list indentation
  - Avoiding a bad fallback when list indentation styling is temporarily missing

Files:
- `src/features/enhanced-list-blocks/__tests__/codeblock-indent-extension.test.ts`
