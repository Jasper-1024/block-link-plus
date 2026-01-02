# Block Link Plus

Obsidian block link enhancement plugin designed to improve note reference efficiency.

## Core Features

- **Multi-line Block References** - Innovative `^abc123-abc123` range identifier for multi-line references
- **Timeline Aggregation** - Extract time headings from multiple files, display in chronological order
- **Inline Editing** - Edit embedded block content directly without jumping to original file
- **Time Sections** - Insert current time as heading with automatic level detection
- **Smart Aliases** - Display block content summary instead of random IDs

## Quick Start

1. Search "Block Link Plus" in Community Plugins
2. Enable the plugin
3. Right-click selected text → "Copy Block Link"

## Link Types

- `[[file#^abc123]]` - Regular block reference
- `![[file#^abc123]]` - Embedded block (editable in Live Preview when enabled)
- `![[file#^abc123-abc123]]` - Embedded range (multi-line)
- `obsidian://open?vault=...` - URI link

## Acknowledgments

Block Link Plus is inspired by excellent open-source projects:

- **Editable Block Functionality** - Adapted from [Obsidian-Basics](https://github.com/Make-md/Obsidian-Basics)
- **Block Reference Foundation** - Inspired by [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link)
- **Multi-block Processing** - Inspired by [Text Transporter](https://github.com/TfTHacker/obsidian42-text-transporter)

Thanks to all open-source contributors for their efforts in the Obsidian ecosystem.

## Dependencies

Timeline functionality requires the [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin.
