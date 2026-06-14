# CDP Validation

Use the project CDP runtime when a BLP issue needs real Obsidian Desktop
evidence. Do not use the user's daily vault.

## Start Runtime

```powershell
npm run obsidian:debug-env
```

The launcher creates a disposable profile and vault, links the current checkout
as the `block-link-plus` plugin, enables community plugins, opens a debug note,
and prints JSON with the selected CDP port.

For a fixed port:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 19225
```

## Select Target

Set the printed port before follow-up commands:

```powershell
$env:OB_CDP_PORT='19225'
$env:OB_CDP_TITLE_CONTAINS=' - blp - '
node scripts/obsidian-cdp.js list
node scripts/obsidian-cdp.js eval "app.vault.getName()"
```

Use `OB_CDP_TARGET_ID` only when multiple Obsidian targets are present and the
title filter is not enough.

## Common Commands

```powershell
node scripts/obsidian-cdp.js eval "app.workspace.getActiveFile()?.path"
node scripts/obsidian-cdp.js open-note "_debug/start.md"
node scripts/obsidian-cdp.js set-editor "doc/debug/_blp-ai-workbench-baseline.md"
node scripts/obsidian-cdp.js eval-file "scripts/cdp-snippets/<snippet>.js"
node scripts/obsidian-cdp.js screenshot ".tmp/cdp-shot.png"
```

## Choosing Snippets

Use [../../doc/debug/cdp-script-inventory.md](../../doc/debug/cdp-script-inventory.md)
to choose snippets.

- Prefer a current regression snippet for the affected feature.
- Use a broad smoke snippet after implementation or when checking area health.
- Use archive snippets only when a current issue names the older investigation.
- Create one-off evals for exploration; promote them to
  `scripts/cdp-snippets/` only if they become reusable regressions.

## State Rules

- Keep temporary files in the disposable vault, usually under `_blp_tmp/`.
- Snapshot and restore plugin settings when snippets toggle behavior.
- Delete temporary notes when practical.
- After changing code and running a build, reload Obsidian or the plugin before
  trusting CDP results.
- Report any snippet side effect that was not restored.
