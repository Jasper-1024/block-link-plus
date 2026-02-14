# Proposal: Enhanced List Subtree Clipboard

Problem:
Block selection mode (handle click selects blocks) is not productive unless clipboard operations (copy/cut/paste) operate on blocks, preserving nested structure.

Proposal:

- In block selection mode:
  - Copy/Cut serializes selected block **subtrees**.
  - Cut removes selected subtrees from the document.
  - Paste replaces the selected subtrees.
- Clipboard formats:
  - `text/plain`: strip system lines so external paste is clean.
  - Internal MIME: preserve system lines and metadata for accurate internal paste.
- Paste behavior:
  - Prefer internal MIME if present; otherwise fall back to `text/plain`.
  - Reindent pasted subtree to match the destination block indent level.
  - For copy semantics, remap system line IDs immediately to avoid duplicates.

Non-goals:

- No persistent index/cache.
- No attempt to update cross-references inside pasted text.

