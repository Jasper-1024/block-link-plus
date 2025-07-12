# Time Sections

Insert current time as heading, ideal for meeting notes and daily journals.

## Usage

### Command Palette
Search "Insert Time Section" or use hotkey

### Right-click Menu
Enable "Show time section in menu" in settings

## Features

- **Auto Time** - Insert current time
- **Smart Level** - Auto-determine heading level based on document structure
- **Daily Optimization** - Special handling for daily note files
- **Custom Format** - Configurable time display format

## Settings

### Time Format
```
HH:mm     → 14:30
H:mm      → 14:30 (single digit hour)
HH:mm:ss  → 14:30:25
```

### Daily Mode
- **Daily Pattern** - Filename matches `\d{4}-\d{1,2}-\d{1,2}` format
- **Heading Level** - Fixed level in daily notes (default level 2)
- **Regular Files** - Auto-detect based on existing heading structure

### Style Options
- **Standard Style** - Display as normal heading
- **Plain Text Style** - Display as plain text in preview mode

## Example

Before insertion:
```
# 2024-01-15 Daily Note

## 09:00 Morning Meeting
```

After insertion:
```
# 2024-01-15 Daily Note

## 09:00 Morning Meeting

## 14:30
```

## Integration

- **Time Sections** + **Timeline** = Complete time management system
- Record time points in daily notes, use timeline to aggregate and view