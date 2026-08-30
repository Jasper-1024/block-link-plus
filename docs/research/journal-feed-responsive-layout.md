# Journal Feed: Responsive Same-Column Layout Research

Status: research note; no product-code decision made here  
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
   [CSS 2.2, §§10.1 and 10.3.3](https://www.w3.org/TR/CSS22/visudet.html#blockwidth)

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
   is rendered beneath it. That is evidence for the structural reference we
   want—title and blocks share one parent layout context—not evidence for
   copying a fixed pixel width from Logseq. The examined source does not supply
   a Journal-specific fixed content width to adopt.
   [Logseq page component, journal/page structure](https://github.com/logseq/logseq/blob/master/src/main/frontend/components/page.cljs)

## Minimal implementation principle

Keep each `.blp-journal-feed-day` as the sole shared containing block for its
date header and embedded content. Locally neutralize only the readable-line
length constraint that belongs to the embedded Markdown leaf:

```css
/* Scope is deliberately limited to Journal Feed-owned embedded Markdown. */
.blp-journal-feed-day-editor
  .markdown-source-view.mod-cm6.is-readable-line-width
  .cm-sizer {
  max-width: none;
  margin-inline: 0;
}
```

This has no literal content width, `min-width`, `min-height`, percentage, or
new media query. The header and editor will both respond to the Feed's existing
available inline size, including narrow panes and mobile. `margin-inline` is
used rather than physical left/right margins so the alignment follows writing
direction.

Do **not** set `width: 100%` unless a runtime measurement shows another
descendant is shrink-to-fit: the normal block `auto` width is already the
standards-defined responsive behavior. Do **not** alter the `EmbedLeafManager`,
outliner lifecycle, observers, or placeholder sizing to solve a purely
horizontal CSS alignment issue.

## Validation required before adoption

On the isolated task-owned Obsidian/CDP instance, assert for a mounted Markdown
day that the day header and `.cm-sizer` have the same inline-start position;
also verify the editor remains contained at a narrow pane width. Check a
File-Outliner day separately, but do not apply Markdown-editor selectors to it
without evidence. Existing lifecycle, focus, edit, and unload checks must stay
unchanged.
