# Command Reference

All available commands and what they do.

## Block Links (copy to clipboard)

### Copy Block Link
- **ID**: `copy-link-to-block`
- **Function**: Copy a regular block link `[[file#^id]]`
- **Hotkey**: customizable

### Copy Block as Embed
- **ID**: `copy-embed-to-block`
- **Function**: Copy an embed link `![[file#^id]]`
- **Hotkey**: customizable

### Copy Block as Obsidian URI
- **ID**: `copy-url-to-block`
- **Function**: Copy an Obsidian URI for external access
- **Hotkey**: customizable

## Inline Edit

### Toggle Inline Edit
- **ID**: `mk-flow-editor`
- **Function**: Toggle Inline Edit (setting: `inlineEditEnabled`)
- **Note**: Only affects whether embeds can be edited in Live Preview; does not affect block links / Outliner

## Outliner

### Outliner: Toggle task status
- **ID**: `file-outliner-toggle-task-status`
- **Function**: Toggle task status in Outliner view (`[ ]` ↔ `[x]`)
- **Default hotkey**: `Mod+Enter`

### Outliner: Toggle task marker
- **ID**: `file-outliner-toggle-task-marker`
- **Function**: Toggle between normal block and task block (`- ...` ↔ `- [ ] ...`)
- **Default hotkey**: `Mod+Shift+Enter`

## How to use

### Command Palette
1. Press `Ctrl+P` (or `Cmd+P`) to open the Command Palette
2. Search by name
3. Press Enter to run

### Hotkeys
1. Settings → Hotkeys
2. Search "Block Link Plus"
3. Bind hotkeys to commands you use often

### Suggested hotkeys

```
Ctrl+Shift+B  → Copy Block Link
Ctrl+Shift+E  → Copy Block as Embed
Ctrl+Shift+U  → Copy Block as URI
```

## Availability

- `Copy Block*`: works in the Markdown editor when a selection exists or the cursor is inside a parseable block/heading.
- `Outliner*`: only available when the active view is Outliner.
- Context menu entries can be disabled in settings, but the Command Palette / hotkeys can still be used.

