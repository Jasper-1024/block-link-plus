# Tasks: Add Settings Tabs and Search

## 1. OpenSpec
- [x] 1.1 Add spec deltas for: `settings-configuration`
- [x] 1.2 Run `openspec validate add-settings-tabs-and-search --strict --no-interactive`

## 2. UI Structure
- [x] 2.1 Add tab + search UI scaffolding to `BlockLinkPlusSettingsTab`
- [x] 2.2 Add CSS for tabs, selected state, and accessible hide/show

## 3. Settings Migration
- [x] 3.1 Move built-in vslinko settings into a dedicated “Built-in Plugins” tab
- [x] 3.2 Move Enhanced List settings into a dedicated “Enhanced List” tab
- [x] 3.3 Keep common/core settings in “Basics” tab

## 4. Search
- [x] 4.1 Implement cross-tab search mode (focus search = enter; click tab = exit)
- [x] 4.2 Add empty-state message when no settings match

## 5. Tests + Verification
- [x] 5.1 Add unit tests for tab switching + search filtering
- [x] 5.2 Run `npm test`
- [x] 5.3 Run `npm run build-with-types`
