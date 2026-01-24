# Tasks: Remove Timeline + Time Section

## 1. OpenSpec
- [x] 1.1 Add spec deltas for: `timeline-aggregation`, `time-section-insertion`, `settings-configuration`
- [x] 1.2 Run `openspec validate remove-timeline-and-time-section --strict --no-interactive`

## 2. Remove Timeline Aggregation (`blp-timeline`)
- [x] 2.1 Remove Timeline settings + i18n + types defaults
- [x] 2.2 Remove `blp-timeline` processor implementation (optional: keep deprecation-only renderer)
- [x] 2.3 Remove timeline-related docs pages and references
- [x] 2.4 Update tests to reflect removal

## 3. Remove Time Section Insertion
- [x] 3.1 Remove time section command/menu wiring
- [x] 3.2 Remove time section settings + i18n + styles
- [x] 3.3 Update docs to remove time section references

## 4. Settings UX for `blp-view`
- [x] 4.1 Move/introduce Dataview availability hint under Enhanced List Blocks settings

## 5. Verification
- [x] 5.1 Run `npm test`
- [x] 5.2 Run `npm run build-with-types`
- [ ] 5.3 Manual smoke in Obsidian (desktop): no timeline/time section groups; `blp-view` still works
