# Settings Reference

Detailed explanation of all configuration options.

## Settings UI (Tabs + Search)

Since v1.9.0, Block Link Plus settings are grouped into tabs and support cross-tab search:
- Tabs: `Basics` / `Enhanced List` / `Built-in Plugins`
- Search: type keywords (e.g. `zoom`, `handle`, `blp-view`) to filter settings across tabs; click a tab or press `Esc` to exit search mode.

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
- **enhancedListHideSystemLine** - Hide the system line in Live Preview/Reading mode
- **enhancedListHandleAffordance** - Show list handle affordance (Live Preview + enabled files only)
- **enhancedListHandleActions** - Enable list handle actions (Live Preview + enabled files only)
- **enhancedListHandleClickAction** - List handle left-click action (`toggle-folding` | `select-block` | `menu` | `none`)
- **enhancedListIndentCodeBlocks** - Indent nested fenced code blocks (Live Preview + enabled files only)
- **enhancedListDeleteSubtreeOnListItemDelete** - Delete children when deleting a list item
- **blpViewAllowMaterialize** - Allow `render.mode: materialize` writeback
- **blpViewMaxSourceFiles** - Max source files per view (`0` = unlimited)
- **blpViewMaxResults** - Max rendered results (`0` = unlimited)
- **blpViewShowDiagnostics** - Show diagnostics (counts + timing) under output

## Built-in Outliner / Zoom

- **builtInObsidianOutlinerEnabled** - Enable built-in Outliner (vendored `obsidian-outliner@4.9.0`)
- **builtInObsidianOutlinerSettings** - Built-in Outliner settings object (kept compatible with upstream)
- **builtInObsidianZoomEnabled** - Enable built-in Zoom (vendored `obsidian-zoom@1.1.2`)
- **builtInObsidianZoomSettings** - Built-in Zoom settings object (kept compatible with upstream)
- **builtInVslinkoScopeToEnhancedList** - Scope built-in list UX to Enhanced List enabled files (Live Preview only)

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
  "enhancedListHideSystemLine": true,
  "enhancedListHandleAffordance": true,
  "enhancedListHandleActions": true,
  "enhancedListHandleClickAction": "toggle-folding",
  "enhancedListIndentCodeBlocks": true,
  "enhancedListDeleteSubtreeOnListItemDelete": false,
  "blpViewAllowMaterialize": true,
  "blpViewMaxSourceFiles": 0,
  "blpViewMaxResults": 0,
  "blpViewShowDiagnostics": false,
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
  "builtInVslinkoScopeToEnhancedList": false,
  "inlineEditEnabled": true,
  "inlineEditFile": false,
  "inlineEditHeading": true,
  "inlineEditBlock": true,
  "lastSeenVersion": ""
}
```
