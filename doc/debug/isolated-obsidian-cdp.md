# Isolated Obsidian CDP Debug Environment

Use this when a BLP issue needs runtime evidence from a real Obsidian Desktop
window, but should not depend on the user's daily Obsidian profile or notes.

## Start

```powershell
npm run obsidian:debug-env
```

The script creates a fresh temporary run directory on each launch:

- `profile/`: disposable Obsidian/Electron profile passed through `--user-data-dir`
- `vault/blp/`: disposable debug vault
- `vault/blp/.obsidian/plugins/block-link-plus`: directory link to the current repo

It then starts Obsidian with a high CDP port, enables community plugins through
CDP, opens `_debug/start.md`, and prints a JSON object with the selected port
and runtime state.

## Follow-Up CDP Commands

Use the port printed by the script:

```powershell
$env:OB_CDP_PORT='19225'
$env:OB_CDP_TITLE_CONTAINS=' - blp - '
node scripts/obsidian-cdp.js list
node scripts/obsidian-cdp.js eval "app.vault.getName()"
```

For a fixed port:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 19225
```

If the fixed port is busy, omit `-Port`; the script scans from `-MinPort`
(default `19225`) upward.

## State Rules

Do not commit or reuse generated profile state. The script intentionally
regenerates profile/vault state so test notes, workspace layout, local storage,
cache, and plugin toggles from one investigation do not leak into the next.

The persistent source of truth is the repo plus this launcher:

- vault registration is generated into the temporary profile
- community plugin enablement is applied through CDP
- the plugin directory is linked to the current checkout; on Windows this may be
  a symbolic link or a junction, depending on local privileges
- runtime validation must confirm `blockLinkPlusLoaded: true`

After changing plugin code, run the normal build and then reload the debug
Obsidian target before re-running the CDP assertion.

## Script Ownership

Use `scripts/start-obsidian-debug-env.ps1` and `scripts/obsidian-cdp.js` as the
default BLP runtime debugging surface. Skill-bundled PowerShell CDP helpers under
`.codex/skills/obsidian-runtime-debug/scripts/` are portable fallbacks, not the
normal project entrypoint.

Stable project regressions live under `scripts/cdp-snippets/`. Historical probes
and imported scratch scripts live under `scripts/cdp-snippets/archive/`. Enhanced
List selector maps and measurement knowledge live in
`.codex/skills/blp-enhanced-list-ui-debug/references/`.
