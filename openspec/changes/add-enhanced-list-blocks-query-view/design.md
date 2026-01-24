# Design: Enhanced List Blocks Query/View

## Glossary
- **Block**: a list item that has Obsidian native `^id` and a required system field `date`.
- **System line**: the last line of an enhanced list item: `[date:: <YYYY-MM-DDTHH:mm:ss>] ^<id>`
- **View**: a `blp-view` code block that queries blocks and renders results.

## YAML schema (minimal)

```yaml
source:
  folders: ["Daily"]     # optional convenience
  dv: '("Daily" or "Projects") and #work'  # optional escape hatch
filters:
  date: { within_days: 7 }  # required in practice if you want time-bounded results
  fields:
    - { field: state, op: in, value: ["todo", "doing"] }
  tags: { any: ["#todo"] }
  outlinks: { link_to_current_file: true }
  section: { any: ["Log"] }
group: { by: day(date) } # none | day(date) | file | field
sort: { by: date, order: desc }
render:
  type: embed-list        # default
  mode: render            # render | materialize
  columns:
    - { name: Date, expr: 'dateformat(date, "yyyy-MM-dd HH:mm")' }
    - { name: File, expr: 'file.link' }
```

Defaults:
- `source` omitted => global.
- `render.type` omitted => `embed-list`.
- `render.type: table` and `render.columns` omitted => columns `[File, Date]`.

## Candidate model
- Use Dataview pages as the file set, then read each page's `file.lists`, flatten into list items.
- Candidate gate:
  - MUST have `blockId`
  - MUST have `date` and it MUST be a Dataview DateTime (not a plain string)

## Rendering
- **embed-list**: render each result as `![[path#^blockId]]` (path from `item.path`).
- **table**: render headers + rows; default columns are file name/link and `date`.
- **materialize**: write output into a managed region below the code block:
  - start marker: `%% blp-view-start data-hash="<sha256>" %%`
  - end marker: `%% blp-view-end %%`
  - region content is fully plugin-owned and overwritten; user edits are not preserved.

## On-save repair (duplicate `^id`)
- On file save, scan list items in the file for duplicate `blockId`.
- Keep the first occurrence unchanged.
- For each subsequent duplicate:
  - generate a new `^id`
  - rewrite the system line `date` to the repair time
- MUST avoid infinite save loops and SHOULD no-op when the computed rewrite results in identical file content.
