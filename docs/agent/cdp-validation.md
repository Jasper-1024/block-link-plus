# CDP Validation

Use the project CDP runtime when a BLP issue needs real Obsidian Desktop
evidence. Do not use the user's daily vault.

For `cdp-required` tracker items, this runtime check is mandatory before
root-cause analysis. Use the fixed debug port `19225` for this experiment.

1. Confirm dependency availability:

   ```powershell
   corepack pnpm install --frozen-lockfile
   Test-Path .\node_modules
   node -e "require.resolve('ws')"
   corepack pnpm run build-with-types
   ```

2. Try the fixed runtime first:

   ```powershell
   $env:OB_CDP_PORT='19225'
   $env:OB_CDP_TITLE_CONTAINS=' - blp - '
   node scripts/obsidian-cdp.js list
   ```

3. If the fixed runtime is not reachable, launch it on the same fixed port:

   ```powershell
   corepack pnpm run obsidian:debug-env -- -Port 19225
   ```

4. Confirm CDP target and plugin state on `19225`.

If the port is occupied by a non-BLP target, or the fixed-port runtime cannot be
started and verified, stop at Runtime Blocked. Capture the exact command and
important output. Do not fall back to an auto-selected port such as `19226`, and
do not produce static root-cause or fix-plan claims.

## Start Runtime

```powershell
corepack pnpm run obsidian:debug-env -- -Port 19225
```

The launcher creates a disposable profile and vault, links the current checkout
as the `block-link-plus` plugin, enables community plugins, opens a debug note,
and prints JSON with the selected CDP port. The default script port is also
`19225`; passing `-Port 19225` makes the intended runtime explicit in logs.

The launcher treats Obsidian community-plugin trust as part of runtime setup. It
sets the profile-local `enable-plugin-<vaultId>` flag, then uses CDP to dismiss
matching trust or restricted-mode prompts before loading the plugin. The printed
JSON includes `pluginTrust`, `trustPrompts`, and `runtime`; if `runtime` does not
show `blockLinkPlusLoaded: true`, stop the run and record the failed phase.

Do not start a second runtime just because `19225` is already in use. First
check whether it is the current BLP debug runtime. If it is not reusable, stop
with Runtime Blocked for this experiment.

## Select Target

Set the fixed port before follow-up commands:

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
