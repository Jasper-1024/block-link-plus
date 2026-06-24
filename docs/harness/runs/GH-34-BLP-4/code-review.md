## Status

- Verdict: accepted

## Plane Reply

Accepted. The implementation matches the approved BLP-4 scope: default-on pipe escaping is applied only to generated Markdown wikilink aliases, URI output and targets remain unchanged, focused tests cover the new behavior, and full Jest plus type/build validation pass. Human review can move the item to `Ready to Merge` when ready for finalization.

## Review Summary

Reviewed the non-bug lane artifacts, source issue, implementation handoff, current worktree status, source diffs, new tests, and settings documentation. The implementation is ready for the final human gate.

The bug-lane `investigation.md`, `rca-review.md`, `fix-design.md`, and `fix-design-review.md` artifacts are absent; this is consistent with BLP-4 being routed as an approved enhancement through `design-intake.md` and `implementation-routing.md`.

## Findings

No blocking findings.

## Design Compliance

The patch follows the accepted same-task design:

- `src/types/index.ts:56` and `src/types/index.ts:105` add `escape_alias_pipe` with a default of `true`.
- `src/features/clipboard-handler/index.ts:13` adds idempotent pipe escaping, and `src/features/clipboard-handler/index.ts:61` applies it centrally before `generateMarkdownLink`.
- `src/features/clipboard-handler/index.ts:51` leaves Obsidian URI output on the pre-existing branch, so URI links are not escaped.
- `src/ui/SettingsTab.ts:502` exposes the toggle in Basics -> Block link settings.
- `src/shared/i18n.ts:91`, `src/shared/i18n.ts:651`, and `src/shared/i18n.ts:1210` add localized setting copy.
- `doc/reference/settings.md`, `doc/en/reference/settings.md`, and `doc/zh-TW/reference/settings.md` document the setting and default JSON value.

The change does not alter block-id generation, link targets, subpaths, alias-type selection, Obsidian URI formatting, release metadata, or unrelated docs.

## Test And Validation Review

Validation run during review:

- `corepack pnpm test -- --runTestsByPath src/features/clipboard-handler/__tests__/alias-pipe-escaping.test.ts src/ui/__tests__/SettingsTab.alias-pipe-setting.test.ts`
  - Passed: 2 suites, 7 tests.
- `corepack pnpm test`
  - Passed: 42 suites, 226 tests.
  - Jest still prints a post-run worker/open-handle warning after passing, matching the implementation handoff.
- `corepack pnpm run build-with-types`
  - Passed: TypeScript check and production esbuild completed.

CDP runtime validation was not required for this enhancement. The changed behavior is pure clipboard string formatting plus settings UI/docs, and the item is not marked `cdp-required`.

## TDD Review

The tests use behavior-oriented slices:

- `src/features/clipboard-handler/__tests__/alias-pipe-escaping.test.ts` covers default escaping, opt-out behavior, idempotence for already escaped pipes, multiline alias arrays, and URI immunity through `copyToClipboard`.
- `src/ui/__tests__/SettingsTab.alias-pipe-setting.test.ts` covers the default setting value and Basics tab visibility.

The tests are focused on the public formatting boundary rather than only private implementation details.

## Required Revisions

None.

## Risks / Open Questions

- Existing users who enabled alias generation will get escaped raw Markdown aliases by default. This is the approved product behavior and can be disabled with the new setting.
- The full Jest command still reports a post-run open-handle warning after all suites pass. This does not appear introduced by the new focused tests, but it remains a repo-level cleanup candidate.
- The code-review stage did not rerun `corepack pnpm install --frozen-lockfile`; dependencies and `node_modules` were already present, and validation commands executed successfully.

## Decision

Accepted for Human Review. If the human reviewer agrees, move BLP-4 to `Ready to Merge` so the finalize stage can perform the mechanical finalization path.
