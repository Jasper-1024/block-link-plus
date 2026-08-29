# Source Issue Snapshot

## Tracker

- Title: Add Alt+Up/Down block reordering modes
- Plane id: 5c79bb40-276a-4d94-8d10-1e53259a02a7
- Priority: medium
- External source: (none)
- External id: (none)
- Labels: agent-ready, cdp-required, enhancement

### Plane Description

Context
Implement VS Code-style Alt+ArrowUp / Alt+ArrowDown movement for the block containing the current cursor.

Behavior
- When the cursor is inside a block, Alt+ArrowUp moves that block before the previous eligible block; Alt+ArrowDown moves it after the next eligible block.
- Treat the current block and its nested child subtree as one move unit unless the existing BLP block model already defines a different atomic move unit.
- Preserve editor focus, cursor position, block content, and selection as much as possible after the move.
- No-op cleanly at the top/bottom boundary or when there is no eligible target block.

Mode setting / menu
Add a menu/setting option for block move mode:
1. Same-level only: move only among sibling blocks with the same indentation/nesting level.
2. Cross-level align: move up/down against the previous/next block regardless of indentation, and align the moved block indentation to that adjacent target block.

Acceptance criteria
- Alt+ArrowUp and Alt+ArrowDown are registered as keyboard shortcuts for moving the current block.
- The menu/setting exposes the two modes and persists the selected mode.
- Same-level only mode does not change indentation and does not cross parent/child boundaries.
- Cross-level align mode can cross indentation levels and updates indentation to match the adjacent target block.
- Add focused tests where practical, plus Obsidian/CDP runtime evidence for shortcut behavior.

## Source Fetch

- Status: not_configured
- Fetched at: 2026-08-29T01:15:24Z
- Source URL: (none)
- Error: No supported GitHub issue URL was configured.

## GitHub Comments

(none)
