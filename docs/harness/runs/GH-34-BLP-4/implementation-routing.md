## Status

- State: Implementation Routing
- Verdict: same-task-ready

## Plane Reply

Implementation routing accepted the approved design and routes BLP-4 to same-task implementation. Build the default-on alias pipe escaping setting with focused tests and settings docs.

## Accepted Design

The approved design from `docs/harness/runs/GH-34-BLP-4/design-intake.md` is to add a user-visible setting that escapes pipe characters in generated block-link aliases by default.

Accepted scope:

- Add a boolean setting such as `escape_alias_pipe` to plugin settings and defaults, enabled by default.
- Add a Basics -> Block link settings toggle with localized UI text.
- Escape only alias text emitted into Markdown wikilinks, immediately before `generateMarkdownLink`.
- Keep no-alias links, link targets, subpaths, block IDs, and Obsidian URI output unchanged.
- Make escaping idempotent by leaving existing `\|` sequences unchanged.
- Update the English, default, and zh-TW settings reference docs.
- Add focused tests for default behavior, disabled behavior, already escaped pipes, alias arrays, and settings visibility/defaults.

## Human Feedback Considered

Tracker state is `Review Approved`, which is the machine-readable approval gate for this non-bug design. The only human comment in tracker feedback is garbled and does not contain an actionable scope change or rejection. No feedback conflicts with the design-intake recommendation.

## Routing Decision

Route BLP-4 to same-task implementation.

Rationale:

- The approved design is small and cohesive: one setting, one central clipboard-formatting behavior, focused tests, and related documentation.
- The implementation boundary is already identified in `src/features/clipboard-handler/index.ts`, with settings type/default and settings UI/doc updates as direct supporting changes.
- Splitting this into child tasks would create coordination overhead and could leave product behavior, UI, tests, and docs temporarily inconsistent.

## Implementation Contract

The implementation stage should:

- Add the default-on pipe escaping setting to `PluginSettings` and `DEFAULT_SETTINGS`.
- Surface the setting in the Basics -> Block link settings group.
- Add or reuse localized strings for the setting label/description in all existing settings languages.
- Implement a small helper at the clipboard Markdown-link formatting boundary that escapes unescaped `|` characters in alias strings and arrays.
- Apply the helper only for Markdown wikilinks generated through `copyToClipboard`; do not alter URI output or non-alias text.
- Preserve existing alias type behavior, including the current default of no alias generation.
- Add focused tests that prove default-on escaping, opt-out behavior, idempotence for `\|`, array alias handling, and settings default/UI exposure.
- Update `doc/reference/settings.md`, `doc/en/reference/settings.md`, and `doc/zh-TW/reference/settings.md`.
- Validate with `corepack pnpm test` and `corepack pnpm run build-with-types`; record any command that cannot run with exact failure details.

## Child Tasks

None. This routes to same-task implementation.

## Risks / Open Questions

- Existing users who enabled alias generation will see raw copied Markdown aliases change from `a|b` to `a\|b` unless they disable the new setting; this is accepted by the default-on design.
- The implementation should avoid broad Markdown escaping. Only pipe characters in alias text are in scope.
- If tests reveal that Obsidian's `generateMarkdownLink` already applies unexpected alias transformation, the implementation stage should record that evidence and keep the final behavior aligned with the accepted contract.

## Decision

Proceed to same-task implementation on BLP-4. Do not create AFK child tasks for this approved enhancement.
