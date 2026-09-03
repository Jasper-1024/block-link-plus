# Source Issue Snapshot

## Tracker

- Title: Outliner: dismiss stale wiki-link suggestions
- Plane id: 6cc76e53-fdb5-438b-8f23-d34779497ad9
- Priority: medium
- External source: (none)
- External id: (none)
- Labels: agent-ready, bug, cdp-required

### Plane Description

Bug: In the Outliner editor, typing [[ opens the link suggestion correctly, but the suggestion can remain visible after the trigger is no longer valid. It should dismiss when continued typing makes the query invalid, when the opening brackets are deleted, or when moving the caret leaves the active trigger range—matching Obsidian's native suggest lifecycle.\n\nAcceptance: reproduce and verify in an isolated Obsidian/CDP runtime; do not close a valid active suggestion; add regression coverage for query and cursor invalidation.

## Source Fetch

- Status: not_configured
- Fetched at: 2026-09-01T23:34:16Z
- Source URL: (none)
- Error: No supported GitHub issue URL was configured.

## GitHub Comments

(none)
