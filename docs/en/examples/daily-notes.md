# Daily Notes

Optimize daily note workflow with Block Link Plus.

## Basic Settings

### Time Section Configuration
```
Time Format: HH:mm
Daily Pattern: \d{4}-\d{1,2}-\d{1,2}
Heading Level: 2
Plain Text Style: Yes
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
# 2024-01-15

## Morning Planning
- [ ] Review yesterday's summary
- [ ] Plan today's priorities

## 09:00 Morning Meeting
Attendees: John, Jane
Main Topics:
- Project progress sync
- Next week planning

Decisions: ^diary-abc123
1. Complete design draft one day early
2. Technical review meeting on Wednesday

## 14:30 Client Communication
Client feedback summary...

## 18:00 Daily Review
Today's achievements:
Today's issues:
Tomorrow's priorities:
```

## Timeline Aggregation

Create timeline in monthly or project summaries:

````markdown
# Project A - January Summary

## Key Timeline

```blp-timeline
---
source_folders:
  - "Daily Notes/2024-01"
heading_level: 2
time_pattern: '(\\d{2}:\\d{2})'
filters:
  links:
    relation: OR
    items:
      - "[[Project A]]"
---
```
````

## Quick Operations

### Insert Time Point
1. Press hotkey `Ctrl+T`
2. Auto-insert current time as level 2 heading

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
## 09:00 Project Meeting #project/A #meeting/important
## 14:30 Client Communication #client/key #status/followup
```

### Link Network
```markdown
## 09:00 [[Project A]] Progress Sync
Discussed [[Technical Solution]] with [[John]]
```

### Multi-dimensional Aggregation
```yaml
# Aggregate by tags
filters:
  tags:
    items:
      - '#project/A'

# Aggregate by links  
filters:
  links:
    items:
      - "[[Project A]]"
```