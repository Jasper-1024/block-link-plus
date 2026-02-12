# Design: update-file-outliner-view-display-interactions

## Principles
- File-level isolation: only applies inside `FileOutlinerView` DOM.
- Minimal, explicit bridges over implicit “magic” class hacks.
- Prefer event delegation and service APIs over per-block observers.

## Internal Link Navigation
`MarkdownRenderer` can generate `.internal-link` anchors, but Outliner View is not a native Markdown preview container, so Obsidian does not attach its usual navigation handlers.

Solution:
- Install a single capture-phase click handler on the outliner root.
- If the click target is inside `a.internal-link` (and not inside an embedded MarkdownView), call:
  - `app.workspace.openLinkText(href, sourcePath, newLeaf)`
  - `href` from `data-href` (preferred) or `href`
  - `sourcePath` defaults to the outliner file path; if the link is inside an embed preview, prefer the embed’s file path for correct relative resolution.

## Inline Edit for Embeds in Outliner Display
InlineEditEngine currently mounts editors only for embeds in Live Preview (`.markdown-source-view`).
Outliner display is not Live Preview, so it is skipped by design.

Solution:
- Add a public InlineEditEngine API for mounting an embed editor outside Live Preview, explicitly scoped to Outliner View.
- FileOutlinerView installs a single click handler:
  - When inline edit is enabled and user clicks a `.internal-embed.markdown-embed` (non-link area), request InlineEditEngine to mount the inline editor into that embed element and focus it.

## Safety
- Never mount inside normal MarkdownView reading mode; Outliner-only opt-in guard is required.
- Avoid intercepting clicks inside inline-edit embed leaves (`.blp-inline-edit-active`, `.markdown-source-view`) to prevent breaking embedded editors.

