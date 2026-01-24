# Tasks: Update Enhanced List Blocks settings

## 1. OpenSpec
- [x] 1.1 Add spec deltas for: `enhanced-list-blocks`, `settings-configuration`
- [x] 1.2 Run `openspec validate update-enhanced-list-blocks-settings --strict --no-interactive`

## 2. Settings + UX
- [x] 2.1 Add settings fields + defaults (system line visibility + blp-view guardrails)
- [x] 2.2 Update settings UI: show system line toggle; show `blp-view` settings only when Dataview is available
- [x] 2.3 Update i18n strings (en/zh/zh-TW) for new settings

## 3. Behavior wiring
- [x] 3.1 Respect system line visibility setting in Live Preview + Reading mode
- [x] 3.2 Apply `blp-view` guardrails: materialize allow/deny, max source files, max results (truncate + hint), optional diagnostics
- [ ] 3.3 In Live Preview, deleting a list item deletes its subtree (including system line)

## 4. Docs
- [x] 4.1 Update Enhanced List Blocks docs to describe new settings

## 5. Verification
- [x] 5.1 Run `npm test`
- [x] 5.2 Run `npm run build-with-types`
- [ ] 5.3 Manual smoke in Obsidian (desktop): toggles take effect; deletion semantics behave; `blp-view` guardrails behave as expected
