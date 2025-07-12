# Timeline

Extract time headings from multiple files and display in chronological order.

## Basic Usage

Create `blp-timeline` code block:

````markdown
```blp-timeline
---
source_folders:
  - "Daily Notes"
heading_level: 4
---
```
````

## Core Configuration

### Required Settings
```yaml
source_folders:
  - "Daily Notes/2024"
  - "Meeting Notes"
```

### Common Options
```yaml
heading_level: 4              # Heading level to extract
within_days: 30              # Last 30 days only
sort_order: desc             # desc/asc
embed_format: '!![[]]'       # !![[]] or ![[]]
```

## Filters

### Filter by Tags
```yaml
filters:
  tags:
    relation: AND
    items:
      - '#project/important'
      - '#status/ongoing'
```

### Filter by Links
```yaml
filters:
  links:
    relation: OR
    items:
      - "[[Project A]]"
      - "[[Meeting]]"
    link_to_current_file: true
```

### Combined Filters
```yaml
filters:
  relation: AND
  tags:
    relation: OR
    items:
      - '#important'
  links:
    relation: AND
    items:
      - "[[Project]]"
```

## Time Extraction

Extract time from headings for sorting:

```yaml
time_pattern: '(\\d{2}:\\d{2})'
```

Matches heading: "#### 14:30 Project Meeting" → extracts "14:30"

## Output Format

Generated timeline format:

```
%% blp-timeline-start data-hash="..." %%
[[file1]]

![[file1#heading1]]

![[file1#heading2]]

---
[[file2]]

![[file2#heading1]]
%% blp-timeline-end %%
```

## Debug Mode

Add `debug: true` for detailed information:

```yaml
debug: true
source_folders: ["Daily Notes"]
```

Shows configuration parsing, query results, and filtering statistics.

## Dependencies

Timeline feature requires Dataview plugin. Check status in settings page.