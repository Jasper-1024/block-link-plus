# Outliner

Outliner is the main 2.0 workflow in Block Link Plus: within the **enabled scope**, it treats each list item as a block (Logseq-like) and maintains a “system tail line” on disk (Dataview inline fields + `^id`), so you get:

- Stable block references for every list block: `[[file#^id]]` / `![[file#^id]]`
- `blp-view` (Query/View) that can filter/group/render those blocks via Dataview (Dataview plugin required)

!!! danger "Important: only enable in dedicated files/folders"
    Outliner is a strong opt-in workflow. When a file is opened in Outliner view, the plugin normalizes the content into a “list blocks” structure and may write it back to disk.  
    This means **non-list content (paragraphs, headings, blockquotes, etc.) may be ignored and lost on writeback**.

    Outliner also normalizes formatting (e.g. 2-space indentation, unordered marker `-`). Please back up first, or only enable it for new/dedicated list-first notes.

    Recommended list-first structure:

    ```markdown
    - 2026-02-14
      - Log
        - 09:30 ...
        - 14:00 ...
    ```

## Enable scope (disabled by default)

Outliner is disabled by default for all files. You can enable it by:

- **Settings scope**: Settings → Block Link Plus → `Outliner` → configure enabled folders/files (vault-relative; folders are recursive; Obsidian “Copy path” is recommended)
- **Per-file frontmatter override**:
  - `blp_outliner: true` force-enable
  - `blp_outliner: false` force-disable (even if the file is inside an enabled folder)

After it’s enabled, the plugin does two things:

1. **Routes the default view** (toggleable): when “Enable Outliner routing” (`fileOutlinerViewEnabled`) is on, scoped files open in Outliner view by default
2. **Defines the data scope for `blp-view`**: `blp-view` can only scan files within the Outliner enable scope (otherwise it errors)

### Switch between Markdown and Outliner

- In the normal Markdown view: the pane menu (More options) shows “Open as Outliner / Open as Outliner in new tab” (for enabled files only)
- In the Outliner view: the same menu shows “Open as Markdown / Open as Markdown in new tab”

## System tail line

Outliner maintains a tail line for every list block using Dataview inline fields + `^id`:

```markdown
- A log entry
  [date:: 2026-02-14T09:30:25] [updated:: 2026-02-14T09:30:25] [blp_sys:: 1] [blp_ver:: 2] ^abcd
  - Child item (also a block)
    [date:: 2026-02-14T09:31:00] [updated:: 2026-02-14T09:31:00] [blp_sys:: 1] [blp_ver:: 2] ^child
```

- Indentation: Outliner uses **2 spaces** per level (not configurable)
- `^id`: native Obsidian block ID used by `[[file#^id]]`
- `date` / `updated`: created / last updated timestamps (commonly used by `blp-view`)
- `blp_sys` / `blp_ver`: protocol markers (for compatibility)

You can add extra Dataview fields to the tail line (e.g. `[topic:: linux]`), and the plugin will try to preserve them. Reserved fields are managed by the plugin and may be normalized.

### Hide tail lines (Reading mode)

By default, the plugin hides tail lines containing `[blp_sys:: 1]` in **Reading mode** (setting: `fileOutlinerHideSystemLine`). Turn it off temporarily when debugging.

## Interactions & editing

In Outliner view, most interactions revolve around the bullet:

- Left-click bullet: Zoom into the block’s subtree (can be disabled via `fileOutlinerZoomEnabled`)
- Drag bullet: Move the block subtree within the same file (can be disabled via `fileOutlinerDragAndDropEnabled`)
- Right-click bullet: Open the bullet menu
  - Copy block reference / embed / URI
  - Convert to task / convert to normal block
  - Copy / Cut / Paste / Paste as text / Delete (subtree-granular)
  - Collapse / Expand

### Tasks

Tasks use native Obsidian syntax on disk:

- `- [ ] ...`
- `- [x] ...`

Related commands (see Reference → Commands):

- Outliner: Toggle task status (`Mod+Enter`)
- Outliner: Toggle task marker (`Mod+Shift+Enter`)

