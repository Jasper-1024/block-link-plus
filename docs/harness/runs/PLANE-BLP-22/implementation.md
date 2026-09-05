# BLP-22 — Outliner current-page search

Implementation mode: foreground, runtime-first; no runner. Pending human acceptance.

## Contract

Native Find opens a view-local search bar. Search includes rendered embedded content,
repeated occurrences, folded blocks and blocks outside the previous Zoom scope.
Navigation scrolls/highlights without focusing embedded editors or modifying documents.
Escape restores the previous scene. No replace or global search changes.

BLP-12 reference: preserve occurrence identity and reading order; keep navigation
separate from editing; clear active highlights; do not reset the cursor on scroll.
Unlike the ordinary Markdown editor bridge, this view uses rendered DOM ranges for
both counting and highlighting, avoiding mismatched Markdown-source offsets.

## Runtime evidence

- Task-owned Obsidian 1.13.6, plugin build 2.0.20, CDP port 19522.
- Initial native Find had no Outliner UI.
- Regression: scripts/cdp-snippets/regression/file-outliner/page-search.js.
- Four ordinary matches: repeated match within one block, folded child, case folding,
  Chinese query, Zoom restore, no history pollution, no source mutation.
- Six mixed matches: host, two occurrences of one embedded block, and a link alias.
  Actual CSS Highlight ranges are distinct and visible; button navigation retains
  search input focus; previously matched text nodes remain connected.
- Hidden text outside the referenced block is excluded. Host and embedded source
  remain unchanged. Cleanup removes only this search's highlight registrations.
- Type build passed; 52 suites / 338 tests passed; workflow check passed.

Search prepares block displays in batches when opened; navigation does not rebuild
them. Very large documents and third-party custom renderers need further field testing.
