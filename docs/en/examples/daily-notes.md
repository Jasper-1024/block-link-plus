# Daily Notes

Optimize daily note workflow with Block Link Plus.

## Basic Settings

### Enhanced List Blocks Configuration
```
Enable scope: add folders/files in settings, or set blp_enhanced_list: true in file frontmatter
Dataview: required (for blp-view Query/View)
```

### Multi-line Block Configuration
```
Multi-line Processing: Add New Heading
Alias Type: First 20 Characters
Enable Prefix: Yes
ID Prefix: diary
```

## Daily Note Template

```markdown
---
blp_enhanced_list: true
---

# 2024-01-15

## Morning Planning
- [ ] Review yesterday's summary
- [ ] Plan today's priorities

## Log
- 09:00 Morning Meeting [[Project A]] #project/A
- 14:30 Client Communication [[Project A]] #client/key
  - Client feedback summary...

## 18:00 Daily Review
Today's achievements:
Today's issues:
Tomorrow's priorities:
```

## Aggregate with blp-view (instead of Timeline)

Create a View in monthly or project summaries:

````markdown
# Project A - January Summary

## Key Timeline

```blp-view
source:
  folders:
    - "Daily Notes/2024-01"
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

## Quick Operations

### Create Important Content Blocks
1. Select important paragraph
2. Right-click → "Copy Block Link"
3. Reference in project notes

### Cross-date References
```markdown
Yesterday's important decision: ![[2024-01-14#^diary-abc123]]
```

## Advanced Tips

### Tag System
```markdown
- 09:00 Project Meeting #project/A #meeting/important
- 14:30 Client Communication #client/key #status/followup
```

### Link Network
```markdown
- 09:00 [[Project A]] Progress Sync
- Discussed [[Technical Solution]] with [[John]]
```

### Multi-dimensional Query/View (Example)

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
