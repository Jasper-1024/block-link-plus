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
- Modify the rendering of `## ˅id` under reading mode and live preview to make it more similar to a normal block reference.

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

## Changelog

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