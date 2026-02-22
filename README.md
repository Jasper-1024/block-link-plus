# Block Link Plus

Block links + multi-line ranges + a Logseq-like outliner workflow for Obsidian: copy links/embeds/URIs to blocks & headings, create multi-line range blocks, and use `blp-view` (Dataview-backed) to query/render list blocks in scoped files.

[![Version](https://img.shields.io/badge/version-2.0.2-blue.svg)](https://github.com/Jasper-1024/obsidian-block-link-plus/releases)
[![Downloads](https://img.shields.io/github/downloads/Jasper-1024/obsidian-block-link-plus/total.svg)](https://github.com/Jasper-1024/obsidian-block-link-plus/releases)

## 🚀 Key Features

- **Multi-line Block References** - Create precise range blocks with the `^abc123-abc123` format
- **Outliner (Logseq-like) + `blp-view`** - Treat list items as blocks in scoped files; keep stable `^id` + hidden system metadata; query/render with `blp-view` (Dataview required)
- **Inline Editing** - Edit embedded blocks/headings directly in Live Preview (when enabled)
- **Smart Aliases** - Content-based link descriptions when copying links

## demo

### base

https://github.com/user-attachments/assets/5a0f0a32-42a3-4c23-8b38-17542c5ec072

### inline edit

https://github.com/user-attachments/assets/d34b9be4-9a1b-4d00-9a87-1b70463dc8d7

### outliner

https://github.com/user-attachments/assets/ea7f1d24-7845-4957-aa9c-7309af0a3514

## 📦 Installation

### Community Plugins (Recommended)
1. Open Obsidian Settings → Community Plugins
2. Search "Block Link Plus" → Install → Enable

### Manual Installation
1. Download latest [release](https://github.com/Jasper-1024/obsidian-block-link-plus/releases)
2. Extract to `.obsidian/plugins/block-link-plus/`
3. Restart Obsidian and enable

## 🔧 Quick Start

1. Select a block/heading → Right-click → Choose link type (link / embed / URI), or use Command Palette: "Copy Block Link" / "Copy Block as Embed" / "Copy Block as Obsidian URI"
2. Multi-line: Select multiple lines → (Settings: pick a multi-line handling mode) → create a range block (`^id-id`)
3. Outliner & `blp-view`: enable scope (Settings: enabled folders/files, or frontmatter `blp_outliner: true`) → use a `blp-view` code block to query/render

## 📖 Documentation

**Complete documentation available at:** https://block-link-plus.jasper1024.com/

- [Installation Guide](https://block-link-plus.jasper1024.com/install/)
- [Multi-line Blocks](https://block-link-plus.jasper1024.com/usage/multiline/)
- [Outliner & blp-view](https://block-link-plus.jasper1024.com/usage/outliner/)
- [Settings Reference](https://block-link-plus.jasper1024.com/reference/settings/)

### Language Support
- [English](https://block-link-plus.jasper1024.com/en/) 
- [简体中文](https://block-link-plus.jasper1024.com/)
- [繁體中文](https://block-link-plus.jasper1024.com/zh-TW/)

### Community
- [Telegram Channel](https://t.me/blocklinkplus)
- [Telegram Chat](https://t.me/+QqmqUG-jSeY2ODNh)

## 🆕 What's New in 2.0

- Outliner becomes the main workflow (Logseq-like list blocks in scoped files)
- Outliner edit mode supports core editor shortcuts (Ctrl+B, etc.) via an editor command bridge (strict allowlist)
- Unified scope model: enabled folders/files + per-file frontmatter `blp_outliner: true/false`
- `blp-view` aligns with the Outliner scope model (no more “silent cross-scope” reads)
- Removed legacy Timeline / Time Section features

## 📋 Changelog

### 2.0.2
- Fix: Outliner display-mode embed preview (`![[...]]`) now renders closer to the inline editor (spacing/indent; avoid clipped list markers)

### 2.0.1
- Outliner: editor command bridge (core shortcuts like Ctrl+B) + strict plugin allowlist
- New settings: `fileOutlinerEditorCommandBridgeEnabled`, `fileOutlinerEditorCommandAllowedPlugins` (keep `core` for core shortcuts)

### 2.0.0
- Outliner becomes the main workflow (Logseq-like list blocks in scoped files)
- Unified scope model: enabled folders/files + per-file frontmatter `blp_outliner: true/false`
- `blp-view` aligns with the Outliner scope model
- Removed legacy Timeline / Time Section features

### 1.8.1
- Fix: Inline Edit preserves list item children when embedding list-item block references (e.g., `#^123`)
- Fix: Inline Edit no longer shows the embedded backlinks panel ("Link to current file")

### 1.8.0
- Inline Edit migrated to a native leaf-based engine (ported from sync-embeds)
- Removed legacy `!![[...]]` embed syntax
- Multi-line blocks: improved `^id-id` range creation and rendering stability
- Fix: list item range markers stay scoped; IDs inserted at item end when needed (#22/#27)
- Fix: reading-mode postprocessor no longer blanks notes/embeds (#29)
- New: show a What's New modal once after upgrade

### 1.7.5
- Enhanced multi-line block handling by extracting actual links without aliases in markdown processing and flow editor
- Update regex patterns to support both alias and non-alias formats
- Fix typo in settings for block ID prefix and update localization files for Chinese and Traditional Chinese
- Add new command for copying blocks as editable embeds
- Update UIMultilineBlock to conditionally create line click handler based on showEditIcon prop

### 1.5.3
- Improved **Timeline** output format for better readability and organization
- Added file links as entry points for each file group
- Added separators between file groups and empty lines between content
- Preserved user customizations to embedded links
- Updated documentation with new format examples
- Fixed link matching issues in Timeline filtering

### 1.5.0
- Added **Debug Mode** to Timeline feature for troubleshooting filtering issues
- Fixed section extraction in Timeline to properly match links
- Improved Timeline filtering accuracy with basename matching
- Added hash-based optimization to prevent unnecessary file updates
- Fixed various edge cases in Timeline functionality

### 1.4.0
- Added **Embed Block Editing** feature for a seamless inline editing experience
- Added **Timeline** feature (`blp-timeline`) to dynamically query and aggregate sections from your vault
- Migrated project to a standardized structure with source code in the `src` directory
- Refactored major components like Flow Editor into separate modules for better maintainability

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

## 🔗 Link Types

| Format | Type | Usage |
|--------|------|-------|
| `[[file#^id]]` | Regular | Normal block reference |
| `![[file#^id]]` | Embed | Display block content (editable in Live Preview when enabled) |
| `![[file#^id-id]]` | Range | Display multi-line range |
| `obsidian://...` | URI | External app access |

## 📋 Requirements

- Obsidian 0.15.0+
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin (for `blp-view` Query/View)

## 🙏 Acknowledgments

Built with inspiration from excellent open-source projects:

- [sync-embeds](https://github.com/uthvah/sync-embeds/) - Leaf-based inline edit engine foundation
- [Obsidian-Basics](https://github.com/Make-md/Obsidian-Basics) - Legacy editable block foundation
- [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link) - Block reference basics
- [Text Transporter](https://github.com/TfTHacker/obsidian42-text-transporter) - Multi-block processing

## 📄 License

GNU GPLv3 License - see [LICENSE](LICENSE) file for details.

## 🐛 Support

- [GitHub Issues](https://github.com/Jasper-1024/obsidian-block-link-plus/issues)
- [Documentation](https://block-link-plus.jasper1024.com/)
- [Chinese README](README_zh.md)
