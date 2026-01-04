# Tasks: Update Multiline Range Marker Insertion

## 1. Spec
- [x] Update `multiline-block-references` delta spec for inline/fallback marker insertion, auto-expand-to-block-boundary, conditional blank line, and atomic failure behavior.

## 2. Implementation
- [x] Add preflight validation for multiline range creation (reject invalid selections; reject existing block IDs at insertion points; no "reuse existing id" behavior).
- [x] Implement insertion-point normalization (auto-expand selection end to the containing Markdown block boundary when needed, e.g. list/blockquote/code/table/comment blocks).
- [x] Implement default end-marker insertion at end-of-line, with fallback to standalone marker + "only when needed" blank line (when the following line would join the marker paragraph).
- [x] Ensure the operation is atomic (no partial marker insertions on failure; rollback on any exception).
- [x] Update call sites to pass required context (e.g. `fileCache`/section info) and surface user-facing Notices on failure.

## 3. Docs
- [x] Update docs/i18n descriptions to reflect the new default behavior and that both forms remain supported.

## 4. Validation
- [x] Add or update tests for the insertion decision logic (inline vs standalone + blank line, including block boundary expansion cases).
- [x] Run a focused build/test check for the changed modules.
