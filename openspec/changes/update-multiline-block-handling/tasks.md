# Tasks: Update Multiline Block Handling (Issues #22/#27/#28/#29)

## 0. Prep
- [x] 0.1 Draft spec deltas for affected capabilities
- [x] 0.2 `openspec validate update-multiline-block-handling --strict`
- [x] 0.3 Add unit test scaffolding for link creation (minimal `Editor` mock + helpers)

## 1. Fix #22 (Add multi block IDs not working)
- [x] 1.1 Define "selected block" resolution rules (paragraphs + list items; include partial overlap)
- [x] 1.2 Add regression test: paragraph without blank lines yields a single ID/link (reuse existing ID)
- [x] 1.3 Add regression test: selection spanning multiple paragraphs yields multiple IDs/links
- [x] 1.4 Add regression test: selection spanning multiple list items yields one ID per item (not per physical line)
- [x] 1.5 Fix multi-block insertion to resolve selected blocks (incl. partial overlap) and generate/reuse one `^id` per block
- [x] 1.6 Verify clipboard output contains one link per selected block (reusing existing IDs)
- [x] 1.7 Update settings copy to describe per-block behavior

## 2. Fix #27 (Unordered list item targets previous linked item)
- [x] 2.1 Add regression test: list item after a previously linked item MUST NOT reuse the previous/first ID
- [x] 2.2 Add regression test: active list item already has ID should be reused
- [x] 2.3 Fix list-item targeting to always apply to the active list item (not the whole list section)
- [x] 2.4 Verify list-item ID reuse checks the active item line only

## 3. Fix #28 (Range end marker prefixes the next line)
- [x] 3.1 Add regression test: selection followed by non-empty next line
- [x] 3.2 Add regression test: end marker insertion at end-of-file still results in a standalone marker line
- [x] 3.3 Fix end marker insertion so `^id-id` is always on its own line and does not prefix following content

## 4. Investigate/fix #29 (Android: note becomes blank on scroll)
- [x] 4.1 Audit reading-mode post processors for destructive mutations
- [x] 4.2 Fix `markdownPostProcessor` so it does not wipe rendered text (prevents "blank note" on re-render/scroll)
- [ ] 4.3 Add guards/fallback so preview rendering fails open (native content remains visible)
- [ ] 4.4 Fix range embed lifecycle for multiline embeds across re-renders/scroll
- [ ] 4.5 Manual verification on Android (or document constraints if not reproducible)
