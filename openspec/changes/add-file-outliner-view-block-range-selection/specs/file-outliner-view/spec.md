
## ADDED Requirements

### Requirement: Dragging selection across blocks selects a block range
When the user is editing a block in the File Outliner View, a left-mouse drag selection MUST behave as:
- If the pointer stays within the active block: normal in-block text selection (CM6 selection).
- If the pointer crosses into a different visible block: the view MUST switch to block-range selection mode:
  - The active block exits edit mode.
  - The selection becomes an inclusive contiguous range of blocks between the anchor block (where the drag started)
    and the focus block (the block currently under the pointer), based on the current visible block order.
  - The selected blocks are visibly highlighted in the UI.

The selection MAY remain active after mouse up until the user clicks elsewhere or re-enters edit mode.

#### Scenario: Drag from block A into block C selects blocks A..C
- **GIVEN** a scoped outliner file is open in the File Outliner View
- **AND** the user is editing block `A`
- **WHEN** the user drag-selects with the left mouse from block `A` into block `C`
- **THEN** the view exits edit mode and highlights blocks `A`, `B`, and `C` as a selected range
