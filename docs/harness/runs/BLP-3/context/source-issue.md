# Source Issue Snapshot

## Tracker

- Title: [GitHub #33B] Inline Editing Enter+undo visible range overflow
- Plane id: d39252c9-efd0-4b58-87d7-014246d6f393
- Priority: high
- External source: (none)
- External id: (none)
- Labels: agent-ready, bug, cdp-required, middle-flow

### Plane Description

Human gate accepted the RCA partition for GitHub #33. This child issue is scoped from parent BLP-1; do not treat the parent report as one implementation scope.

Source: https://github.com/Jasper-1024/block-link-plus/issues/33

Canonical RCA artifact in runner workspace: docs/agent/runs/BLP-1/rca-review.md

Scope: Enter plus undo causes visible inline-edit embed range overflow.

Confirmed runtime symptom: after inserting a child line inside the embedded block and undoing it, the source text returns to its original value, but the embedded visible DOM still expands into the following sibling block.

Accepted RCA boundary: the bug is real and localized to the bounded rendering / selective-editor / CM6 decoration update path.

Not accepted as implementation-ready yet: the exact failing mapping/update branch is still unproved. The next agent should instrument CM6 decoration mapping after undo instead of jumping straight to a fix.

Required validation: real Obsidian/CDP runtime evidence, mechanism-level proof, and a bounded regression test for undo restoring the visible range.

## Source Fetch

- Status: fetched
- Fetched at: 2026-06-15T12:58:23Z
- Source URL: https://github.com/Jasper-1024/block-link-plus/issues/33

## GitHub Issue

- Title: [BUG] Inline Editing Instability For Embedded Block: Display corruption, rendering issues, and unintended behavior
- State: open
- Author: Lamply
- Created: 2026-05-09T03:04:32Z
- Updated: 2026-06-09T10:21:51Z
- URL: https://github.com/Jasper-1024/block-link-plus/issues/33

### Body

I have encountered several display bugs while using the Inline Editing feature for embedded block in lists:

1. The plugin fails for previously viewed files after opening a new file, requiring the user to reopen the file to restore normal functionality.
2. There is a persistent blank padding area at the end of the editable embedded block, which may expand due to bug behavior.
3. Entering a new line and then pressing Ctrl+Z (undo) causes the embedded block area to "overflow".
4. The context menu activated by right-clicking text within the area does not disappear.
5. Switching to Reading View displays the entire source text instead of only the content of the block.

I am testing this on Obsidian version 1.12.7, Ubuntu 22.04, using a new blank vault.

<img width="1080" height="666" alt="Image" src="https://github.com/user-attachments/assets/c1074b47-278e-4f06-b328-6d3718f78526" />

## GitHub Comments

### Comment 1

- Author: Jasper-1024
- Created: 2026-06-09T10:21:51Z
- URL: https://github.com/Jasper-1024/block-link-plus/issues/33#issuecomment-4658799930

For some reason, my email system malfunctioned, so I didn't receive any notifications.
Yes, I just saw the issue and am currently working on it.
