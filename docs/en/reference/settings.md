# Settings Reference

Detailed explanation of all configuration options.

## Multi-line Block Behavior

**mult_line_handle**
- `0` - Default processing
- `1` - Add new heading
- `2` - Add multiple blocks
- `3` - Add multi-line block

## Block Links

### Right-click Menu
- **enable_right_click_block** - Enable regular block link menu
- **enable_right_click_embed** - Enable embed link menu
- **enable_right_click_url** - Enable URI link menu

### Notification Settings
- **enable_block_notification** - Show notification when copying block links
- **enable_embed_notification** - Show notification when copying embed links
- **enable_url_notification** - Show notification when copying URIs

### Alias Configuration
- **alias_type** - Alias type (0=none, 1=first X chars, 2=heading, 3=selected text)
- **alias_length** - Alias length (1-100)

## Block ID

- **enable_prefix** - Enable custom prefix
- **id_prefix** - Block ID prefix
- **id_length** - Block ID length (3-7)
- **heading_id_newline** - Heading block ID newline (experimental)

## Enhanced List Blocks

- **enhancedListEnabledFolders** - Enabled folders (vault-relative paths)
- **enhancedListEnabledFiles** - Enabled files (vault-relative paths)

## Built-in Outliner / Zoom

- **builtInObsidianOutlinerEnabled** - Enable built-in Outliner (vendored `obsidian-outliner@4.9.0`)
- **builtInObsidianOutlinerSettings** - Built-in Outliner settings object (kept compatible with upstream)
- **builtInObsidianZoomEnabled** - Enable built-in Zoom (vendored `obsidian-zoom@1.1.2`)
- **builtInObsidianZoomSettings** - Built-in Zoom settings object (kept compatible with upstream)

## Inline Edit

- **inlineEditEnabled** - Global toggle
- **inlineEditFile** - Allow `![[file]]` to be editable in Live Preview
- **inlineEditHeading** - Allow `![[file#Heading]]` to be editable in Live Preview
- **inlineEditBlock** - Allow `![[file#^id]]` / `![[file#^id-id]]` to be editable in Live Preview

## Default Values

```json
{
  "mult_line_handle": 0,
  "alias_type": 0,
  "alias_length": 20,
  "enable_right_click_block": true,
  "enable_right_click_embed": true,
  "enable_right_click_url": false,
  "enable_prefix": false,
  "id_prefix": "",
  "id_length": 4,
  "heading_id_newline": false,
  "enable_block_notification": true,
  "enable_embed_notification": true,
  "enable_url_notification": true,
  "enhancedListEnabledFolders": [],
  "enhancedListEnabledFiles": [],
  "builtInObsidianOutlinerEnabled": false,
  "builtInObsidianOutlinerSettings": {
    "styleLists": true,
    "debug": false,
    "stickCursor": "bullet-and-checkbox",
    "betterEnter": true,
    "betterVimO": true,
    "betterTab": true,
    "selectAll": true,
    "listLines": false,
    "listLineAction": "toggle-folding",
    "dnd": true,
    "previousRelease": null
  },
  "builtInObsidianZoomEnabled": false,
  "builtInObsidianZoomSettings": {
    "debug": false,
    "zoomOnClick": true,
    "zoomOnClickMobile": false
  },
  "inlineEditEnabled": true,
  "inlineEditFile": false,
  "inlineEditHeading": true,
  "inlineEditBlock": true
}
```
