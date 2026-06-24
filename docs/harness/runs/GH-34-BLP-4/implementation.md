## Status

- State: Implementation
- Verdict: ready-for-review

## Plane Reply

Implemented default-on alias pipe escaping for generated Markdown block-link aliases. Added the `escape_alias_pipe` setting, Basics tab toggle, localized UI text, settings reference docs, and focused Jest coverage for default behavior, opt-out, idempotence, alias arrays, URI immunity, defaults, and UI visibility. Validation passed with `corepack pnpm test` and `corepack pnpm run build-with-types`; Jest reports a post-run open-handle warning after successful completion.

## Scope

- In scope: add a user-visible default-on setting that escapes unescaped `|` characters in generated Markdown link aliases as `\|`.
- In scope: apply escaping centrally in `copyToClipboard` before `generateMarkdownLink`.
- In scope: keep no-alias links, link targets, subpaths, block IDs, and Obsidian URI output unchanged.
- In scope: update settings docs for default, English, and zh-TW references.
- Out of scope: release metadata, changelog, existing note rewrites, and broader Markdown escaping.

## Changes Made

- Added `PluginSettings.escape_alias_pipe` with `DEFAULT_SETTINGS.escape_alias_pipe = true`.
- Added a Basics -> Block link toggle using localized `escapeAliasPipe` UI strings.
- Added `escapeUnescapedAliasPipes` in the clipboard handler.
- Wired the helper only into Markdown-link generation, after the URI branch and before `generateMarkdownLink`.
- Kept escaping idempotent by detecting whether a pipe has an odd number of preceding backslashes.
- Updated the three settings reference docs with the new setting and default JSON value.

## Tests Added Or Updated

- Added `src/features/clipboard-handler/__tests__/alias-pipe-escaping.test.ts`.
- Added `src/ui/__tests__/SettingsTab.alias-pipe-setting.test.ts`.
- Covered default escaping, disabled setting behavior, already escaped pipes, alias array handling, Obsidian URI output, default setting value, and Basics tab visibility.

## TDD Slices

- Clipboard behavior slice: added focused tests around `copyToClipboard` and the escape helper, then validated the central Markdown alias formatting path.
- Settings slice: added focused tests for `DEFAULT_SETTINGS.escape_alias_pipe` and Basics tab rendering, then validated the UI/default contract.
- Documentation slice: updated the settings reference pages after the setting key and UI behavior were in place.

## Validation

- `corepack pnpm install --frozen-lockfile`
  - Passed.
  - Important output: lockfile was up to date; 607 packages installed.
- `corepack pnpm test -- --runTestsByPath src/features/clipboard-handler/__tests__/alias-pipe-escaping.test.ts src/ui/__tests__/SettingsTab.alias-pipe-setting.test.ts`
  - Passed.
  - Important output: 2 test suites passed, 7 tests passed.
  - Note: Jest printed an open-handle warning after successful completion.
- `corepack pnpm test`
  - Passed.
  - Important output: 42 test suites passed, 226 tests passed.
  - Note: Jest printed an open-handle warning after successful completion.
- `corepack pnpm run build-with-types`
  - Passed.
  - Important output: `tsc -noEmit -skipLibCheck` completed and production esbuild renamed `main.css` to `styles.css`.
- `corepack pnpm run agent:workflow-check`
  - Passed.
  - Important output: `agent workflow check passed`.

## Runtime Evidence

- CDP runtime was not run.
- Reason: BLP-4 is an approved enhancement without the `cdp-required` label, and the implementation changes pure clipboard formatting, settings UI text, and documentation. No Obsidian DOM, CodeMirror state, plugin lifecycle, focus, scroll, or real editor behavior claim is required for this stage.

## Files Changed

- `src/types/index.ts`
- `src/features/clipboard-handler/index.ts`
- `src/features/clipboard-handler/__tests__/alias-pipe-escaping.test.ts`
- `src/ui/SettingsTab.ts`
- `src/ui/__tests__/SettingsTab.alias-pipe-setting.test.ts`
- `src/shared/i18n.ts`
- `doc/reference/settings.md`
- `doc/en/reference/settings.md`
- `doc/zh-TW/reference/settings.md`

## Risks / Open Questions

- Existing users with alias generation enabled will see copied raw Markdown aliases change from `a|b` to `a\|b` by default; this matches the approved design and can be disabled with the new setting.
- The implementation intentionally escapes only alias text. It does not escape paths, subpaths, block IDs, selected non-alias text outside links, or Obsidian URI output.
- No remaining implementation questions.

## Decision

Ready for code review. The review should focus on the escape boundary in `copyToClipboard`, idempotence behavior for backslashes before pipes, and whether the settings docs/UI copy are acceptable.
