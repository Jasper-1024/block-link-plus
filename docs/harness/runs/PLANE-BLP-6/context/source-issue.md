# Source Issue Snapshot

## Tracker

- Title: BLP-5 child: harden inline edit file-embed mount against mock scroll jumps
- Plane id: d2539dc6-9958-4c3c-8a3c-fd9a15262024
- Priority: medium
- External source: (none)
- External id: (none)
- Labels: afk, agent-ready, bug

### Plane Description

Parent: BLP-5 / GitHub #36.

Mitigation child accepted by RCA review: harden the BLP inline edit file-embed mount path found by mock evidence. This child does not prove the original Android Mobile scroll-jump bug fixed.

Acceptance criteria

Add or preserve a red/green test for a Live Preview ![[MOC]] file embed with inlineEditFile enabled proving automatic mount does not call embedded editor setCursor, scrollIntoView, synthetic focus, or other host scroll-moving APIs.

Preserve intentional non-passive outliner/user-command cursor and reveal behavior.

Patch the smallest proven owner path, likely mountInlineEmbedCore, prepareEmbedShell, attachHostRemeasure, or EmbedLeafManager reparent behavior, without broad inline edit changes.

Validate with corepack pnpm test -- InlineEditEngine.file-embed.test.ts InlineEditEngine.mount-scroll.test.ts --runInBand, corepack pnpm run build-with-types, and fixed-port Desktop CDP smoke showing BLP loads.

State in the child artifact that Android Mobile root cause remains unproved.

Non-goals: do not require Android 13 or Obsidian Mobile for this child; do not close the parent Android RCA; do not add native Android/WebView workarounds without runtime evidence; do not broaden into unrelated outliner, journal, or enhanced-list behavior.

## Source Fetch

- Status: not_configured
- Fetched at: 2026-06-25T05:02:05Z
- Source URL: (none)
- Error: No supported GitHub issue URL was configured.

## GitHub Comments

(none)
