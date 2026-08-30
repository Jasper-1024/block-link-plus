# Journal Feed readable-line-length runtime proof

- Task: `PLANE-BLP-16`
- Source issue: Plane work item `BLP-16` - Journal Feed visual/layout refinement (no linked external GitHub issue)
- Archive key: `PLANE-BLP-16`
- Worktree: `C:\Users\stati\Git\blp\block-link-plus`
- Branch: `master` at `73bd549` before this change
- Runtime: task-owned isolated Obsidian `1.13.6`, vault `blp`, CDP port `9236`
- Plugin: `block-link-plus` (`block-link-plus`), development checkout, version `2.0.16`

## Build and reload

```powershell
corepack pnpm run build-with-types
node scripts/obsidian-cdp.js --port 9236 eval "(async () => { await app.plugins.disablePlugin('block-link-plus'); await app.plugins.enablePlugin('block-link-plus'); })()"
```

The reload occurred in the task-owned isolated instance only. The task fixture's
existing anchor was then restored as a Journal Feed view for the probe:

```powershell
node scripts/obsidian-cdp.js --port 9236 eval "(async () => { const leaf = app.workspace.getLeaf('tab'); await leaf.setViewState({ type: 'blp-journal-feed-view', state: { file: '_blp_ui/journal.md' }, active: true }); })()"
```

## Probe command

```powershell
node scripts/obsidian-cdp.js --port 9236 eval-file scripts/cdp-snippets/probes/journal-feed-layout-flow.js
```

The probe finds a native Markdown control and two Journal Feed Markdown days.
It explicitly unmounts one Feed day to exercise virtualization, turns
`readableLineLength` off and on, and restores the original isolated-vault value
in `finally`.

## Resolution proof

```json
{"kind":"probe","scenario":"journal-feed-layout-flow","status":"passed","evidence":{"viewport":{"width":1707,"height":912},"fileLineWidth":"700px","unrestricted":{"enabled":false,"headerOffset":0,"overflow":0,"feedSizer":{"maxWidth":"none","marginInlineStart":"0px"},"nativeSizer":{"maxWidth":"none","marginInlineStart":"0px"},"dayMaxInlineSize":"none","virtualDayMaxInlineSize":"none"},"constrained":{"enabled":true,"headerOffset":0,"overflow":0,"feedSizer":{"maxWidth":"700px","marginInlineStart":"0px"},"nativeSizer":{"maxWidth":"700px","marginInlineStart":"auto"},"dayMaxInlineSize":"700px","virtualDayMaxInlineSize":"700px"},"hasInContentToolbar":false},"cleanup":{"status":"passed","warnings":[]}}
```

The margin serialization differs only because the Feed day itself is now the
same constrained column: the editor has no remaining width override, and the
actual constrained width equals native Markdown's `maxWidth`.

## Visual artifacts

- [constrained: readable line length on](journal-feed-readable-line-length-constrained-2026-08-30.png)
- [unrestricted: readable line length off](journal-feed-readable-line-length-unrestricted-2026-08-30.png)

They were captured after the build/reload above; the isolated instance was then
returned to its original enabled setting.

## Remaining scope

This verifies Obsidian's default theme in the isolated runtime. Theme-specific
presentation is intentionally not asserted, because the implementation reads
the theme/host `--file-line-width` variable rather than overriding it.

## Follow-up: native content-inset proof

Before the generic card-inset rule was restricted to ordinary Inline Edit hosts, the same probe failed with:

```text
Feed/native content inline inset differ: 10px vs 0px.
```

The generic card-inset rule was narrowed to ordinary Inline Edit hosts, so
Journal Feed no longer matches it and keeps the native/theme cascade. After
rebuilding and reloading, the probe passed in both readable-line-length states
with these additional fields:

```json
{"unrestricted":{"feedContentInlineInset":"0px","nativeContentInlineInset":"0px","feedContentBlockStart":0,"nativeContentBlockStart":0,"dateToContentGap":12,"declaredDateToContentGap":12},"constrained":{"feedContentInlineInset":"0px","nativeContentInlineInset":"0px","feedContentBlockStart":0,"nativeContentBlockStart":0,"dateToContentGap":12,"declaredDateToContentGap":12}}
```

The follow-up visual capture is
[journal-feed-native-content-inset-2026-08-30.png](journal-feed-native-content-inset-2026-08-30.png).
