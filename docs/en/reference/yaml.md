# YAML Configuration

YAML configuration reference for the `blp-view` code block (requires Dataview).

## Basic Structure

````markdown
```blp-view
source:
  folders:
    - "Daily Notes"
filters:
  date:
    within_days: 7
render:
  type: embed-list
```
````

## Options

### source

- `folders`: `string[]` (by folder)
- `files`: `string[]` (by file)
- `dv`: `string` (Dataview source string; cannot be combined with `folders/files`)

### filters

- `date`: `within_days | after | before | between`
- `fields`: `{ field, op, value }[]`
- `tags`: `any | all | none | none_in_ancestors`
- `outlinks`: `any | all | none | link_to_current_file`
- `section`: `any | all | none`

### group

- `by`: `none | day(date) | file | field`
- `field`: required when `by: field`

### sort

- `by`: `date | file.path | line`
- `order`: `asc | desc`

### render

- `type`: `embed-list | table`
- `mode`: `materialize` (optional: write back to a managed region)
- `columns`: table columns (`{ name, field? , expr? }`)

## Examples

### Last 30 days, linking to Project A

````markdown
```blp-view
source:
  folders: ["Daily Notes/2024-01"]
filters:
  date:
    within_days: 30
  outlinks:
    any: ["[[Project A]]"]
group:
  by: day(date)
render:
  type: embed-list
```
````

### Materialize mode

````markdown
```blp-view
render:
  mode: materialize
  type: table
```
````
