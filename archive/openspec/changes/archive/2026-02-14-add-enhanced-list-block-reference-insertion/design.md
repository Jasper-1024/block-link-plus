# Design: Enhanced List Block Reference Insertion

Goal: provide a Logseq/Roam-like workflow to insert block references from the editor:

- Search blocks (text + file) and insert `[[file#^id]]` or `![[file#^id]]`.
- Support a fast trigger (`((`) in Live Preview.
- No persistent indexing (memory cache only; recompute on demand).

Approach:

- Build a lightweight in-memory index of Enhanced List blocks by parsing list items and their system lines (`[date:: ...] ^id`) from recently modified files.
- Provide a `SuggestModal` picker UI:
  - `getSuggestions()` filters by query against block text + file path + breadcrumbs.
  - `renderSuggestion()` shows block text + (optional) parent chain + file path.
  - `onChooseSuggestion()` inserts the generated block link at the requested editor range.
- Entry points:
  - Commands:
    - `block-link-plus:insert-block-reference`
    - `block-link-plus:insert-block-embed`
  - `((` trigger extension: when the user types `((` in Live Preview, open the picker and replace the `((` with the chosen link.

