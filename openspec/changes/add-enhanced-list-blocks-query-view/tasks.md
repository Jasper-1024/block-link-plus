# Tasks: Add Enhanced List Blocks Query/View

## 1. OpenSpec
- [ ] 1.1 Finalize YAML schema + defaults in spec
- [ ] 1.2 Run `openspec validate add-enhanced-list-blocks-query-view --strict`

## 2. Enhanced list block metadata
- [ ] 2.1 Define/parse the system tail line format: `[date:: <YYYY-MM-DDTHH:mm:ss>] ^<id>`
- [ ] 2.2 Hide system line in Live Preview + Reading mode
- [ ] 2.3 On-save repair: detect duplicate `^id` in the same file and rewrite duplicates (+ rewrite `date` to repair time)

## 3. Query engine (Dataview-backed)
- [ ] 3.1 Parse `blp-view` YAML blocks and apply defaults
- [ ] 3.2 Build candidate list items via Dataview `file.lists` flatten
- [ ] 3.3 Enforce candidate gate: require `blockId` and a Dataview DateTime `date`
- [ ] 3.4 Implement filters: `date`, `fields`, `tags`, `outlinks`, `section`
- [ ] 3.5 Implement grouping and stable sorting
- [ ] 3.6 Implement `expr` evaluation via `dv.evaluate(expr, rowContext)`

## 4. Renderers
- [ ] 4.1 Embed-list renderer (pure render): `![[path#^blockId]]`
- [ ] 4.2 Table renderer with default columns (File, Date) and configurable `columns`
- [ ] 4.3 Materialize renderer: managed region markers + overwrite + hash/no-op

## 5. Tests
- [ ] 5.1 YAML parsing/defaults tests
- [ ] 5.2 Duplicate ID repair tests
- [ ] 5.3 Filter/group/sort behavior tests
- [ ] 5.4 Materialize overwrite/no-op tests
