# Why
The File Outliner View (v2) already stores Obsidian-native task markers (`- [ ]`, `- [x]`) in block text, but the UX is incomplete:
- Task markers are hard to scan in a Logseq-like outliner.
- Users need a fast, reliable way to toggle task status and to convert a block between task vs normal.
- These interactions must remain Obsidian-compatible on disk (Dataview/Tasks plugins, mobile consumption, and native embeds).

# What Changes
- Render task blocks with a checkbox UI in the outliner display surface (hide the `[ ]` / `[x]` prefix from the rendered text).
- Add two system-registered commands (Hotkeys / Command Palette):
  - Toggle task status (`[ ]` ↔ `[x]`)
  - Toggle task marker (task ↔ normal block)
- Add bullet context menu actions to convert task ↔ normal block.
- Document the behavior in the Outliner settings tab (i18n-supported text).

# Impact
- Display change: outliner task blocks no longer show the literal `[ ]` / `[x]` prefix; they show a checkbox + the remaining text.
- File format remains unchanged and stays Obsidian-native (`- [ ] ...` / `- [x] ...` on disk).
- No change to outliner structure rules: block-internal list/headings are still validated and sanitized (non-structural).

