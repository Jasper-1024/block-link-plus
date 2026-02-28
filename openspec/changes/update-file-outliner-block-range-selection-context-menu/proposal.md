
File Outliner block-range selection highlights multiple blocks when the user drag-selects across block boundaries.
After this selection mode is active, right-clicking on the selected blocks does not open the Outliner bullet menu
unless the pointer is exactly on the bullet handle, because the contextmenu handler is only bound to the bullet.

We want the multi-block selection UX to behave like the bullet menu: right-click anywhere on a selected block
should open the same menu (no new menu surface).

## What Changes

- Add a capture-phase `contextmenu` event delegation handler on the Outliner root.
- When a block-range selection is active and the right-click target is inside a selected `.ls-block`,
  open the existing bullet menu for the hit block id at the mouse position.

## Non-Goals

- No new multi-block operations; the menu remains the existing single-block bullet menu.
- Do not override context menus inside embedded editors (`.markdown-source-view`) or the CM6 editor host.

## Impact

- Users can right-click on selected blocks (range selection) and still access the bullet menu without aiming for the handle.
- Implementation stays UI-only and follows the existing “event delegation on root” architecture.
