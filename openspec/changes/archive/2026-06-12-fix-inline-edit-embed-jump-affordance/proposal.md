# Change: Preserve inline-edit embed jump affordance

## Why
Issue #35 reports that inline-edit embeds remove Obsidian's native embed jump/open arrow. CDP investigation on the live 9224 Obsidian debug instance confirmed that BLP physically detaches `.markdown-embed-link` during inline-edit shell preparation, even though the existing inline-edit spec requires this affordance to remain available.

## What Changes
- Preserve Obsidian's top-level native `.markdown-embed-link` while inline edit is active.
- Mount BLP's inline editor host inside the native `.markdown-embed-content` wrapper instead of detaching the native shell.
- Hide native preview children without hiding or replacing the native jump affordance.
- Add DOM and CDP regression coverage for jump preservation and system-tail hiding.

## Impact
- Affected specs: `inline-editing-embeds`
- Affected code: inline-edit embed shell lifecycle, inline-edit CSS, focused tests and CDP validation
