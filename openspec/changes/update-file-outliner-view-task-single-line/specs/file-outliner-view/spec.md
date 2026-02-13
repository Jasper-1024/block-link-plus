# file-outliner-view Specification (Delta)

## MODIFIED Requirements

### Requirement: Task blocks render with a checkbox UI in display mode
When an outliner block's first visible line starts with a task marker prefix (`[ ] `, `[x] `, or `[X] `), the Outliner View display surface MUST:
- Render a checkbox control reflecting the task state (unchecked for `[ ]`, checked for `[x]`/`[X]`)
- Render the remaining block Markdown *without* showing the marker prefix text (the visible content begins after the marker)
- Render done tasks (`[x]`/`[X]`) with a visual completion style (strikethrough) in display mode

The on-disk representation MUST remain Obsidian-native Markdown tasks (`- [ ] ...` / `- [x] ...`).

#### Scenario: Done task shows strikethrough
- **GIVEN** a task block whose first visible line is `[x] test`
- **WHEN** the Outliner View renders the block display
- **THEN** the rendered text contains `test`
- **AND** the rendered text is visually styled as completed (strikethrough)

### Requirement: Logseq-like block editing baseline
Within the Outliner View, block editing MUST follow a Logseq-like baseline:
- `Enter` splits the current block at the cursor into a new sibling block.
- `Shift+Enter` inserts a newline within the current block content.
- `Tab` indents the current block under the previous sibling.
- `Shift+Tab` outdents the current block.
- `Backspace` at the start of a block merges with the previous block (default), with a user setting to prefer outdent when the block has children.
- `Delete` at the end of a block merges with the next block.

Task blocks additionally MUST enforce a single-line invariant:
- A task block MUST NOT contain in-block newlines.
- `Shift+Enter` MUST NOT create an in-block newline for task blocks.

#### Scenario: Shift+Enter does not create a newline in a task block
- **GIVEN** the active block is a task block `[ ] hello`
- **WHEN** the user presses `Shift+Enter`
- **THEN** the task block remains single-line (no `\n` is inserted into the task text)

## ADDED Requirements

### Requirement: Enter on a task block continues as a task block
When the active block is a task block, pressing `Enter` to create the next sibling block MUST continue task entry:
- The newly created sibling block MUST start with the todo marker prefix `[ ] `
- Focus MUST move to the new block after the `[ ] ` prefix

#### Scenario: Enter on a task creates the next todo task
- **GIVEN** the active block is a task block `[ ] a`
- **WHEN** the user presses `Enter` at the end of the block
- **THEN** a new sibling block is created whose text starts with `[ ] `
- **AND** focus is placed after the task marker prefix

### Requirement: Multi-line task content is normalized into a single-line task + child content
If a scoped outliner file contains a task block whose text spans multiple lines, the plugin MUST normalize it so that the task block is single-line while preserving the additional content.

#### Scenario: Normalize a multi-line task block
- **GIVEN** a task block whose stored text is `[ ] a\nb`
- **WHEN** the file is opened in the Outliner View (normalization occurs)
- **THEN** the task block becomes single-line (`[ ] a`)
- **AND** the additional content (`b`) remains available within the task subtree

