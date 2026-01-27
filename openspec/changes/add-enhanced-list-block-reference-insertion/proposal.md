# Proposal: Enhanced List Block Reference Insertion

Problem:
Users can copy block links, but inserting a reference during editing is still clunky compared to Logseq/Roam.

Proposal:

- Add an editor block picker that:
  - Searches Enhanced List blocks by text + file.
  - Inserts `[[file#^id]]` or `![[file#^id]]` at the cursor (or replaces a target range).
- Provide a fast trigger:
  - When the user types `((` in Live Preview, open the picker and replace `((` with the chosen reference.

Notes:

- Index is in-memory only (rebuilt on demand; no disk persistence).
- Search is bounded to a recent-file window to stay responsive.

