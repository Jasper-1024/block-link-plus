# Enhanced List Exploratory Log (AI)

Goal: use Enhanced List as a primary "block editor" (Logseq-like) in a real Obsidian Live Preview session, and turn
unexpected behaviors into fixes + regression tests.

## Test Workbench Notes

- `Review/_blp-ai-debug-codeblock.md`: nested list + fenced code block cases
- `Review/_blp-ai-workbench.md`: mixed list + callout + code block
- `Review/_blp-ai-drag-edge.md`: drag-and-drop edge cases
- `Review/_blp-ai-tasks.md`: task list (checkbox) cases

## Automation / Harness

- CDP helper: `scripts/obsidian-cdp.js`
- Baseline note content (used with `write-note`):
  - `doc/_blp-ai-workbench-baseline.md`
  - `doc/_blp-ai-drag-edge-baseline.md`
  - `doc/_blp-ai-tasks-baseline.md`

## Scenarios To Exercise

- Basic typing: enter/backspace, add/remove lines, indent/outdent, split/join lines
- Drag & drop: move siblings, move into/out of children, move across blocks with code/callouts
- Fenced code blocks: inside list items at multiple nesting levels; edits at boundaries (open/close fence)
- Callouts: inside list items; nesting; moving blocks containing callouts
- Tasks: checkbox toggles; moving tasks across levels
- Mixed lists: ordered + unordered; mixed nesting

## Bugs Found

- 2026-01-24: Drag/move could consume EOL newline (line-join) (fixed): `doc/2026-01-25-outliner-eol-newline-join.md`
- 2026-01-24: Code block indent flicker after edits (fixed): `doc/2026-01-24-enhanced-list-codeblock-indent-flicker.md`

## Scenarios Exercised (No Issues Found Yet)

- Drag list item containing a callout out of a parent list (indent/outdent) -> callout lines re-indent correctly
- Drag list item containing a fenced code block out of a parent list -> fence lines re-indent correctly
- Drag a checkbox task item to EOF -> no line-join; structure preserved
