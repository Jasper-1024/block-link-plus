# Changelog

Version history and new features for Block Link Plus.

## v1.7.6 (Current)

- Fixed Timeline link matching to support full path link formats (e.g., `[[Task/path/file.md|alias]]`)
- Improved link matching with dual strategy: path resolution + basename matching
- Maintained backward compatibility with existing short-form links

## v1.7.5

- Enhanced multi-line block handling by extracting actual links without aliases in markdown processing and flow editor
- Update regex patterns to support both alias and non-alias formats
- Fix typo in settings for block ID prefix and update localization files for Chinese and Traditional Chinese
- Add new command for copying blocks as editable embeds
- Update UIMultilineBlock to conditionally create line click handler based on showEditIcon prop

## v1.5.3

- Improved **Timeline** output format for better readability and organization
- Added file links as entry points for each file group
- Added separators between file groups and empty lines between content
- Preserved user customizations to embedded links
- Updated documentation with new format examples
- Fixed link matching issues in Timeline filtering

## v1.5.0

- Added **Debug Mode** to Timeline feature for troubleshooting filtering issues
- Fixed section extraction in Timeline to properly match links
- Improved Timeline filtering accuracy with basename matching
- Added hash-based optimization to prevent unnecessary file updates
- Fixed various edge cases in Timeline functionality

## v1.4.0

- Added **Embed Block Editing** feature for a seamless inline editing experience
- Added **Timeline** feature (`blp-timeline`) to dynamically query and aggregate sections from your vault
- Migrated project to a standardized structure with source code in the `src` directory
- Refactored major components like Flow Editor into separate modules for better maintainability

## v1.3.0

- Added Time Section feature for inserting timestamps as headings
- Added automatic heading level determination for time sections
- Added special handling for daily notes with customizable pattern matching
- Added option to display time sections as plain text in preview mode
- Improved heading analysis with better level detection
- Fixed cursor positioning after inserting elements

## v1.2.4

- Added validation for edge cases in heading analysis to improve stability
- Enhanced error handling for the analyzeHeadings function
- Fixed potential issues when start_line and end_line are both zero

## v1.2.3

- Improved multi-line block handling, especially for list items
- Enhanced alias generation for multi-line blocks
- Added configurable notifications for block link copying
- Fixed list block ID handling and positioning
- Improved selected text handling for aliases

## v1.2.0

- Reorganized settings menu structure for better usability
- Fixed heading block handling when text contains headings
- Added experimental option: heading_id_newline for controlling heading block ID newline behavior
- Improved settings text clarity and organization

## v1.1.3

- Fixed block ID handling for list items
- Optimized block ID insertion position for list type blocks
- Improved list block handling logic

## v1.1.2

- Added new block link alias type: Selected text
- Improved alias handling for heading blocks
- Fixed alias generation for single-line blocks
- Enhanced alias type configuration options
- Improved documentation and settings descriptions

## v1.1.0

- Added support for Obsidian URI links
- Added customizable block link alias types:
  - First x characters of block content
  - Nearest heading title
- Improved command and menu text for better clarity
- Fixed consistency between command palette and right-click menu functionality

## Roadmap

### Upcoming Features
- More timeline filtering options
- Enhanced multi-line block format support
- Improved internationalization support

### Known Issues
- Multi-line block handling in some complex nested structures
- Performance optimization in large documents

## Contributing

If you find issues or have feature suggestions:

1. Check [GitHub Issues](https://github.com/Jasper-1024/obsidian-block-link-plus/issues)
2. Submit detailed bug reports or feature requests
3. Participate in community discussions and testing