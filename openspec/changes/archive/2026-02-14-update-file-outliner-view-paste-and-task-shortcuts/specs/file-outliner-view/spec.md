# file-outliner-view Specification (Delta)

## ADDED Requirements

### Requirement: Mod+Shift+V pastes multiline text into a single block
When editing a block in the File Outliner View, the plugin MUST apply the following paste rules:
- `Mod+V` MUST follow the configured "Paste multiline" behavior.
- `Mod+Shift+V` MUST paste as plain multiline text within the current block (MUST NOT split into multiple blocks).

#### Scenario: Plain paste bypasses split behavior
- **GIVEN** "Paste multiline" is configured as `split`
- **WHEN** the user presses `Mod+Shift+V` to paste multiline text
- **THEN** the outliner DOES NOT create new sibling blocks from the pasted lines

### Requirement: Mod+Enter toggles a block-level task marker
When editing a block in the File Outliner View, `Mod+Enter` MUST toggle a task marker prefix on the first line:
- If the first line starts with `[ ] `, it becomes `[x] `.
- If the first line starts with `[x] ` or `[X] `, it becomes `[ ] `.
- Otherwise, `[ ] ` is inserted at the start of the first line.

#### Scenario: Toggle task marker cycles between unchecked and checked
- **GIVEN** the active block first line is `hello`
- **WHEN** the user presses `Mod+Enter`
- **THEN** the first line becomes `[ ] hello`
- **WHEN** the user presses `Mod+Enter` again
- **THEN** the first line becomes `[x] hello`

