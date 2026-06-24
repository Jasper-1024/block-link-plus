# Block Link Plus

Improve Obsidian block references: copy block links/embeds/URIs, create multi-line range blocks (`^id-id`), use Outliner (Logseq-like) + `blp-view` (Query/View) in scoped files, and edit embeds inline in Live Preview.

## Core Features

- **Block links / embeds / URIs** - Copy `[[file#^id]]` / `![[file#^id]]` / `obsidian://open?...` via context menu or Command Palette
- **Multi-line range blocks** - Create precise range blocks with `^abc123-abc123` and embed via `![[file#^abc123-abc123]]`
- **Outliner + blp-view** - Treat list items as blocks in scoped files; maintain a system tail line (Dataview inline fields + `^id`); query/group/render with `blp-view` (Dataview required)
- **Inline Edit** - Edit embedded content directly in Live Preview (when enabled)
- **Smart aliases** - Generate content-based aliases when copying block links

## Quick Start

1. Search "Block Link Plus" in Community Plugins
2. Enable the plugin
3. Right-click selected text → "Copy Block Link"
4. To use Outliner: Settings → Block Link Plus → Outliner → configure enable scope (recommended: a dedicated list-first folder; or set `blp_outliner: true` in file frontmatter)

## Community

- Telegram Channel: https://t.me/blocklinkplus
- Telegram Chat: https://t.me/+QqmqUG-jSeY2ODNh

## Link Types

- `[[file#^abc123]]` - Regular block reference
- `![[file#^abc123]]` - Embedded block (editable in Live Preview when enabled)
- `![[file#^abc123-abc123]]` - Embedded range (multi-line)
- `obsidian://open?vault=...` - URI link

## Acknowledgments

Block Link Plus is inspired by excellent open-source projects:

- **Inline Edit Engine** - Ported from [sync-embeds](https://github.com/uthvah/sync-embeds/)
- **Legacy Editable Block Foundation** - Adapted from [Obsidian-Basics](https://github.com/Make-md/Obsidian-Basics)
- **Block Reference Foundation** - Inspired by [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link)
- **Multi-block Processing** - Inspired by [Text Transporter](https://github.com/TfTHacker/obsidian42-text-transporter)

Thanks to all open-source contributors for their efforts in the Obsidian ecosystem.

## Dependencies

`blp-view` (Query/View) requires the [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin.
