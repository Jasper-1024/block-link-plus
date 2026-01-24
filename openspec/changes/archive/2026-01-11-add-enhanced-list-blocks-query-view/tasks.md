# Tasks: Add Enhanced List Blocks Query/View

## 1. OpenSpec
- [x] 1.1 Finalize YAML schema + defaults in spec
- [x] 1.2 Run `openspec validate add-enhanced-list-blocks-query-view --strict`

## 2. Enhanced list block metadata
- [x] 2.1 Define/parse the system tail line format: `[date:: <YYYY-MM-DDTHH:mm:ss>] ^<id>`
- [x] 2.2 Hide system line in Live Preview + Reading mode
- [x] 2.3 On-save repair: detect duplicate `^id` in the same file and rewrite duplicates (+ rewrite `date` to repair time)
- [x] 2.4 Enable scope: opt-in via settings folders/files or frontmatter `blp_enhanced_list: true`
- [x] 2.5 Auto-generate system line when creating the next list item (Live Preview)
- [x] 2.6 Ensure system line is inserted before child lists (and relocate if needed)

## 3. Query engine (Dataview-backed)
- [x] 3.1 Parse `blp-view` YAML blocks and apply defaults
- [x] 3.2 Build candidate list items via Dataview `file.lists` flatten
- [x] 3.3 Enforce candidate gate: require `blockId` and a Dataview DateTime `date`
- [x] 3.4 Implement filters: `date`, `fields`, `tags`, `outlinks`, `section`
- [x] 3.5 Implement grouping and stable sorting
- [x] 3.6 Implement `expr` evaluation via `dv.evaluate(expr, rowContext)`
- [x] 3.7 Enforce enable scope: `source` MUST NOT include non-enabled files (error + no output)

## 4. Renderers
- [x] 4.1 Embed-list renderer (pure render): `![[path#^blockId]]`
- [x] 4.2 Table renderer with default columns (File, Date) and configurable `columns`
- [x] 4.3 Materialize renderer: managed region markers + overwrite + hash/no-op

## 5. Tests
- [x] 5.1 YAML parsing/defaults tests
- [x] 5.2 Duplicate ID repair tests
- [x] 5.3 Filter/group/sort behavior tests
- [x] 5.4 Materialize overwrite/no-op tests
- [x] 5.5 Auto system line insertion/relocation tests
