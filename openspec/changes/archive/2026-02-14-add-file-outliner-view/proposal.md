# Proposal: add-file-outliner-view

## Why
The current CM6-based "Enhanced List" approach is fragile (cursor/IME/indent/render glitches) and tends to regress when fixing edge cases.
We need a simpler, more structural design: a file-level view that takes over rendering + editing for scoped Markdown files and provides a Logseq-like block editing experience.

## What Changes
- Add a new capability: a file-level Outliner View for scoped Markdown files (opt-in).
- Define and enforce a canonical on-disk Markdown representation for blocks (list tree + system tail line).
- Implement a functional-core editing engine (pure ops) + a stable view layer (single editor instance).
- Add Logseq-like nesting guides (vertical threading lines + active path highlight) via scoped CSS.

## Non-Goals (v2 baseline)
- No task/checkbox semantics at the structure level; `[ ]` / `[x]` are treated as plain text.
- No collapse persistence; default is fully expanded.
- No "two-state" block mode work (to be discussed later).

## Impact
- Breaking change: the CM6 "Enhanced List Blocks" UX is removed; scoped files use the file-level Outliner View instead.
- Notes remain plain Markdown: `[[file#^id]]` / `![[file#^id]]` continues to work without the plugin (rendering may be ugly, but jump is correct).

