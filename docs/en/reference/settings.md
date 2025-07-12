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
- **enable_right_click_editable_embed** - Enable editable embed menu
- **enable_right_click_url** - Enable URI link menu

### Notification Settings
- **enable_block_notification** - Show notification when copying block links
- **enable_embed_notification** - Show notification when copying embed links
- **enable_editable_embed_notification** - Show notification when copying editable embeds
- **enable_url_notification** - Show notification when copying URIs

### Alias Configuration
- **alias_type** - Alias type (0=none, 1=first X chars, 2=heading, 3=selected text)
- **alias_length** - Alias length (1-100)

## Block ID

- **enable_prefix** - Enable custom prefix
- **id_prefix** - Block ID prefix
- **id_length** - Block ID length (3-7)
- **heading_id_newline** - Heading block ID newline (experimental)

## Time Sections

- **enable_time_section** - Enable time section functionality
- **enable_time_section_in_menu** - Show in right-click menu
- **time_section_format** - Time format (e.g. "HH:mm")
- **time_section_title_pattern** - Title matching pattern
- **time_section_plain_style** - Use plain text style in preview
- **insert_heading_level** - Enable automatic heading level
- **daily_note_pattern** - Daily note filename pattern
- **daily_note_heading_level** - Heading level in daily notes (1-6)

## Timeline

- **enableTimeline** - Enable timeline functionality
- **timelineDefaultHeadingLevel** - Default heading level (1-6)
- **timelineDefaultEmbedFormat** - Default embed format ('!![[]]' or '![[]]')
- **timelineDefaultSortOrder** - Default sort order ('asc' or 'desc')

## Flow Editor

- **editorFlow** - Enable embedded block editing
- **editorFlowStyle** - Editing style ("minimal" or "seamless")

## Default Values

```json
{
  "mult_line_handle": 0,
  "alias_type": 0,
  "alias_length": 20,
  "enable_prefix": false,
  "id_prefix": "",
  "id_length": 4,
  "enable_time_section": true,
  "time_section_format": "HH:mm",
  "daily_note_heading_level": 2,
  "enableTimeline": true,
  "timelineDefaultHeadingLevel": 4,
  "editorFlow": true,
  "editorFlowStyle": "minimal"
}
```