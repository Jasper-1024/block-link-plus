# Journal Feed: Responsive Same-Column Layout Research

Status: adopted in `c3c3894` and follow-up review correction
Date: 2026-08-30

## Question

The Journal Feed date header occupies the Feed's full inline width, while a
mounted Markdown leaf can carry Obsidian's readable-line-width rule on
`.cm-sizer` (`max-width: 700px` and automatic inline margins in the inspected
runtime). This creates two horizontal coordinate systems and a large blank gap.
The correction must not introduce a replacement fixed column width, fixed
height, percentage column, or a viewport breakpoint merely to align the two.

## Primary-source findings

1. A normally-flowed block's containing block is its nearest block-container or
   formatting-context ancestor. The CSS 2.2 width equation resolves `width:
   auto` from that containing block; automatic inline margins become zero in
   that case. Conversely, two automatic inline margins center a non-auto-width
   block. Therefore the observed gap is an expected result of a max-width plus
   auto margins, not a condition to repair with a new fixed-width wrapper.
   [CSS 2.2, 10.1 and 10.3.3](https://www.w3.org/TR/CSS22/visudet.html#blockwidth)

2. `max-width: none` removes a maximum constraint. Applied only to the
   Journal Feed-owned embedded editor, it lets the editor retain its normal
   automatic block width and thus use the same available inline size as its
   sibling date header. It is not a request for a specific width.
   [CSS Sizing Level 3, `max-width`](https://www.w3.org/TR/css-sizing-3/#max-width)

3. Obsidian officially supports locally scoped CSS changes and CSS variables.
   This supports a view-owned selector rather than changing the user's global
   readable-line-length preference or a vault-wide variable.
   [Obsidian Help: CSS snippets](https://help.obsidian.md/snippets)

4. The current Logseq source renders a journal as a page (`is-journals`) whose
   title and page blocks are siblings inside one `page-inner` container; the
   journal title is explicitly passed as `:journal-page?`, and the block list
   is rendered beneath it. That supports the structural reference adopted here:
   title and blocks share one parent layout context. It is not evidence for
   copying a fixed pixel width from Logseq.
   [Logseq page component, journal/page structure](https://github.com/logseq/logseq/blob/master/src/main/frontend/components/page.cljs)

## Adopted layout

Each `.blp-journal-feed-day` is the shared containing block for its date header
and embedded content. Only the Feed-owned Markdown leaf neutralizes the
readable-line-length constraint:

```css
.blp-journal-feed-day-editor
  .markdown-source-view.mod-cm6.is-readable-line-width
  .cm-sizer {
  max-width: none;
  margin-inline: 0;
}
```

This contains no literal content width, artificial initial height, percentage
column, or viewport breakpoint. The header and editor respond to the Feed's
available inline size, including narrow panes. `margin-inline` preserves the
rule for either writing direction.

The initial visual iteration's absolute Feed toolbar was removed after review:
it could overlap the first date at a narrow width. `Refresh Journal Feed` and
`Open Journal Feed source` are now native Obsidian view-header actions, not
part of the journal flow. The terminal `Load more` message is cleared once all
available days have been rendered. Retained editor height is measured from the
previous real embed only; no initial placeholder height is imposed. These are
visual-flow adjustments, not replacements for the embedding, observer, focus,
or outliner lifecycle.

## Runtime validation record

The acceptance run used only the task-owned Obsidian debug instance on port
`9236`, started by `scripts/start-obsidian-debug-env.ps1`, with a disposable
three-day Journal Feed fixture.

- Before the local `.cm-sizer` rule, CDP measured a **296 px** inline-start
  difference between the day label and Markdown content. After the change,
  CDP measured **0 px** for a mounted Markdown day.
- With `Emulation.setDeviceMetricsOverride` at **768 x 1000**, CDP reported
  `headerOffset: 0` and `overflow: 0`; the Feed contained no custom toolbar
  buttons. The native view header exposed the two actions above instead.
- Wide and narrow `Page.captureScreenshot` captures were inspected after the
  plugin reload. They show a continuous date-to-block flow, no card borders,
  no blank centered Markdown column, and no content-overlay controls.
- Validation commands passed after the final adjustment:

  ```text
  corepack pnpm run build-with-types
  corepack pnpm test -- --runInBand
  corepack pnpm run agent:workflow-check
  git diff --check
  ```

The exact commands, raw assertion output, and screenshots are stored in [`PLANE-BLP-16 runtime proof`](../harness/runs/PLANE-BLP-16/trace/implementation/journal-feed-layout-flow-2026-08-30.md).

File-Outliner content is deliberately outside this Markdown-specific selector;
its existing lifecycle and rendering remain unchanged.
