# YAML Configuration

Complete YAML configuration reference for Timeline functionality.

## Basic Structure

```yaml
---
# Required configuration
source_folders:
  - "folder_path"

# Optional configuration
heading_level: 4
within_days: 30
sort_order: desc
time_pattern: '(\\d{2}:\\d{2})'
debug: false

# Advanced filtering
filters:
  relation: AND
  tags: {...}
  links: {...}
---
```

## Configuration Options

### source_folders (Required)
Specify folders to search:
```yaml
source_folders:
  - "Daily Notes/2024"
  - "Meeting Notes"
  - "Project Notes/Important"
```

### Basic Options

**heading_level** (1-6)
```yaml
heading_level: 4  # Match #### level headings
```

**within_days** (number)
```yaml
within_days: 30   # Files from last 30 days
```

**sort_order** (asc/desc)
```yaml
sort_order: desc  # Newest first
```

### Time Matching

**time_pattern** (regex)
```yaml
# Match HH:MM format
time_pattern: '(\\d{2}:\\d{2})'

# Match H:MM format
time_pattern: '(\\d{1,2}:\\d{2})'

# Match time ranges
time_pattern: '(\\d{2}:\\d{2}-\\d{2}:\\d{2})'
```

## Filter Configuration

### Tag Filtering
```yaml
filters:
  tags:
    relation: AND        # AND or OR
    items:
      - '#project/important'
      - '#status/ongoing'
    
    # Extract tags from frontmatter
    from_frontmatter:
      key: "tags"
      exclude:
        - "draft"
```

### Link Filtering
```yaml
filters:
  links:
    relation: OR         # AND or OR
    items:
      - "[[Project A]]"
      - "[[Important Meeting]]"
    
    # Auto-include content linking to current file
    link_to_current_file: true
```

### Combined Filtering
```yaml
filters:
  relation: AND          # Both tags and links must match
  
  tags:
    relation: OR         # Match any tag
    items:
      - '#important'
      - '#urgent'
  
  links:
    relation: AND        # All links must match
    items:
      - "[[Project]]"
      - "[[This Week]]"
```

## Debug Configuration

```yaml
debug: true
source_folders: ["Daily Notes"]
heading_level: 4
```

Shows debug information:
- Parsed configuration
- Number of files found
- Filter matching results
- Final generated links count

## Complete Example

```yaml
---
# Aggregate project-related time records from last month
source_folders:
  - "Daily Notes/2024"
  - "Meeting Notes"

within_days: 30
heading_level: 4
time_pattern: '(\\d{2}:\\d{2})'
sort_order: desc

filters:
  relation: AND
  
  tags:
    relation: OR
    items:
      - '#project/important'
      - '#meeting'
  
  links:
    relation: OR
    items:
      - "[[Project A]]"
      - "[[Client Communication]]"
    link_to_current_file: true
---
```
