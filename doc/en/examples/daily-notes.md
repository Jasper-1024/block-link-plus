# Daily Notes

Use Block Link Plus to improve your daily note workflow.

## Basic setup

### Outliner

```
Enable scope: add the daily-notes folder/file in settings, or set `blp_outliner: true` in the file frontmatter
Dataview: required (for `blp-view`)
```

### Multi-line blocks (optional)

```
Multi-line processing: Add new heading
Alias type: First 20 characters
Enable prefix: Yes
ID prefix: diary
```

## Daily note template (list-first)

```markdown
---
blp_outliner: true
---

- 2024-01-15
  - Morning planning
    - [ ] Review yesterday
    - [ ] Plan today
  - Log
    - 09:00 Standup [[Project A]] #project/A
    - 14:30 Client call [[Project A]] #client/key
      - Notes...
  - Daily review
    - Done:
    - Issues:
    - Next:
```

## Aggregate with blp-view

Create a view in a monthly or project summary:

````markdown
# Project A - January summary

```blp-view
source:
  folders:
    - "Daily/2024-01"
filters:
  date:
    within_days: 30
  outlinks:
    any:
      - "[[Project A]]"
group:
  by: day(date)
sort:
  by: date
  order: desc
render:
  type: embed-list
```
````

## Quick operations

### Create a reusable block
1. Select a paragraph
2. Right-click → "Copy Block Link"
3. Reference it elsewhere

### Cross-date reference

```markdown
Yesterday's key decision: ![[2024-01-14#^diary-abc123]]
```

## Advanced tips

### Tags
```markdown
- 09:00 Standup #project/A #meeting/important
- 14:30 Client call #client/key #status/followup
```

### Link graph
```markdown
- 09:00 [[Project A]] progress sync
- Discussed [[Technical solution]] with [[Alice]]
```

### Multi-dimensional Query/View (example)

````markdown
```blp-view
filters:
  tags:
    any:
      - "#project/A"
render:
  type: table
```
````

