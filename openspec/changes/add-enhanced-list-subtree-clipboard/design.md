# Design: Enhanced List Subtree Clipboard

Goal: when Enhanced List Blocks is enabled and block selection mode is active, make copy/cut/paste operate on **block subtrees** (Roam/Logseq-like block units) instead of raw text selection.

Key constraints:

- Scope-gated to Enhanced List enabled files only.
- Live Preview only.
- No persistent indexing/state.
- Do not pollute user clipboard with hidden system lines (`[date:: ...] ^id`) when pasting into external apps.

Approach:

- Intercept `copy`, `cut`, and `paste` via CodeMirror 6 DOM event handlers at highest precedence.
- When block selection is non-empty:
  - Compute selected block subtree ranges using indentation-based scanning (with fence-awareness).
  - Serialize:
    - `text/plain`: same content but with system lines removed (external-friendly).
    - Internal MIME (`application/x-blp-enhanced-list-subtree-v1`): JSON payload containing full text (with system lines) + base indent metadata.
  - `cut`: delete the selected subtree ranges after writing clipboard payload.
  - `paste`: replace selected subtree ranges with pasted subtree (prefer internal MIME when available). Reindent to destination indent; for copy semantics generate fresh IDs.

