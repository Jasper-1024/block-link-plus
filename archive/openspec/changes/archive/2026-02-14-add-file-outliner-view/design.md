# Design: File-Level Outliner View (v2)

## Core Idea
Treat scoped Markdown files as a block document with a single canonical storage format (plain Markdown lists + system tail lines).
Render and edit the file through a plugin-owned view that mimics Logseq's block UX.

The design prioritizes "structure first":
- Normalize to a single on-disk representation instead of patching UI edge cases.
- Implement editing semantics in a pure engine (testable) instead of DOM-driven mutations.
- Make visuals (threading lines, active path) pure CSS based on stable DOM structure.

## Layering
1) **Protocol**
   - Parse Markdown into a block tree.
   - Serialize block tree back to canonical Markdown.
   - Enforce invariants (IDs, system tail lines, indentation, escaping).

2) **Engine (Functional Core)**
   - Pure operations:
     - split / insert empty sibling
     - indent / outdent
     - merge with previous / merge with next
   - Returns a selection plan (next active block + cursor position).

3) **View (Stable UI)**
   - DOM keyed by block id; avoid full rerenders on every keystroke.
   - A single editor instance is mounted onto the active block row for IME/undo stability.
   - Display mode uses Obsidian `MarkdownRenderer` per block.

4) **CSS (Logseq-like)**
   - Use Logseq-compatible class structure:
     - `.ls-block`, `.block-control-wrap`, `.bullet-container`, `.block-content-wrapper`, `.block-children-container`, `.block-children`
   - Threading lines + active path implemented via `::before` pseudo-elements + `:focus-within`.
   - Scoped under the outliner view root to avoid global side effects.

## Canonical Storage (Minimum Contract)
- YAML frontmatter is preserved verbatim.
- Body is a list tree (`- `) with block content (including multi-line via continuation indent).
- Each block ends with a system tail line:
  - Dataview inline fields include `[date:: ...] [updated:: ...] [blp_sys:: 1] [blp_ver:: 2]`
  - Ends with `^id` (no trailing whitespace).
  - Positioned so Obsidian associates the id with the intended block (and `#^id` embeds include the subtree).
- `[ ]` / `[x]` are treated as plain text; no "task state" field in the model.

## Logseq Visual Baseline (Reference)
The v2 view SHOULD mimic Logseq's bullet/threading style using a stable DOM + scoped CSS.

Observed (Logseq 0.10.15 + `logseq-bullet-threading` plugin):
- Threading is implemented with `::before` pseudo-elements + `:focus-within` (no canvas).
- Key layout constants (theme/scale-dependent):
  - `block-control-wrap` width: ~`42px`
  - `block-children-container` left offset: ~`29px`
  - bullet container: `14px` (bullet dot `6px`)
  - per-level indent ~= `42 + 29 + borderWidth` ~= `~72px` at UI scale where `2px` renders as `1.6px`
- Active path highlight is driven purely by `:focus-within`:
  - border colors switch to an "active" color for ancestor path segments only.

Implementation note: `logseq-bullet-threading` is MIT licensed; we can reuse the selector strategy and adapt variables while keeping attribution.
