# Source Issue Snapshot

## Tracker

- Title: Autocomplete selection leaves cursor inside wiki link and keeps suggestion list open
- Plane id: da0b9a93-a562-4968-9307-3cb18de8f0a8
- Priority: high
- External source: (none)
- External id: (none)
- Labels: agent-ready, bug, cdp-required

### Plane Description

ProblemTyping [[ opens the automatic completion list. After selecting or clicking a completion item, the insertion appears to happen but the editor still shows the completion list.

ObservedCompletion list remains visible after an item has already been selected.

Caret/focus stays in the completed link text instead of moving after the inserted wiki link.

Example from screenshot: selecting a date suggestion such as 2026-6-27 should finish the link and leave the cursor after [[2026-6-27]].

ExpectedSelecting a completion inserts the chosen target as a complete wiki link.

Caret is placed immediately after the completed ]].

Completion list closes immediately after selection.

NotesRepro area: editor autocomplete for [[ wiki-link suggestions.

Needs runtime/UI verification in Obsidian/CDP because the bug is interaction and caret-state dependent.

## Source Fetch

- Status: not_configured
- Fetched at: 2026-06-28T02:42:18Z
- Source URL: (none)
- Error: No supported GitHub issue URL was configured.

## GitHub Comments

(none)
