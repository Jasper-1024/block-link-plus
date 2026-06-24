## Context
Obsidian owns the DOM shell for an embed, including `.markdown-embed-content` and `.markdown-embed-link`. BLP inline edit replaces the preview content with an embedded editor, but it should not remove Obsidian-owned navigation affordances.

## Decision
- Preserve the native top-level `.markdown-embed-link` and rely on Obsidian for click/touch navigation semantics.
- Keep `.markdown-embed-content` connected and mount `.blp-inline-edit-host` inside it.
- Hide native preview children with CSS while allowing `.blp-inline-edit-host` to render.
- Reconcile host placement if Obsidian recreates the content wrapper; never detach the native link.

## Alternatives Considered
- Synthetic BLP jump button: rejected because it duplicates Obsidian behavior, risks mobile/theme incompatibility, and can drift from future Obsidian navigation semantics.
- Continue detaching native content/link and reinsert link elsewhere: rejected because it changes ownership/lifecycle and caused the reported regression.

## Risks
- Obsidian may recreate the content wrapper during Live Preview updates. The observer will only ensure host placement and will not remove the link.
- Native preview content must remain hidden so system tail lines do not leak while inline edit is active.
