# Enhanced List Blocks

Treat Obsidian list items as the smallest block unit: auto-insert a hidden system line (`[date:: ...] ^id`), and provide `blp-view` (Query/View) for filtering, grouping, and rendering.

## Enable Scope (Opt-in)

Enhanced List Blocks is disabled by default, and only applies to files that match **any** of the following:
- Included in the “enabled folders/files” scope in settings (vault-relative path; folders are recursive; use Obsidian “Copy path”)
- File frontmatter contains `blp_enhanced_list: true`

## System Line (Auto + Hidden)

In an enabled file, when you create the “next” list item in Live Preview (e.g. press Enter), the plugin ensures the previous item has a system line:

```markdown
- A log entry
  [date:: 2026-01-11T14:30:25] ^abcd
```

- The system line is hidden in Live Preview and Reading mode by default (you can turn off hiding in settings for debugging).
- The system line is placed after the parent item content and before any child list (so `^id` is associated with the parent item).

## blp-view (Query/View)

`blp-view` requires the Dataview plugin.

### Optional blp-view guardrails

In settings (Enhanced List Blocks section), you can configure optional guardrails for `blp-view` (only shown when Dataview is available):
- Allow/disable `render.mode: materialize` writeback
- Max source files per execution (`0` = unlimited)
- Max rendered results (`0` = unlimited; extra results are truncated with a warning)
- Show diagnostics (counts + timing)

### Example: Last 7 days, linking to current file

````markdown
```blp-view
filters:
  date:
    within_days: 7
  outlinks:
    link_to_current_file: true
group:
  by: day(date)
sort:
  by: date
  order: desc
render:
  type: embed-list
```
````

### Example: Table view (filter by tags)

````markdown
```blp-view
filters:
  tags:
    any: ["#project/A"]
render:
  type: table
  columns:
    - name: File
      expr: file.link
    - name: Date
      field: date
    - name: Text
      field: text
```
````

## List Operations (Indent/Drag/Zoom)

List operations are out of scope for Enhanced List Blocks. This plugin provides optional built-in modules:
- Built-in Outliner (`obsidian-outliner@4.9.0`)
- Built-in Zoom (`obsidian-zoom@1.1.2`)

Enable them in settings; if an external plugin with the same ID is enabled, the built-in module will auto-disable to avoid conflicts.
