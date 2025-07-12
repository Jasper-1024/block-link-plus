# Block Link Plus

Obsidian block link enhancement plugin designed to improve note reference efficiency.

## Core Features

Obsidian's native block link functionality has limitations. Block Link Plus solves these issues:

### ^abc123-abc123 Multi-line Block References
- Break through native single-paragraph limitations
- Support references spanning multiple paragraphs
- Maintain content integrity

### Timeline Aggregation
- Automatically organize content with time markers
- Support multiple filter conditions
- Flexible YAML configuration

### Flow Editor
- Edit original content directly within references
- Bidirectional synchronization updates
- Improve collaboration efficiency

### Time Sections
- Quick timestamp insertion
- Support custom formats
- Automatic timeline organization

### Smart Aliases
- Auto-generate content previews
- Multiple alias formats
- Enhance readability

## Typical Applications

### Project Management
Extract key decisions from meeting notes as blocks, reference centrally in project boards:
```markdown
## This Week's Decisions
![[Meeting Notes#^decision-abc123]]
![[Discussion Notes#^action-def456]]
```

### Learning Notes
Extract core insights from literature, organize knowledge networks in research notes:
```markdown
## Theoretical Foundation
![[Paper A#^key-insight-abc123]]
![[Paper B#^methodology-def456]]
```

### Journal System
Use timeline functionality to automatically aggregate daily important events:
````markdown
```blp-timeline
---
source_folders: ["Daily Notes/2024"]
heading_level: 2
within_days: 30
---
```
````

## Installation

See [Installation Guide](install.md) for detailed steps.

## Quick Start

1. Install and enable the plugin
2. Adjust preferences in settings
3. Start creating block links `[[note#^block-id]]`
4. Use multi-line block functionality to extract long paragraphs

## Documentation Navigation

- **Usage Guides**: Detailed feature descriptions and examples
- **Reference Materials**: Configuration options and API documentation
- **Examples**: Real-world application scenarios

Start using Block Link Plus now to enhance your Obsidian note-taking experience.