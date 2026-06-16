# Source Issue Snapshot

## Tracker

- Title: [GitHub #36] Android embed scrolling jumps back to initial position
- Plane id: 40226c7e-7abc-4d9e-b30d-198dfe356579
- Priority: high
- External source: github
- External id: Jasper-1024/block-link-plus#36
- Labels: agent-ready, bug, cdp-required

### Plane Description

Confirmed bug imported from GitHub issue #36.

Source: https://github.com/Jasper-1024/block-link-plus/issues/36

User report: while scrolling a note with embeds, the scroll position repeatedly jumps back to the initial place.

Environment reported by user: latest Obsidian and latest Block Link Plus on Android 13.

Attachment on GitHub: 20260527_023622_001.mp4.zip. The reporter says to remove the .zip suffix without unzipping, then view it as the screenplay.

Required workflow: treat this as cdp-required/runtime-first investigation. First prove or disprove the Android/embed scroll-jump behavior and identify the root cause before fix design or implementation.

## Source Fetch

- Status: fetched
- Fetched at: 2026-06-16T08:39:00Z
- Source URL: https://github.com/Jasper-1024/block-link-plus/issues/36

## GitHub Issue

- Title: [BUG] while scrolling the note current position always falsely returns back
- State: open
- Author: palashman
- Created: 2026-05-27T00:02:07Z
- Updated: 2026-06-09T10:22:02Z
- URL: https://github.com/Jasper-1024/block-link-plus/issues/36

### Body

Hi,

When I scroll along the note with embeds, the scrolling position always mistakenly returns back automaticaly. I.e. I'm scrolling, scrolling, scrolling and then scrolling position jumps back to the initial place.

See screenplay (please remove `.zip` from filename, wo unzipping, just rename).

[20260527_023622_001.mp4.zip](https://github.com/user-attachments/files/28288808/20260527_023622_001.mp4.zip)

I use the last versions of Obsidian and this plugin on Android 13.

## GitHub Comments

### Comment 1

- Author: Jasper-1024
- Created: 2026-06-09T10:22:02Z
- URL: https://github.com/Jasper-1024/block-link-plus/issues/36#issuecomment-4658801319

For some reason, my email system malfunctioned, so I didn't receive any notifications. 
Yes, I just saw the issue and am currently working on it.
