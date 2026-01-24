# Enhanced List Exploratory Log (AI)

Goal: use Enhanced List as a primary "block editor" (Logseq-like) in a real Obsidian Live Preview session, and turn
unexpected behaviors into fixes + regression tests.

## Test Workbench Notes

- `Review/_blp-ai-debug-codeblock.md`: nested list + fenced code block cases

## Scenarios To Exercise

- Basic typing: enter/backspace, add/remove lines, indent/outdent, split/join lines
- Drag & drop: move siblings, move into/out of children, move across blocks with code/callouts
- Fenced code blocks: inside list items at multiple nesting levels; edits at boundaries (open/close fence)
- Callouts: inside list items; nesting; moving blocks containing callouts
- Tasks: checkbox toggles; moving tasks across levels
- Mixed lists: ordered + unordered; mixed nesting

## Bugs Found

- 2026-01-24: Code block indent flicker after edits (fixed) → `doc/2026-01-24-enhanced-list-codeblock-indent-flicker.md`

