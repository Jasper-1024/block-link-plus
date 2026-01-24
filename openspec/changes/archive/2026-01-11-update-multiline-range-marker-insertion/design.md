# Design: Multiline Range Marker Insertion

## Goals
- Allow `^id-id` to be inserted inline like a normal block ID whenever safe (e.g. `bbb ^id-id`).
- Preserve stable range resolution for `![[file#^id-id]]` by ensuring `^id-id` is parsed as a block ID.
- Avoid accidental "downward expansion" where the range would resolve past the intended end due to Markdown paragraph joining.
- Keep creation atomic: either both markers are inserted, or nothing changes.

## Non-goals
- Introducing new settings or configuration toggles for this behavior.
- Changing how range embeds are rendered (this change only concerns marker insertion).

## Terminology
- **Start marker**: `^id` (attached to the first line of the range).
- **End marker**: `^id-id` (marks the end of the range).
- **Start insertion line**: the effective line where `^id` is inserted (typically the first selected line).
- **End insertion line / boundary**: the effective insertion point for `^id-id` (may be expanded to a block boundary).
- **Inline-safe**: appending ` ^id-id` at end-of-line results in a valid block id that won't break surrounding Markdown.

## Decision Flow (High Level)
1. Validate selection:
   - Must span multiple lines.
   - Must not include frontmatter.
   - Must not start at the empty first line of the file (empty-file start).
   - Must not target insertion points that already end with a block ID (range creation never reuses existing IDs).
2. Generate a unique `id` that does not collide with any existing `^id` in the document.
3. Insert start marker (`^id`) at the start insertion line:
   - If the line is empty, use a placeholder so the marker is attached to a real line.
4. Insert end marker (`^id-id`):
   - Prefer inline append on the end insertion line when inline-safe.
   - Otherwise, insert a standalone marker line after the end insertion block boundary.
   - In standalone mode, insert a blank line after the marker only when needed (see below).
5. If any step fails, rollback the document to its original state and notify the user.

## Auto-expand to Block Boundary
When the selection end is within a composite Markdown structure (e.g. list, blockquote, fenced code, table, comment block), inserting a standalone marker *inside* the structure risks the marker being treated as part of that structure (indented list continuation, blockquote continuation, code literal, etc.) and not being parsed as a block ID.

Strategy:
- For end-marker insertion, compute the containing section/block and expand the effective insertion point to that block's end boundary when inline insertion is unsafe.
- This matches the "auto expand to block boundary" policy agreed in discussion.

## Conditional Blank Line ("Only When Needed")
Problem:
- A standalone `^id-id` marker line must form its own Markdown block to be recognized as a block ID.
- If the following line is plain text, Markdown will merge both lines into the same paragraph. Then `^id-id` is no longer at the end of the block and will not be recognized.

Rule:
- After inserting a standalone marker line, inspect the next line:
  - If the next line is a **plain-text paragraph continuation**, insert an additional blank line after the marker (i.e. ensure there is an empty line between marker and the next line).
  - If the next line is already empty or starts a new block (heading/list/blockquote/code fence/table/hr/comment), do not insert extra blank lines.

Implementation note:
- "Insert a blank line after the marker" means the inserted text should contain two newlines after the marker line (e.g. `\n^id-id\n\n`), not just `\n^id-id\n`.

## Error Handling and Atomicity
- If either insertion point already ends with a block ID, abort with a user-facing Notice and do not modify the document.
- If insertion of the end marker fails after the start marker was inserted, rollback so the document does not end up with a lone `^id`.
- Prefer a single transactional approach if supported by the editor; otherwise use best-effort snapshot/restore.

