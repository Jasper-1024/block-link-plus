# Design Intake: BLP-17

## Status

- State: Design Intake
- Verdict: human-review-required

## Plane Reply

Decision needed: approve a presentation-only redesign of the current `blp-view` timeline preset (`group.by: day(date)` + `render.type: embed-list`). I recommend keeping source resolution, query/filter, grouping, sorting, hierarchy, result limits, native block embeds, and materialization unchanged while making date groups, entry times/source context, density, and loading/empty/error states easier to scan. The earlier Journal Feed interpretation is rejected and is excluded; BLP-16 owns that work. Move this item to **Review Approved** to authorize implementation routing, or to **Review Rejected** with feedback; leave it in **Human Review** if the proposed metadata or renderer boundary needs a different product decision.

## Current Understanding

The source issue asks for a bounded readability improvement, not a defect fix. The intended reading flow is a date-oriented `blp-view` result in which chronology, group boundaries, and individual embedded entries are immediately legible without changing query or filter behavior.

Tracker feedback resolves the target: BLP-17 is the maintained `blp-view` timeline preset shown in the issue screenshots, specifically the `embed-list` rendering. It is not the current Journal Feed and it is not a request to revive the retired `blp-timeline` code block. This intake therefore scopes the first pass to the live, non-materialized `render.type: embed-list` presentation used with day grouping; other `blp-view` data semantics remain the source of truth.

The recommended product direction is a compact grouped feed: a clearly styled date group label, a restrained group-level chronology cue, compact entry rows that retain the native block embed and its navigation/edit affordances, and a small amount of deliberately chosen metadata. The view should visually communicate the order already produced by the query pipeline rather than infer or re-sort events from note text.

## Repo Findings

- **The maintained path is `blp-view`.** `src/main.ts` registers the `blp-view` Markdown code-block processor and delegates to `src/features/file-outliner-view/blp-view.ts`. The current resolver defaults to `group.by: none`, `sort.by: date`, `sort.order: desc`, and `render.type: embed-list`.
- **Query semantics are already explicit and tested.** `blp-view.ts` resolves the enabled source files, flattens list items while retaining ancestor lines/tags, applies date/field/tag/outlink/section/hierarchy filters, performs stable sorting, applies the configured result limit, then groups the resulting candidates. `src/features/file-outliner-view/__tests__/blp-view.test.ts` covers these contracts, including strict date filters, hierarchy modes, grouping, tie-breaking, source errors, and materialization. The targeted suite passed: 24 tests.
- **The current timeline output is Markdown-shaped, not a dedicated timeline surface.** `renderEmbedList()` emits a `###` heading for each group followed by one `![[path#^blockId]]` per candidate. For `group.by: day(date)`, group titles are `yyyy-MM-dd`; when a group maps to one source file, `maybeLinkGroupTitleToSourceFile()` turns the entire date heading into a source-file link. MarkdownRenderer then creates the final heading, paragraph, and native `.internal-embed.markdown-embed` DOM.
- **The rendered hierarchy is visually weak.** In the task-owned runtime, a representative three-day, five-item day-grouped `embed-list` produced three H3 headings and five native embeds. At a 1023×800 viewport, the visible BLP result column measured about 603px wide and 391px high. The H3 groups used roughly 21px text with the native 16px/40px heading margins; two-item groups were wrapped in a paragraph about 77px high. Each embed retained a 2px purple left border, a roughly 54px list-content inset, and a 24px jump affordance. The screenshot shows large default gaps, underlined date links competing with group labels, repeated marker-like bars, and no visible entry time or source context.
- **The runtime probe exercised the real BLP render path.** The task runtime does not include the community Dataview plugin, so the visual probe supplied a minimal temporary `window.DataviewAPI` for representative real Markdown files. It still exercised the repository’s `handleBlpView()` → MarkdownRenderer → native block-embed composition; the visual measurements are evidence about layout composition, not a replacement for a later full Dataview integration check.
- **System metadata is protocol, not reading content.** Outliner source files carry `date`, `updated`, `blp_sys`, `blp_ver`, and block IDs in their system tail lines. `fileOutlinerMarkdownPostProcessor()` hides those protocol fields in reading output. A redesign should not promote those raw fields or caret IDs into the primary timeline surface. The candidate date can be shown as user-facing metadata because it already drives the query’s grouping/sort contract.
- **The current renderer has no stable per-group/per-item presentation hooks.** Generic Markdown headings and paragraphs are the only obvious structural hooks around the generated embeds. CSS-only changes against generic `h3`, `p`, or `.internal-embed` selectors would risk affecting unrelated Markdown or embedded content. A scoped BLP-owned wrapper for the live `embed-list` result would provide safe hooks for group rails, item spacing, metadata, focus states, and responsive behavior while leaving the embedded note renderer intact.
- **State handling is currently implementation-oriented.** `handleBlpView()` has no explicit loading placeholder while the asynchronous render is pending. It emits raw `pre` blocks for missing Dataview, missing/ambiguous/non-enabled sources, source limits, materialization errors, and other failures; an empty result is the literal `No items found.`; optional diagnostics are another raw `pre`; truncation is a Markdown warning block. These states need distinct visual hierarchy without changing their conditions or messages’ factual meaning.
- **Materialization is a separate persistence boundary.** `materializeOutput()` writes a managed `blp-view` region back to the current note and uses hashes to avoid unnecessary writes. The recommended first slice is live/non-materialized presentation only, so generated file content and the materialization contract remain stable.

## Discussion Questions

1. **What exact renderer/configuration is included in the first visual pass?**
   Recommended answer: the live, non-materialized `render.type: embed-list` result when used as the day-grouped timeline preset (`group.by: day(date)`); preserve `table`, materialized output, and generic `file`/`field`/`none` group views for a later decision.
   Why it matters: the existing renderer is shared by multiple view shapes. A narrow boundary keeps the visual change from silently changing table output or other users’ grouping layouts.

2. **How should chronology be communicated without changing event ordering?**
   Recommended answer: keep the candidate and group order exactly as produced by the current query pipeline and show the absolute group date as the primary label. Do not parse timestamps from entry text, synthesize missing dates, or add a second UI sort. Add relative labels such as “Today” or “Yesterday” only if they are explicitly wanted later; the stable date should remain visible.
   Why it matters: `stableSortItems()` can sort by date, file path, or source line, and `buildGroups()` has defined behavior for each group mode. A visual timeline must not imply a different order than the configured query.

3. **Which entry metadata should be visible?**
   Recommended answer: show a compact, locale-aware time from the existing candidate `date` when time precision is present, and expose the source note basename/path as quiet secondary context or an accessible label. Do not show raw `date`/`updated` fields, `blp_*` protocol fields, or block IDs; do not add arbitrary Dataview fields in this slice.
   Why it matters: the screenshot’s day headings establish the date, but entries with different timestamps currently look indistinguishable even though timestamp order controls the result. Metadata must improve orientation without turning every item into a table row.

4. **How should group labels and source navigation coexist?**
   Recommended answer: make the date a visually stable group label and move the source-file navigation to a smaller adjacent link/open affordance, while preserving the current source target. Avoid making the entire date heading look like a prominent underlined hyperlink.
   Why it matters: `maybeLinkGroupTitleToSourceFile()` currently wraps the date heading when a unique source can be inferred. Separating label and action clarifies hierarchy without removing a useful path to the source note.

5. **What is the intended density and container treatment?**
   Recommended answer: use a flat readable feed with clear date separators or one group-level rail, compact item spacing, and content-driven height; demote or neutralize repeated per-embed decorative bars where safe. Retain the native embed shell, jump affordance, inline editing, focus styling, and keyboard targets. Do not introduce collapsible groups or cross-item editing semantics yet.
   Why it matters: the current output inherits Markdown paragraph/heading margins and a marker-like border from every native embed, producing large gaps and several competing vertical cues. The requested improvement is chronology-first, not a stack of equal-weight cards or a new editor.

6. **What should users see during loading, no-match, failure, truncation, and diagnostics?**
   Recommended answer: distinguish initial loading from “no matching items”; use a compact inline loading state; present source/config/render failures as actionable BLP callouts with technical detail secondary; keep truncation count visible; expose diagnostics only when the existing setting requests them. Preserve the current factual conditions and avoid adding note creation or query-editing controls.
   Why it matters: the current raw `pre` output makes all non-success paths look alike and leaves the async render blank until it completes. Clear state treatment is part of the reading flow and should remain accessible in narrow panes and keyboard navigation.

7. **Should live `embed-list` gain BLP-owned wrapper DOM?**
   Recommended answer: yes, for the live presentation only: give each result a scoped group/item wrapper, render the chosen metadata beside the existing native embed, and continue using the native Markdown renderer inside the item. Leave the materialized Markdown path unchanged.
   Why it matters: stable hooks are safer than global CSS against generic Markdown elements and make focus, responsive spacing, empty/error states, and future visual refinements testable. The trade-off is a new local rendering seam that must preserve native embed interactions and not leak into persistence.

## Candidate Scope

After human approval, implement one presentation slice for the current day-grouped, live `embed-list` timeline:

- Keep source resolution, candidate extraction, all filter modes, hierarchy handling, stable sort/tie-breaking, group membership, result limits, and error conditions unchanged.
- Keep the existing `BlpViewGroup`/candidate data as the semantic input, but add a timeline-specific presentation layer with BLP-owned group and item hooks. The layer should preserve each `![[path#^blockId]]` as the native embedded block so jump navigation, inline editing, and source-file boundaries continue to work.
- Establish date-first hierarchy: a clear absolute date group label, an optional approved item count, a restrained group separator/rail, and a distinct secondary source-note action that retains current link targets.
- Add only the approved metadata (recommended: candidate time plus quiet source context). Keep protocol tail fields, block IDs, and raw diagnostics out of the primary reading surface.
- Replace inherited default heading/paragraph spacing with compact, content-driven item spacing and responsive readable gutters. Scope styles to the BLP live `embed-list` surface; preserve Obsidian theme variables, native embed/jump affordances, focus visibility, and narrow-pane behavior.
- Give loading, no matches, source/config/render failures, truncated results, end-of-output, and optional diagnostics distinct treatments. Recovery actions should remain limited to the existing safe capabilities unless separately approved.
- Validate with representative multi-day results, multiple items in one day, equal timestamps/tie-breaking, nested list embeds, tasks, callouts, code blocks, long text, missing/empty results, failure paths, diagnostics, narrow panes, and keyboard focus. Confirm no query/filter/group/sort change, no raw protocol metadata leakage, no lost native embed navigation/editing, and no materialization diff.

## ADR Candidates

None for the recommended bounded scope. If implementation expands the local wrapper into a reusable structured renderer or changes materialized Markdown output, that becomes a hard-to-reverse rendering/persistence boundary with compatibility trade-offs and should receive an ADR before code.

## Non-Goals

- Reusing or redesigning Journal Feed; BLP-16 owns that surface.
- Reviving the retired `blp-timeline` code block, its historical aggregation/writeback behavior, or its settings.
- Changing `blp-view` source resolution, Dataview queries, date/field/tag/outlink/section filters, hierarchy modes, group membership, sort order, tie-breaking, result limits, or diagnostics conditions.
- Changing `render.type: table`, non-timeline group modes, or materialized output/file-write semantics in the first slice.
- Parsing free-form note text into a new event model, creating synthetic empty-date groups, or adding a second user-controlled sort/filter UI.
- Exposing Outliner system-tail fields, block IDs, or raw implementation markers as primary user-facing metadata.
- Changing native block embed navigation, Jump Affordances, Inline Edit Embed behavior, Outliner editing semantics, source-file persistence, or cross-file operations.
- Adding note creation, Daily Notes management, Periodic Notes support, or a broad settings/navigation redesign.
- Starting product implementation before the human moves the item to `Review Approved`.
