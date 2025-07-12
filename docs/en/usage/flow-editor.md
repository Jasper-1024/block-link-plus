# Flow Editor

Edit embedded block content directly without jumping to original file.

!!! note "Technical Source"
    Editable block functionality ported and modified from [Obsidian-Basics](https://github.com/Make-md/Obsidian-Basics), optimized for multi-line block support and user experience.

## Enable Feature

Settings → Block Link Plus → Embedded Block Editing:
- Enable "Enable Embedded Block Editing"
- Choose editing style

## Editing Styles

### Minimal Mode
- Clear editing area boundaries
- Obvious visual indicators

### Seamless Mode
- Embedded content blends into current note
- Near-native editing experience

## Usage

### Editable Embeds
Use `!![[]]` format embeds:
```
!![[Meeting Notes#^important-decision]]
```

### Edit Operations
1. Click embedded content to enter edit mode
2. Modify text directly
3. Click outside area to save changes

## Supported Content

- **Heading blocks** - Embedded heading content
- **Text blocks** - Regular paragraph blocks
- **Multi-line blocks** - Blocks using `^abc-abc` format
- **List items** - Specific list items

## Notes

- Changes save directly to original file
- Real-time sync to all reference locations
- Supports undo operations
- Preserves original formatting

## Mode Switching

When switching between Live Preview and Reading View:
- Automatically clear editing state
- Re-render embedded content
- Maintain editing history