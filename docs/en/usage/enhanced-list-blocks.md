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
- When a list item is deleted, the plugin cleans up its system line to avoid leaving orphan lines behind.

### List handle affordance (optional)

To make drag/fold interactions easier to discover, enable:
- Enhanced List Blocks → “Show list handle affordance”

When enabled, unordered list markers render as a handle in Live Preview (enabled files only).

### List handle actions (optional)

To make the handle behave more like a Logseq-style block handle, enable:
- Enhanced List Blocks → “Enable list handle actions”

When enabled (enabled files + Live Preview only):
- Left-click the unordered list handle does the configured action (default: toggle folding; requires Obsidian setting: “Fold indent”).
- Right-click the unordered list handle always opens the handle menu (toggle folding, copy block link/embed, and zoom actions when Zoom is available).

You can configure the left-click behavior in settings:
- Enhanced List Blocks → “Handle left-click action”

### Deletion behavior (optional)

By default (keep children): when you delete a parent list item (e.g. remove the `-`/`1.` marker or cut the line), the plugin only removes the system line and keeps the nested children.

If you prefer a more Logseq/Roam-like outliner behavior (delete parent = delete subtree), enable:
- Enhanced List Blocks → “Delete children when deleting a list item”

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

Optionally, you can scope built-in list UX (styles + interactions) to Enhanced List enabled files:
- Built-in Plugins (vslinko) → “Scope built-in list UX to Enhanced List”
