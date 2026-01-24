# Proposal: Update Multiline Block Handling (Issues #22/#27/#28/#29)

## Summary
This change fixes several correctness issues around multi-line selections, list items, and multiline embeds.

- Fix **#22**: Multi-line handling mode "Add multi block IDs" does not reliably generate IDs for each selected block (e.g., paragraph or list item).
- Fix **#27**: In unordered lists, "Copy Block Link" can incorrectly reuse the first/previous list item's `^id` instead of targeting the active list item.
- Fix **#28**: Range marker `^id-id` can be inserted as a prefix of the next line instead of being on its own line.
- Investigate/fix **#29**: On Android, embedded multiline block links may cause the note to render blank during scrolling; the plugin should fail open and avoid destructive preview mutations.

## Why
- These issues break core workflows: generating stable references for blocks and selections.
- List items and multiline selections are common Markdown structures; failures here undermine user trust.
- Mobile (Android) stability issues can effectively make notes unreadable; even if a full fix is constrained by platform behavior, the plugin must degrade gracefully.

## Goals
- Multi-block mode produces one `^id` per selected Markdown block (paragraph/list item/etc; reusing existing IDs) and copies one link per block.
- List-item targeting always applies to the active line/selection, not an adjacent block.
- Multiline range markers are inserted on their own line and never prefix the following content line.
- Reading/preview processing never blanks unrelated content; failures in custom embed processing fall back to Obsidian native rendering.

## Issue Context (for #27)
In Obsidian metadata, an entire contiguous list is typically represented as a single `section` of type `"list"`. If the plugin treats that section as a single block, it can accidentally:
- detect/reuse the `^id` on the *first* list item, and
- copy a link to that first item even when the cursor is on a later item.

Example:
```md
- first item ^aaa111
- second item
```
Running "Copy Block Link" on `second item` MUST insert/reuse an ID for `second item`, and MUST NOT reuse `^aaa111`.

## Issue Context (for #28)
When generating a multiline range reference (format `^id-id`), the plugin inserts an end-marker line after the selection. If that marker is inserted without a terminating newline, it can become a prefix of the line below.

Example:
```md
line 1
line 2
next paragraph starts here
```
After generating a range for `line 1..line 2`, the end marker MUST be on its own line:
```md
line 1 ^abc123
line 2
^abc123-abc123
next paragraph starts here
```
It MUST NOT produce `^abc123-abc123next paragraph starts here`.

## Non-Goals
- Implementing feature request **#21** (retroactive auto-generated block IDs).
- Introducing new link formats or changing existing command names.
- Redesigning the inline edit engine; changes here are limited to block/link generation and preview safety.

## Technical Approach (high level)
- **#22**: Treat the selection as a set of selected Markdown blocks (not raw lines): a paragraph without blank lines is one block; each list item is a block. Generate/reuse one `^id` per selected block even when the selection only partially overlaps a block.
- **#27**: Fix list-item resolution so the target is the active list item (by cursor/selection), not the overall list section; reuse/insert `^id` on that item only.
- **#28**: Insert the range end marker `^id-id` as a standalone line with a trailing newline, ensuring the following content remains intact.
- **#29**: Harden preview processing:
  - Ensure reading-mode post processors do not mutate text content broadly.
  - Ensure multiline-embed React mounting/unmounting is keyed correctly and does not leak roots across re-renders.
  - Add "fail open" behavior: if custom rendering fails, keep native embed rendering visible.

## Impact
- User-visible fixes for copy/link generation across multiline selections and list items.
- Multiline range marker placement becomes stable even when selection is followed by existing content.
- Improved safety on Android (and other environments) by preventing destructive preview processing.

## Validation Plan
- Add unit tests for link creation and insertion behavior for:
  - multi-block mode across mixed blocks (#22),
  - list-item targeting in unordered lists (#27),
  - range end marker placement when the next line has content (#28).
- Add regression coverage for preview safety invariants where feasible; otherwise validate manually on Android for #29.
