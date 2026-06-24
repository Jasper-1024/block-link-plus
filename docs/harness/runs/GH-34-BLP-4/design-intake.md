# Design Intake: BLP-4

## Status

- State: Design Intake
- Verdict: human-review-required

## Plane Reply

Human review is needed for the product default: I recommend approving a default-on setting that escapes pipe characters in generated block-link aliases so copied links remain safe inside Markdown tables. If accepted, move this item to `Review Approved`; if rejected or changed, move it to `Review Rejected` with feedback.

## Current Understanding

GitHub issue #34 asks for a toggle/option to escape pipe characters in block links with aliases, specifically converting `|` to `\|` by default so links like `[[file#^id|alias with pipe]]` do not split Markdown table cells.

This is an enhancement, not a bug-lane RCA. The source issue is fully available in `docs/harness/runs/GH-34-BLP-4/context/source-issue.md`, and there is no additional human tracker feedback beyond the GitHub link.

The recommended product direction is:

- Add a user-visible setting for escaping pipe characters in generated aliases.
- Default the setting to enabled.
- Apply escaping only to alias text that is emitted into Markdown wikilinks.
- Preserve existing no-alias behavior and block reference targeting.

## Repo Findings

Block Link Plus already has configurable alias generation. `src/types/index.ts` defines `alias_type` and `alias_length`, with `alias_type` defaulting to `BlockLinkAliasType.Default`, meaning no alias is generated unless users opt into an alias style.

Alias text is calculated in `src/features/clipboard-handler/index.ts` by `calculateAlias`. It can come from the first characters of block content, the nearest heading, selected text, or a heading target. The current code does not sanitize `|` before passing the alias onward.

The final Markdown link text is assembled in `src/features/clipboard-handler/index.ts` by `copyToClipboard`, which calls `app.fileManager.generateMarkdownLink(file, "", "#" + link, alias)`. This is the central point shared by command palette and editor-menu block link generation, so it is the best implementation boundary for escaping aliases consistently.

There are two command surfaces for the same behavior: `src/features/command-handler/index.ts` and `src/ui/EditorMenu.ts`. Both calculate aliases and call `copyToClipboard`. Central handling avoids duplicating escaping in both files.

File Outliner also calls `copyToClipboard` directly for block reference/embed copy actions in `src/features/file-outliner-view/view.ts`, including a selected-text alias path. Central handling would cover this route too.

The settings UI already has a Basics tab with a Block link group in `src/ui/SettingsTab.ts`, near the existing alias style and alias length controls. That is the natural place for an escape-pipe toggle.

Settings are loaded with `Object.assign({}, DEFAULT_SETTINGS, raw)` in `src/main.ts`, so adding a boolean default can work for existing users without a data migration. If maintainers want the new value materialized into saved data immediately, that would be a separate migration choice.

User-facing settings references exist in three language files: `doc/reference/settings.md`, `doc/en/reference/settings.md`, and `doc/zh-TW/reference/settings.md`. Any approved setting should be documented there.

Existing focused tests cover block-id insertion and multiline copy dispatch, but no current test directly covers alias escaping. New tests should target the clipboard/alias boundary and default/settings visibility.

## Discussion Questions

1. Should pipe escaping be enabled by default for generated block-link aliases?
   Recommended answer: Yes. Default-on matches the reporter's request and prevents table breakage for users who copy aliased links into Markdown tables.
   Why it matters: Existing users who have enabled alias generation may see copied aliases change from `a|b` to `a\|b` after upgrade, which is safer in tables but slightly changes raw Markdown output.

2. Should the setting apply centrally to every generated Markdown wikilink alias, including File Outliner copy actions and any embed alias path that passes through `copyToClipboard`?
   Recommended answer: Yes. Escape alias text at the clipboard formatting boundary for all non-URI Markdown wikilinks.
   Why it matters: Central handling avoids missed surfaces and keeps command palette, editor menu, and File Outliner behavior consistent. Obsidian URI output should remain unaffected because it has no wikilink alias segment.

3. Should escaping be idempotent for already escaped pipes?
   Recommended answer: Yes. Convert only unescaped `|` characters to `\|`, and leave existing `\|` unchanged.
   Why it matters: Selected text or heading text may already contain Markdown-escaped pipes. Double escaping would create surprising raw Markdown and may alter displayed alias text.

## Candidate Scope

After human approval, the smallest coherent implementation slice is:

- Add a boolean setting such as `escape_alias_pipe` to `PluginSettings` and `DEFAULT_SETTINGS`, defaulting to `true`.
- Add a Basics -> Block link toggle labeled along the lines of "Escape pipe characters in aliases".
- Add localized UI strings and update the three settings reference docs.
- Add a helper in `src/features/clipboard-handler/index.ts` that escapes unescaped `|` characters in alias strings and alias arrays immediately before calling `generateMarkdownLink`.
- Leave Obsidian URI output, link targets, subpaths, block IDs, and no-alias links unchanged.
- Add focused unit tests for single aliases, alias arrays, already escaped pipes, disabled setting behavior, and settings default/UI visibility.
- Validate with `corepack pnpm test` and `corepack pnpm run build-with-types`.

## ADR Candidates

None. This is a reversible user-facing setting and a bounded clipboard-formatting behavior, not a hard-to-reverse architecture or workflow decision.

## Non-Goals

- Do not rewrite existing notes or previously copied/generated links.
- Do not change block ID generation, heading detection, multiline block handling, or alias type semantics.
- Do not escape `|` in file paths, subpaths, block IDs, Obsidian URI output, or non-alias Markdown text.
- Do not broaden this into general Markdown escaping for brackets, backslashes, table syntax, or HTML.
- Do not change the current default `alias_type` of no alias.
- Do not add release automation, version bumps, or changelog entries unless a later approved implementation stage asks for them.
