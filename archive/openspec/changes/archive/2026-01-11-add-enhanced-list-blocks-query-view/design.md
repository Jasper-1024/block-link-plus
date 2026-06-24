# Design: Enhanced List Blocks Query/View

## Glossary
- **Block**: a list item that has Obsidian native `^id` and a required system field `date`.
- **System line**: a required line inside an enhanced list item: `[date:: <YYYY-MM-DDTHH:mm:ss>] ^<id>`. It MUST be placed after the item's own content and before any nested list so Obsidian associates the `^id` with the parent item.
- **View**: a `blp-view` code block that queries blocks and renders results.

## Enable scope (opt-in)
Enhanced List Blocks is opt-in and only applies within explicitly enabled files.

A file is considered **enabled** if either:
- it is within plugin settings enabled folders/files, or
- its frontmatter contains `blp_enhanced_list: true`

Scope rules:
- Query/View candidates are only collected from enabled files.
- `blp-view` with explicit `source` MUST NOT expand beyond enabled files; if it would, the view errors and produces no output.
- System-line hiding and on-save duplicate `^id` repair only run for enabled files.

## YAML schema (minimal)

```yaml
source:
  folders: ["Daily"]     # optional convenience
  dv: '("Daily" or "Projects") and #work'  # optional escape hatch
filters:
  date: { within_days: 7 }  # required in practice if you want time-bounded results
  fields:
    - { field: state, op: in, value: ["todo", "doing"] }
  tags:
    any: ["#todo"]
    none_in_ancestors: ["#archive"] # optional
  outlinks: { link_to_current_file: true }
  section: { any: ["Log"] }
group: { by: day(date) } # none | day(date) | file | field
sort: { by: date, order: desc }
render:
  type: embed-list        # default
  columns:
    - { name: Date, expr: 'dateformat(date, "yyyy-MM-dd HH:mm")' }
    - { name: File, expr: 'file.link' }
```

Defaults:
- `source` omitted => all enabled files (not global).
- `render.type` omitted => `embed-list`.
- `render.mode` is usually omitted (pure render / no writeback); materialization requires explicit `render.mode: materialize`.
- `render.type: table` and `render.columns` omitted => columns `[File, Date]`.

## Candidate model
- Resolve a file set first, then read each page's `file.lists`, flatten into list items.
- File set resolution:
  - Start from enabled files.
  - If `source` is provided, resolve the source pages and verify every page is enabled; otherwise error (no output).
- Candidate gate:
  - MUST have `blockId`
  - MUST have `date` and it MUST be a Dataview DateTime (not a plain string)

## Filtering semantics
- Unless otherwise noted, filters apply to the current list item only (block-local), matching Roam/Logseq semantics:
  - Tags/outlinks/fields/section are not inherited from ancestors.
  - Tags/outlinks/fields/section are not aggregated from descendants.
- Section matching follows Dataview: use the Dataview-provided `item.section` link (typically `Link.type === "header"` with header text in `Link.subpath`).
- Date filter inputs are parsed using Dataview parsing (`dv.date(...)`); invalid inputs error and produce no output.
- Date comparisons are strict (exclusive):
  - `after`: `item.date > after`
  - `before`: `item.date < before`
  - `between`: `after < item.date < before`
- `filters.section.all` is treated the same as `any` (each item belongs to a single section).

## Rendering
- **embed-list**: render each result as `![[path#^blockId]]` (path from `item.path`).
- **table**: render headers + rows; default columns are file name/link and `date`.
- **materialize**: write output into a managed region below the code block:
  - start marker: `%% blp-view-start data-hash="<sha256>" %%`
  - end marker: `%% blp-view-end %%`
  - region content is fully plugin-owned and overwritten; user edits are not preserved.

## On-save repair (duplicate `^id`)
- On file save (enabled files only), scan list items in the file for duplicate `blockId`.
- Keep the first occurrence unchanged.
- For each subsequent duplicate:
  - generate a new `^id`
  - rewrite the system line `date` to the repair time
- MUST avoid infinite save loops and SHOULD no-op when the computed rewrite results in identical file content.

## Auto-generate system line (Live Preview)
- In enabled files, when the user creates the next list item (typically via Enter), the plugin writes the system line for the previous list item immediately (no save required).
- If a system line exists but is placed after a nested list (so Obsidian won't associate it with the parent item), the plugin SHOULD relocate it before the nested list.
