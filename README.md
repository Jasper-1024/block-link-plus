# Block Link Plus

Enhances Obsidian's right-click menu and global command with direct links to blocks and titles, adds support for multi-line blockquotes, and offers extensive customization options for block IDs.

[![Version](https://img.shields.io/badge/version-1.7.6-blue.svg)](https://github.com/Jasper-1024/obsidian-block-link-plus/releases)
[![Downloads](https://img.shields.io/github/downloads/Jasper-1024/obsidian-block-link-plus/total.svg)](https://github.com/Jasper-1024/obsidian-block-link-plus/releases)

![Demo](user_case.gif)

## 🚀 Key Features

- **Multi-line Block References** - Innovative `^abc123-abc123` format for precise multi-line references
- **Timeline Aggregation** - Extract and organize time-based content from multiple files
- **Inline Editing** - Edit embedded blocks directly without file switching
- **Time Sections** - Quick timestamp insertion with auto-level detection
- **Smart Aliases** - Content-based link descriptions

## 📦 Installation

### Community Plugins (Recommended)
1. Open Obsidian Settings → Community Plugins
2. Search "Block Link Plus" → Install → Enable

### Manual Installation
1. Download latest [release](https://github.com/Jasper-1024/obsidian-block-link-plus/releases)
2. Extract to `.obsidian/plugins/block-link-plus/`
3. Restart Obsidian and enable

## 🔧 Quick Start

1. Select text → Right-click → Choose block link type
2. Use Command Palette: "Copy Block Link" 
3. For multi-line: Select multiple lines → Create range blocks

## 📖 Documentation

**Complete documentation available at:** https://block-link-plus.jasper1024.com/

- [Installation Guide](https://block-link-plus.jasper1024.com/install/)
- [Multi-line Blocks](https://block-link-plus.jasper1024.com/usage/multiline/)
- [Timeline Feature](https://block-link-plus.jasper1024.com/usage/timeline/)
- [Settings Reference](https://block-link-plus.jasper1024.com/reference/settings/)

### Language Support
- [English](https://block-link-plus.jasper1024.com/en/) 
- [简体中文](https://block-link-plus.jasper1024.com/)
- [繁體中文](https://block-link-plus.jasper1024.com/zh-TW/)

## 🆕 What's New in v1.7.5

- Enhanced multi-line block handling with improved `^abc123-abc123` format
- Better flow editor integration and performance
- Updated Chinese localization
- Improved settings organization

## 📋 Changelog

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
| `![[file#^id]]` | Embed | Display block content |
| `!![[file#^id]]` | Editable | Inline editing capability |
| `obsidian://...` | URI | External app access |

## 📋 Requirements

- Obsidian 0.15.0+
- [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin (for Timeline feature)

## 🙏 Acknowledgments

Built with inspiration from excellent open-source projects:

- [Obsidian-Basics](https://github.com/Make-md/Obsidian-Basics) - Editable block foundation
- [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link) - Block reference basics
- [Text Transporter](https://github.com/TfTHacker/obsidian42-text-transporter) - Multi-block processing

## 📄 License

GNU GPLv3 License - see [LICENSE](LICENSE) file for details.

## 🐛 Support

- [GitHub Issues](https://github.com/Jasper-1024/obsidian-block-link-plus/issues)
- [Documentation](https://block-link-plus.jasper1024.com/)
- [Chinese README](README_zh.md)