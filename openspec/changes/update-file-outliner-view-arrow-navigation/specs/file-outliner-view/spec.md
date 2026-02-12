# file-outliner-view Specification (Delta)

## ADDED Requirements

### Requirement: ArrowUp/ArrowDown moves caret across visible blocks
Within the Outliner View block editor, pressing plain `ArrowUp` / `ArrowDown` (no modifier keys) MUST provide continuous vertical caret navigation across blocks:
- `ArrowUp` at the visual top of the current block MUST move focus to the previous **visible** block and place the caret on its last line.
- `ArrowDown` at the visual bottom of the current block MUST move focus to the next **visible** block and place the caret on its first line.
- This navigation MUST NOT create new blocks.
- If there is no previous/next visible block, the caret MUST NOT move.

The previous/next visible block order MUST be computed from the current render scope:
- Zoom scope (render root) MUST constrain the navigation range.
- Collapsed nodes MUST hide their descendants from the visible order.

#### Scenario: ArrowUp from first visible block does nothing
- **GIVEN** the caret is at the visual top of the first visible block
- **WHEN** the user presses `ArrowUp`
- **THEN** the caret does not move

#### Scenario: ArrowDown from last visible block does nothing
- **GIVEN** the caret is at the visual bottom of the last visible block
- **WHEN** the user presses `ArrowDown`
- **THEN** the caret does not move

#### Scenario: ArrowDown from a collapsed parent skips hidden children
- **GIVEN** a parent block has children
- **AND** the parent block is collapsed
- **WHEN** the caret is at the visual bottom of the parent block and the user presses `ArrowDown`
- **THEN** the caret jumps to the next visible sibling block after the collapsed subtree

### Requirement: Cross-block ArrowUp/Down preserves goal column
During continuous ArrowUp/ArrowDown navigation, the Outliner View MUST preserve a sticky goal column:
- The initial `goalCh` MUST be derived from the caret column (ch) before the first ArrowUp/Down in the session.
- Cross-block jumps MUST use `goalCh` even if an intermediate block clamps the caret to a shorter line.
- The goal column session MUST reset on non-plain ArrowUp/Down input (typing, pointer positioning, other keys).

#### Scenario: Goal column survives a short-line clamp between blocks
- **GIVEN** the user starts at column 8 on a long line and presses `ArrowDown` at block bottom
- **AND** the next block is a single-character line (caret clamps to column 1)
- **WHEN** the user presses `ArrowDown` again at that block bottom
- **THEN** the caret lands in the next long block at column 8 (not column 1)

