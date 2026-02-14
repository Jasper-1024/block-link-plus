# blp-view YAML

`blp-view` is a Markdown code block (Dataview required) used to filter/group/sort/render list blocks from Outliner-scoped files.

!!! note "Scope guardrail"
    `blp-view` only scans files in the Outliner enable scope. If `source` points to non-enabled files, it will error.  
    Easiest approach: omit `source` to scan all enabled files.

## Minimal example

````markdown
```blp-view
filters:
  date:
    within_days: 7
render:
  type: embed-list
```
````

## Top-level schema

- `source` (optional)
- `filters` (optional)
- `group` (optional)
- `sort` (optional)
- `render` (optional)

## source (optional)

If omitted, `blp-view` scans **all Outliner-enabled Markdown files**.

```yaml
source:
  folders: ["Daily", "Projects/A"]
  files: ["Daily/2026-02-14.md", "[[Inbox]]"]
  dv: '"Daily"' # Dataview source string (use instead of folders/files)
```

- `folders: string[]` vault-relative; scans `.md` recursively
- `files: string[]` vault-relative; also supports `[[...]]` or a file basename (ambiguous basenames will error; prefer full paths)
- `dv: string` Dataview source string (internally uses `dv.pages(source.dv, currentFilePath)`); **cannot** be combined with `folders/files`

## filters (optional)

### filters.date

Filter by the system field `date` (ISO timestamp):

```yaml
filters:
  date:
    within_days: 7
    after: "2026-02-01"
    before: "2026-03-01"
    between: ["2026-02-01", "2026-03-01"]
```

- `within_days: number` last N days
- `after` / `before`: Dataview-parsable date strings
- `between`: either `["after", "before"]` or `{ after, before }`

### filters.fields

Field expression filters (AND across entries):

```yaml
filters:
  fields:
    - field: topic
      op: contains
      value: linux
    - field: priority
      op: ">="
      value: 3
```

- Supported `op`: `has`, `=`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `contains`
  - `has`: truthy check
  - `in`: `value` must be an array (any-of)
  - `contains`: substring for strings; element check for arrays

### filters.tags

Tag filters (inputs like `project/A` are normalized to `#project/A`):

```yaml
filters:
  tags:
    any: ["#project/A", "log"]
    none_in_ancestors: ["#ignore"]
```

- `any` / `all` / `none`: match against the block's tags
- `none_in_ancestors`: ancestor blocks must not contain these tags

### filters.outlinks

Outlink filters:

```yaml
filters:
  outlinks:
    any: ["[[Project A]]", "People/Alice.md"]
    link_to_current_file: true
```

- `any` / `all` / `none`: match against the block's outlinks (inputs support `[[...]]`, paths, basenames; best-effort resolution)
- `link_to_current_file: true`: require an outlink to the current file

### filters.section

Filter by Dataview `item.section` (the heading section):

```yaml
filters:
  section:
    any: ["Log", "Experiments"]
```

### filters.hierarchy

Controls whether nested matches should be suppressed:

- `all` (default): keep all matches
- `outermost-match`: if a block matches, suppress its descendant matches
- `root-only`: only keep root blocks (no parent)

## group (optional)

```yaml
group:
  by: day(date) # none | day(date) | file | field
  field: topic  # required when by=field
```

## sort (optional)

```yaml
sort:
  by: date      # date | file.path | line
  order: desc   # asc | desc
```

## render (optional)

```yaml
render:
  type: embed-list # embed-list | table
```

### render.type = embed-list

Renders a list of embeds like `![[path#^blockId]]` and inserts headings based on `group`.

### render.type = table

Table rendering requires columns:

```yaml
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

- Each column must specify `field` or `expr` (exactly one)
- `expr` is evaluated as a Dataview expression; the context includes the list item fields and `file` (e.g. `file.link`)

### render.mode = materialize (write back)

```yaml
render:
  mode: materialize
  type: table
```

When `materialize` is enabled, `blp-view` writes the output back to the current file and maintains a managed region under the code block:

```text
%% blp-view-start data-hash="..." %%
... materialized markdown ...
%% blp-view-end %%
```

Notes:

- Controlled by the **blpViewAllowMaterialize** setting (disabled => error)
- The current file must also be Outliner-enabled (otherwise => error)

