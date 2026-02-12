# file-outliner-view Specification (Delta)

## ADDED Requirements

### Requirement: Task blocks render with a checkbox UI in display mode
When an outliner block's first visible line starts with a task marker prefix (`[ ] `, `[x] `, or `[X] `), the Outliner View display surface MUST:
- Render a checkbox control reflecting the task state (unchecked for `[ ]`, checked for `[x]`/`[X]`)
- Render the remaining block Markdown *without* showing the marker prefix text (the visible content begins after the marker)

The on-disk representation MUST remain Obsidian-native Markdown tasks (`- [ ] ...` / `- [x] ...`).

#### Scenario: Display hides marker text but shows checkbox
- **GIVEN** a block whose first visible line is `[ ] hello`
- **WHEN** the Outliner View renders the block display
- **THEN** the block display shows a checkbox control
- **AND** the rendered text contains `hello`
- **AND** the rendered text does NOT contain `[ ]`

### Requirement: Clicking the task checkbox toggles task status without entering edit mode
When a task checkbox is clicked in the Outliner View display surface, the Outliner View MUST treat it as a non-editing interaction:
- The block MUST NOT enter edit mode as a side effect of the click
- The block's first-line task marker MUST toggle `[ ]` ↔ `[x]`
- The change MUST be persisted to disk via the outliner file protocol

#### Scenario: Checkbox click toggles and persists
- **GIVEN** a displayed task block `[ ] hello`
- **WHEN** the user clicks its checkbox
- **THEN** the block becomes `[x] hello`
- **AND** the underlying Markdown file stores the task as `- [x] hello`

### Requirement: Task commands are registered for hotkeys
The plugin MUST register two commands that are available for Hotkeys / Command Palette while the Outliner View is active:
- Toggle task status (`[ ]` ↔ `[x]`) for the active block
- Toggle task marker (task ↔ normal block) for the active block

#### Scenario: Commands are available only in Outliner View
- **GIVEN** the active pane is a normal Markdown view
- **WHEN** the user triggers the Outliner task commands
- **THEN** the commands do nothing (not applicable)
- **GIVEN** the active pane is the Outliner View
- **WHEN** the user triggers the Outliner task commands
- **THEN** the active block is updated accordingly

### Requirement: Bullet context menu supports task conversion
The Outliner View bullet context menu MUST provide task conversion actions:
- If the block is not a task, offer "Convert to task" (adds `[ ] ` prefix)
- If the block is a task, offer "Convert to normal block" (removes marker prefix)

#### Scenario: Convert to task from menu
- **GIVEN** a normal block `hello`
- **WHEN** the user chooses "Convert to task" from the bullet context menu
- **THEN** the block becomes `[ ] hello`
