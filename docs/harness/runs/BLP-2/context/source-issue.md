# Source Issue Snapshot

## Tracker

- Title: [GitHub #33A] Inline Editing lifecycle/remount failure after file switch
- Plane id: aa7f2675-4f9a-42b7-be7a-a398de969d80
- Priority: high
- External source: (none)
- External id: (none)
- Labels: agent-ready, bug, cdp-required, middle-flow, runner-error

### Plane Description

Human gate accepted the RCA partition for GitHub #33. This child issue is scoped from parent BLP-1; do not treat the parent report as one implementation scope.

Source: https://github.com/Jasper-1024/block-link-plus/issues/33

Canonical RCA artifact in runner workspace: docs/agent/runs/BLP-1/rca-review.md

Scope: leaf-switch lifecycle/remount failure for inline editing embeds.

Confirmed runtime symptom: after opening host A, opening host B, then returning to host A without reopening the file, the embed shell remains is-loaded but loses both .blp-inline-edit-root and .blp-inline-edit-host, leaving no visible inline editor.

Accepted RCA: the failure is in the inline-edit lifecycle/remount path. The stronger hypothesis is that layout-change calls refreshLivePreviewObservers() without forceRescan, while cleanupHiddenEmbeds() can detach hidden-leaf embeds; when the leaf becomes active again, the already-observed view is not forced to rescan existing embed DOM.

Next stage may proceed to a bounded fix design, but it should first verify the forced-rescan/remount trigger and avoid folding Reading View or undo behavior into this issue.

Required validation: real Obsidian/CDP runtime evidence plus a regression check for returning to a previously viewed file.

## Source Fetch

- Status: fetched
- Fetched at: 2026-06-15T17:27:05Z
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
