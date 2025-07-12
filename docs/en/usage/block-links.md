# Block Links

Convert text into referenceable blocks supporting four link formats.

## Usage Methods

### Right-click Menu
1. Select text
2. Right-click → choose link type

### Command Palette
- `Copy Block Link` - Regular link
- `Copy Block as Embed` - Embed link  
- `Copy Block as Editable Embed` - Editable embed
- `Copy Block as Obsidian URI` - URI link

## Link Formats

| Type | Format | Purpose |
|------|--------|---------|
| Regular Link | `[[file#^abc123]]` | Normal reference |
| Embed Link | `![[file#^abc123]]` | Display content |
| Editable Embed | `!![[file#^abc123]]` | Editable display |
| URI Link | `obsidian://open?vault=...` | External access |

## Alias Types

Configure alias generation in settings:

- **No Alias** - `[[file#^abc123]]`
- **First X Characters** - `[[file#^abc123|content beginning...]]`
- **Parent Heading** - `[[file#^abc123|## Meeting Notes]]`
- **Selected Text** - `[[file#^abc123|important paragraph]]`

## Block ID Settings

- **Prefix** - Custom ID prefix like `meeting-abc123`
- **Length** - 3-7 characters (default 4)
- **Notifications** - Show confirmation when copying

## Heading Blocks

When selecting heading lines:
- Automatically use heading content as link target
- Option to place ID on new line (experimental)