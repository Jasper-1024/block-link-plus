# Journal Feed: Respect Obsidian Readable Line Length

Status: adopted; runtime-validated in the isolated Obsidian instance
Date: 2026-08-30

## Question

Journal Feed currently makes each embedded Markdown body full-width and
left-aligned even when the user has enabled Obsidian's **Readable line length**
setting. The Feed should instead follow the same user preference as an
ordinarily opened note while keeping a date heading and its body in one visual
column.

## Primary evidence

1. Obsidian documents **Editor → Display → Readable line length** as a setting
   that limits the maximum line length: less content fits on screen, but long
   passages are easier to read. It is therefore a user display preference, not
   a Journal Feed layout default. [Obsidian Help: Settings](https://obsidian.md/help/settings)

2. Obsidian's official desktop changelog records a **Toggle readable line
   length** command in v1.9.9. A Feed implementation must consequently handle
   the setting as runtime state rather than assume that it is fixed when a
   Journal Feed opens. [Obsidian v1.9.9 desktop changelog](https://obsidian.md/changelog/2025-08-15-desktop-v1.9.9/)

3. The Obsidian core implementation is proprietary, so there is no published
   source file to cite for its selectors. The task-owned runtime is direct
   product evidence: in Obsidian 1.13.6, with
   `app.vault.getConfig("readableLineLength") === true`, ordinary and embedded
   Markdown source views carry `.is-readable-line-width`. Ordinary
   `.cm-sizer` computed to `max-width: 700px` with automatic inline margins;
   the former Feed-only rule instead changed embedded sizers to
   `max-width: none` and `margin-inline: 0`. This was the immediate reason the
   Feed ignored the setting.

4. The task-owned runtime exposes `Vault.on("config-changed", ...)` and
   reports the changed key as `readableLineLength`. This is the lifecycle seam
   used to keep virtualized Journal Feed days stable when a day editor is not
   mounted. It is deliberately a live host-config projection, not a BLP
   preference or saved layout value.

## Recommendation

Do not replace the user preference with a BLP width, breakpoint, or a measured
pixel offset.

1. Remove the Journal Feed-local rule that sets the embedded Markdown
   `.cm-sizer` to `max-width: none` and `margin-inline: 0`. That restores the
   exact normal-note behavior, including a theme or snippet's own readable
   width and margin rules.
2. Keep the day heading and body coherent by projecting the current host
   setting onto the *Feed-owned root* while the view is alive. The root
   receives `data-blp-readable-line-length="true"` from
   `Vault.getConfig("readableLineLength")`, and refreshes it from
   `config-changed`. Markdown days receive a static render-mode marker when
   they are created. The resulting selector is:

   ```css
   .blp-journal-feed-root[data-blp-readable-line-length="true"]
     .blp-journal-feed-day[data-blp-journal-render-mode="markdown"] {
     max-inline-size: var(--file-line-width);
     margin-inline: auto;
   }
   ```

   This is not an independent width: `--file-line-width` is the user's active
   Obsidian/theme value. The attribute exists only in this view's DOM; no value
   is persisted in BLP settings. With the setting off it is `false`, so both
   heading and body use the Feed's full available width. With it on, every
   Markdown day—including a virtualized/unmounted one—shares the user-selected
   readable column. The native `.cm-sizer` remains untouched.
3. Validate with the setting both on and off in the isolated CDP instance.
   Assert (a) the embedded source view's computed styles equal a normally
   opened source view, (b) the date heading and body have the same inline-start
   coordinate in each state, and (c) a mounted and unmounted day retain the
   same width constraint. Toggle during the same session too, because Obsidian
   exposes a user command for this setting.

## Scope boundary

This is a Journal Feed CSS/layout correction only. It should not change the
embed lifecycle, observer, focus bridge, outliner implementation, or a user's
global configuration.

## Adoption evidence

The implementation removes the Feed-local `.cm-sizer` override. It uses only
`--file-line-width` and an ephemeral root data attribute that mirrors the
current host setting for the lifespan of the view. This avoids a hard-coded
width and prevents a virtualized day header from changing column position when
its editor mounts or unmounts. The reusable CDP probe verified a single
isolated runtime session with both states, a native Markdown control, and an
explicitly unmounted Markdown day; it restores the original user setting
afterward:

```json
{"unrestricted":{"enabled":false,"headerOffset":0,"overflow":0,"feedSizerMaxWidth":"none","nativeSizerMaxWidth":"none","virtualDayMaxInlineSize":"none"},"constrained":{"enabled":true,"headerOffset":0,"overflow":0,"feedSizerMaxWidth":"700px","nativeSizerMaxWidth":"700px","virtualDayMaxInlineSize":"700px"}}
```

The exact command, full output, and visual captures are stored in the
[task runtime proof](../harness/runs/PLANE-BLP-16/trace/implementation/journal-feed-readable-line-length-2026-08-30.md).
