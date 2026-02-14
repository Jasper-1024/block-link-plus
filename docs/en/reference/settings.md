# Settings Reference

This page summarizes the main settings in Block Link Plus 2.0 (based on the current code).

## Settings UI (Tabs + Search)

Block Link Plus settings are grouped into tabs and support cross-tab search:

- Tabs: `Basics` / `Outliner`
- Search: type keywords (e.g. `outliner`, `blp-view`, `zoom`) to filter settings across tabs; click a tab or press `Esc` to exit search mode

## Basics

### Multi-line blocks

**mult_line_handle**

- `0` - Default (treat multi-line selection as a single block)
- `1` - Add new heading (wrap the selection with special headings)
- `2` - Add multiple blocks (create multiple `^id` by paragraphs/list items)
- `3` - Add a multi-line range block (`^id-id`, e.g. `^abc123-abc123`)

### Block links

- **enable_right_click_block** - Enable context menu: Copy Block Link
- **enable_block_notification** - Show a notice after copying a block link
- **alias_type** - Alias type (0=none, 1=first X chars, 2=parent heading, 3=selected text)
- **alias_length** - Alias length (1-100)
- **heading_id_newline** - Put heading block ID on a new line (experimental)

### Embed links

- **enable_right_click_embed** - Enable context menu: Copy Block as Embed
- **enable_embed_notification** - Show a notice after copying an embed link

### Obsidian URI

- **enable_right_click_url** - Enable context menu: Copy Block as Obsidian URI
- **enable_url_notification** - Show a notice after copying a URI

### Block ID

- **id_length** - Random ID length (3-7; default 4)
- **enable_prefix** - Enable custom prefix
- **id_prefix** - Block ID prefix (final IDs look like `prefix-rand`)

### Inline Edit

- **inlineEditEnabled** - Global toggle
- **inlineEditFile** - Allow `![[file]]` to be editable in Live Preview
- **inlineEditHeading** - Allow `![[file#Heading]]` to be editable in Live Preview
- **inlineEditBlock** - Allow `![[file#^id]]` / `![[file#^id-id]]` to be editable in Live Preview

## Outliner

### Global toggle

- **fileOutlinerViewEnabled** - Enable Outliner routing: when enabled, scoped files open in Outliner view by default

### Enable scope

- **fileOutlinerEnabledFolders** - Enabled folder list (vault-relative; recursive)
- **fileOutlinerEnabledFiles** - Enabled file list (vault-relative)
- **Frontmatter override** (per file): `blp_outliner: true/false`

### Display & interactions

- **fileOutlinerHideSystemLine** - Hide system tail lines (with `[blp_sys:: 1]`) in Reading mode
- **fileOutlinerEmphasisLineEnabled** - Emphasis the connector line for the active block
- **fileOutlinerDragAndDropEnabled** - Drag the bullet to move a block subtree
- **fileOutlinerZoomEnabled** - Click the bullet to zoom into a block subtree

### Editing behavior

- **fileOutlinerChildrenOnSplit** - When splitting a block on Enter: `keep` | `move`
- **fileOutlinerPasteMultiline** - Pasting multi-line text: `split` | `multiline`
- **fileOutlinerBackspaceWithChildren** - Backspace at line start (when the block has children): `merge` | `outdent`

### Editor context menu (advanced)

- **fileOutlinerEditorContextMenuEnabled** - Use BLP's editor context menu inside Outliner edit mode
- **fileOutlinerEditorContextMenuAllowedPlugins** - Plugin ID allowlist that can inject items (add `core` to include core menu items)

### Debug

- **fileOutlinerDebugLogging** - Log Outliner internal errors to DevTools console

## blp-view (Query/View) guardrails

- **blpViewAllowMaterialize** - Allow `render.mode: materialize` writeback
- **blpViewMaxSourceFiles** - Max scanned files (`0` = unlimited)
- **blpViewMaxResults** - Max rendered results (`0` = unlimited)
- **blpViewShowDiagnostics** - Show diagnostics (counts + timing) under output

## Default values

```json
{
  "mult_line_handle": 0,
  "alias_type": 0,
  "enable_right_click_block": true,
  "enable_right_click_embed": true,
  "enable_right_click_url": false,
  "alias_length": 20,
  "enable_prefix": false,
  "id_prefix": "",
  "id_length": 4,
  "heading_id_newline": false,
  "enable_block_notification": true,
  "enable_embed_notification": true,
  "enable_url_notification": true,

  "fileOutlinerEnabledFolders": [],
  "fileOutlinerEnabledFiles": [],
  "fileOutlinerHideSystemLine": true,
  "fileOutlinerViewEnabled": true,
  "fileOutlinerDragAndDropEnabled": true,
  "fileOutlinerZoomEnabled": true,
  "fileOutlinerEmphasisLineEnabled": true,
  "fileOutlinerDebugLogging": false,
  "fileOutlinerChildrenOnSplit": "keep",
  "fileOutlinerPasteMultiline": "split",
  "fileOutlinerBackspaceWithChildren": "merge",
  "fileOutlinerEditorContextMenuEnabled": true,
  "fileOutlinerEditorContextMenuAllowedPlugins": [],

  "blpViewAllowMaterialize": true,
  "blpViewMaxSourceFiles": 0,
  "blpViewMaxResults": 0,
  "blpViewShowDiagnostics": false,

  "inlineEditEnabled": true,
  "inlineEditFile": false,
  "inlineEditHeading": true,
  "inlineEditBlock": true,

  "lastSeenVersion": ""
}
```

