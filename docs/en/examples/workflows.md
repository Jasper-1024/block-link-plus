# Workflow Examples

Block Link Plus applications in different scenarios.

## Project Management

### Meeting Notes → Project Tracking

**Meeting Notes (2024-01-15-Project-A-Meeting.md)**
```markdown
# Project A Weekly Meeting

## 09:30 Progress Report
John: Frontend 60% complete ^meeting-progress
Jane: Backend API in development ^meeting-backend

## 10:00 Issue Discussion
Database performance needs optimization ^meeting-issue

## 10:15 Next Week Plan
1. Complete remaining frontend pages
2. Finalize performance optimization plan ^meeting-plan
```

**Project Overview (Project-A.md)**
```markdown
# Project A Overview

## This Week's Progress
![[2024-01-15-Project-A-Meeting#^meeting-progress]]

## Issues to Resolve
![[2024-01-15-Project-A-Meeting#^meeting-issue]]

## Next Week Agenda
![[2024-01-15-Project-A-Meeting#^meeting-plan]]
```

### Progress View (blp-view)

````markdown
# Project A - Progress View

```blp-view
source:
  folders:
    - "Team Daily Reports"
filters:
  date:
    within_days: 30
  outlinks:
    any:
      - "[[Project A]]"
  tags:
    any:
      - "#progress"
      - "#issue"
group:
  by: day(date)
sort:
  by: date
  order: desc
render:
  type: embed-list
```
````

## Learning Notes

### Knowledge Point Extraction

**React Learning Notes.md**
```markdown
# React Hooks Learning

## useState Usage
useState returns state value and update function ^react-usestate

## useEffect Usage  
useEffect handles side effects and lifecycle ^react-useeffect

## Custom Hooks
Extract component logic for code reuse ^react-custom-hooks
```

**Project Development Notes.md**
```markdown
# Frontend Development Points

## React Best Practices
![[React Learning Notes#^react-usestate]]
![[React Learning Notes#^react-useeffect]]

## Performance Optimization
Using custom hooks: ![[React Learning Notes#^react-custom-hooks]]
```

## Research Workflow

### Literature Management

**Paper Reading - AI Model Optimization.md**
```markdown
# GPT-4 Architecture Analysis

## Core Innovation
Transformer architecture improvements ^paper-innovation

## Training Method
Using RLHF for alignment ^paper-training

## Application Scenarios
Multimodal capability expansion ^paper-application
```

**Research Project.md**
```markdown
# AI Model Research Project

## Theoretical Foundation
![[Paper Reading - AI Model Optimization#^paper-innovation]]

## Training Strategy
![[Paper Reading - AI Model Optimization#^paper-training]]
```

### Experiment Records

Use list items to record experiment progress (works well with Enhanced List Blocks):

```markdown
---
blp_enhanced_list: true
---

# Experiment Log - 2024-01-15

- 09:00 Environment Setup
- 10:30 Model Training (batch_size=32)
- 14:00 Result Analysis (accuracy=85%)
- 16:30 Parameter Tuning (lr=0.001)
```

## Team Collaboration

### Task Assignment

**Project Division.md**
```markdown
# Team Task Assignment

## John - Frontend Development
Responsible for user interface implementation ^task-frontend
Deadline: January 20

## Jane - Backend Development  
Responsible for API interface development ^task-backend
Deadline: January 18

## Mike - Testing
Responsible for functional and integration testing ^task-testing
Deadline: January 25
```

### Personal Task Board

Each person's task file references assigned tasks:

**John Tasks.md**
```markdown
# This Week Tasks

## Main Work
![[Project Division#^task-frontend]]

## Progress Tracking
- [x] Login page
- [ ] User center
- [ ] Data display page
```

### Progress Summary

Use blp-view to aggregate team progress:

````markdown
```blp-view
source:
  folders:
    - "Team Daily Reports"
filters:
  date:
    within_days: 7
  tags:
    any:
      - "#completed"
      - "#progress"
group:
  by: file
sort:
  by: date
  order: desc
render:
  type: embed-list
```
````
