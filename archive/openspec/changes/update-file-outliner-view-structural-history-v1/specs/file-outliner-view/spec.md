# file-outliner-view Specification (Delta)

## ADDED Requirements

### Requirement: V1 structural edits participate in a user-visible undo/redo chain
When a V1 structural edit changes the File Outliner View, the plugin MUST record that change in a single view-local structural history chain.

V1 structural edits are limited to:
- `Enter` splitting the current block
- multiline paste that creates multiple blocks
- `Tab` / `Shift+Tab` indent and outdent
- `Backspace` at block start merging with the previous block
- `Delete` at block end merging with the next block
- drag/drop moving a block subtree

#### Scenario: Undo a recent structural split
- **GIVEN** a scoped outliner file is open in the File Outliner View
- **AND** the user presses `Enter` to split the current block into two blocks
- **WHEN** the user immediately presses `Mod+Z`
- **THEN** the split is undone
- **AND** the file returns to the pre-split block structure

#### Scenario: Redo a recently undone structural edit
- **GIVEN** the user has just undone a V1 structural edit in the File Outliner View
- **WHEN** the user presses `Mod+Y` or `Mod+Shift+Z`
- **THEN** the same structural edit is applied again
- **AND** focus returns to the block and cursor position associated with the redone result

#### Scenario: Undo a drag/drop move without re-entering text edit mode
- **GIVEN** the user drags a block subtree to a new location in the File Outliner View
- **AND** the Outliner root remains the active interaction surface
- **WHEN** the user presses `Mod+Z`
- **THEN** the moved subtree returns to its previous location

### Requirement: Structural history routing MUST preserve normal text undo/redo fallback
The File Outliner View MUST try structural undo/redo first for V1 structural entries, but it MUST NOT swallow normal CodeMirror text undo/redo when no structural history entry applies.

#### Scenario: Text typing still uses CodeMirror history
- **GIVEN** the user types additional text inside a single block without performing a V1 structural edit
- **WHEN** the user presses `Mod+Z`
- **THEN** the most recent text edit is undone through the editor's native text history
- **AND** no unrelated structural replay occurs
