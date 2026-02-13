# Tasks: Remove Built-in (Vendored) vslinko Outliner/Zoom

## 1. OpenSpec
- [x] 1.1 Add spec delta for: `settings-configuration`
- [x] 1.2 Run `openspec validate remove-built-in-vslinko-plugins --strict`

## 2. Remove runtime integration
- [x] 2.1 Remove `features/built-in-vslinko` wiring from `src/main.ts` (manager, CSS imports, settings accessors)
- [x] 2.2 Delete `src/features/built-in-vslinko/` and its unit tests

## 3. Remove settings + i18n surface
- [x] 3.1 Remove built-in-vslinko fields from `PluginSettings` + `DEFAULT_SETTINGS`
- [x] 3.2 Remove “Built-in Plugins” settings tab + all built-in-vslinko UI sections
- [x] 3.3 Remove unused i18n keys/labels related to built-in-vslinko UI

## 4. Remove vendored source + CSS
- [x] 4.1 Delete `src/vendor/vslinko/` (and any remaining references)
- [x] 4.2 Delete `src/css/vendor-obsidian-outliner.css` and `src/css/vendor-obsidian-zoom.css`

## 5. Tests + verification
- [x] 5.1 Update/trim affected tests and ensure `npm test` passes
- [x] 5.2 Ensure `npm run build` passes
