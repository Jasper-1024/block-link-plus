# Block Link Plus

[copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link/tree/main) is one of my most frequently used plugins. However, it has always lacked support for creating multi-line text blocks. Therefore, I attempted to write block-link-plus. block-link-plus supports the creation of multi-line text blocks and offers more customization for block IDs.

for chinese version, please refer to [README_zh.md](README_zh.md)

## Usage

The plugin provides multiple ways to access its features:
- Right-click menu in editor
- Command palette
- Configurable menu items (can be enabled/disabled in settings)

The basic usage is the same as [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link/tree/main).

![image](https://github.com/Jasper-1024/obsidian-block-link-plus/blob/d5ed80a5f370cd1159dfd9669d796583b471dc13/user_case.gif)

## Features

### Block Link Types

The plugin supports three types of block links:
- Regular link: Copy block/heading as a regular link
- Embed: Copy block/heading as an embed
- Obsidian URI: Copy block/heading as an Obsidian URI for external access

### Block Link Alias

You can customize how block link aliases are generated:
- Default: No alias
- First x characters: Use the first x characters of the block content as alias (length configurable in settings)
- Heading: Use the nearest heading as alias
- Selected text: Use the selected text as alias (length configurable in settings)

The alias feature only applies to regular block links (not for embeds or URIs).
For heading blocks, the heading text will always be used as the alias unless 'No alias' is selected.

### Multi-line Text Blocks

Here, multi-line text specifically refers to: selected text that does not contain any titles across multiple lines.

Obsidian's block reference has not yet supported the creation of multi-line text blocks. block-link-plus uses two methods as a workaround.

The first method is using headings: adding the selected text to a new heading and copying the link pointing to that heading.
- Distinguish using `˅id` from normal headings
- Modify the rendering of `## ˅id` under reading mode and live preview to make it more similar to a normal block reference
- Control heading ID newline behavior with experimental option `heading_id_newline`

```bash
## ˅id
abc
def
## ^id

[[file#˅id]]
```

The second method creates multiple block references: batch creating multiple sets of block references and copying them to the clipboard
- This feature is inspired by @[Text Transporter](https://github.com/TfTHacker/obsidian42-text-transporter)

```bash
abc ^id1

def ^id2

gh ^id3

[[file#^id1]]
[[file#^id2]]
[[file#^id3]]
```

### Custom Block ID

Block ID = prefix-random characters
- Customize the prefix of the block ID and the length of random characters (3-7)

This feature currently does not have more practical uses, but perhaps more aggregation operations can be performed through the prefix of the block ID.

### Time Section

The Time Section feature allows you to quickly insert timestamps as headings, which is particularly useful for daily notes and meeting notes:

- Insert timestamps in configurable format (default: HH:mm)
- Special handling for daily notes with customizable filename pattern detection
- Automatic heading level determination based on document structure
- Option to display time sections as plain text in preview mode
- Accessible through command palette and context menu (optional)

```bash
## 09:30
Meeting notes...

## 14:15
Follow-up discussion...
```

### Embed Block Editing
This feature allows you to edit embedded blocks and headings in real-time directly within your notes, without having to navigate to the original file, providing a seamless writing experience.

To enable, go to `Settings -> Block Link Plus`, find the 'Embedded Block Editing' section, and toggle `Enable Embedded Block Editing`. You can also choose between two editing styles:
- **minimal**: Provides a clearer boundary for the editing area.
- **seamless**: Makes the embedded block look like a natural part of the current note.

### Timeline
The `blp-timeline` is a powerful query and aggregation tool. It can automatically fetch sections from your vault (especially daily notes) based on headings, tags, links, and other conditions, and display them in a chronological timeline.

**Workflow:**
1.  **Record (Produce):** Use the 'Time Section' feature or manually create headings with timestamps in your daily notes (e.g., `#### 10:30 Project Meeting`).
2.  **Aggregate (Consume):** In any note, create a `blp-timeline` code block and write a YAML configuration to define the aggregation rules. This will generate a dynamic, auto-updating timeline.

**Configuration:**
Here is an advanced example of the YAML configuration:
```yaml
---
source_folders:
  - "journal/daily"
within_days: 7
sort_order: desc
heading_level: 4
embed_format: '!![[]]'
time_pattern: '(\\d{2}:\\d{2})'
filters:
  relation: AND
  tags:
    items:
      - '#meeting'
      - '#project-A'
---
```
**YAML Options:**
- `source_folders`: (Required) Specify which folders to search in.
- `heading_level`: (Optional, default: 4) The heading level (1-6) to fetch.
- `time_pattern`: (Optional) A regex to extract the time from the heading text. For a heading `#### 14:30 Meeting`, you could use `(\\d{2}:\\d{2})` to match `14:30`.
- `embed_format`: (Optional, default: `!![[]]`) Defines if the generated link is an embed (`!![[]]`) or a regular link (`![[]]`).
- `sort_order`: (Optional, default: `desc`) Sort order by date: `asc` (ascending) or `desc` (descending).
- `within_days`: (Optional) Only include notes from the last N days.
- `filters`: (Optional) Advanced filters to select sections by `tags` or `links`, with `AND`/`OR` relations.

## Changelog

### 1.4.0
- Added **Embed Block Editing** feature for a seamless inline editing experience.
- Added **Timeline** feature (`blp-timeline`) to dynamically query and aggregate sections from your vault.
- Migrated project to a standardized structure with source code in the `src` directory.
- Refactored major components like Flow Editor into separate modules for better maintainability.

### 1.3.0
- Added Time Section feature for inserting timestamps as headings
- Added automatic heading level determination for time sections
- Added special handling for daily notes with customizable pattern matching
- Added option to display time sections as plain text in preview mode
- Improved heading analysis with better level detection
- Fixed cursor positioning after inserting elements

### 1.2.4
- Added validation for edge cases in heading analysis to improve stability
- Enhanced error handling for the analyzeHeadings function
- Fixed potential issues when start_line and end_line are both zero

### 1.2.3
- Improved multi-line block handling, especially for list items
- Enhanced alias generation for multi-line blocks
- Added configurable notifications for block link copying
- Fixed list block ID handling and positioning
- Improved selected text handling for aliases

### 1.2.0
- Reorganized settings menu structure for better usability
- Fixed heading block handling when text contains headings
- Added experimental option: heading_id_newline for controlling heading block ID newline behavior
- Improved settings text clarity and organization

### 1.1.3
- Fixed block ID handling for list items
- Optimized block ID insertion position for list type blocks
- Improved list block handling logic

### 1.1.2
- Added new block link alias type: Selected text
- Improved alias handling for heading blocks
- Fixed alias generation for single-line blocks
- Enhanced alias type configuration options
- Improved documentation and settings descriptions

### 1.1.0
- Added support for Obsidian URI links
- Added customizable block link alias types:
  - First x characters of block content
  - Nearest heading title
- Improved command and menu text for better clarity
- Fixed consistency between command palette and right-click menu functionality

## License

Block Link Plus is released under GNU GPLv3 (License).

## Thanks

Block Link Plus is my first Obsidian plugin. During the development process, I referred to a large number of existing plugins. I am grateful to these open-source projects.
- [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link/tree/main)
- [Text Transporter](https://tfthacker.com/transporter)
- [rendered-block-link-suggestions](https://github.com/RyotaUshio/obsidian-rendered-block-link-suggestions)
- [linkify](https://github.com/matthewhchan/linkify)