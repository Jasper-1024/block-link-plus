# Obsidian CDP

`scripts/obsidian-cdp.js` is the only supported CDP client in this repository.
It requires an explicit runtime port through `--port` or `OB_CDP_PORT`; it never
defaults to 9222 and never chooses the first matching target.

## Manual runtime

Allocate a free port yourself. 9222 is a common manual choice, not a default:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-obsidian-debug-env.ps1 -Port 9222 -VaultName blp-manual
node scripts/obsidian-cdp.js --port 9222 --title-contains blp-manual list
node scripts/obsidian-cdp.js --port 9222 --title-contains blp-manual eval "app.vault.getName()"
```

The launcher refuses a missing or occupied port. It creates an isolated profile
and vault and links the current checkout as `.obsidian/plugins/block-link-plus`.

## Reliability contract

- HTTP target discovery deadline: 5 seconds.
- WebSocket connect deadline: 5 seconds.
- Overall command deadline: 60 seconds; timeout exit code: 124.
- At 30 seconds, stderr emits `BLP_CDP_EVENT {"type":"slow",...}`.
- Start, timeout, and error events use the same machine-readable prefix.
- Target filters (`id`, type, literal title, literal URL) must resolve exactly
  one target; zero or multiple candidates fail with their summaries.
- Timeout and socket closure reject pending requests and close the socket.

Use `--params-file` for complex `call` parameters and `--raw` when the complete
CDP response is evidence.

## Snippet catalog

Query the machine-readable inventory instead of guessing filenames:

```powershell
node scripts/obsidian-cdp.js catalog list
node scripts/obsidian-cdp.js catalog show file-outliner-arrow-nav-e2e
```

Stable regression snippets return:

```json
{
  "kind": "regression",
  "scenario": "stable scenario id",
  "status": "passed",
  "evidence": {},
  "cleanup": {"status": "passed", "warnings": []}
}
```

A failed/missing cleanup contract taints the runtime and invalidates the result.
Broad smoke checks and exploratory probes are evidence aids, not regressions.
