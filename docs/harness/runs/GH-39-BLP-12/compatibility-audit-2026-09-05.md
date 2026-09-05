# BLP-12 compatibility audit: 2026-09-05

Original audit status: needs revision. The confirmed conflict below was subsequently fixed and verified; see [completion and design amendment](completion-2026-09-05.md). The original observations are preserved below.

Runtime: independent vault `blp12-compat-audit`, CDP 19234, Obsidian 1.13.6; HEAD bf5c5f9 plus existing uncommitted search fixes. Build with types and the existing two adapter/command-routing suites (26 tests) passed.

## Confirmed remaining issue

`InlineEditSearchAdapter.ts:createSearchCursorWrapper` intercepts every call to the same host editor's `searchCursor` while Find is open. Another plugin's caller is also given aggregate results and overwrites bridge-wide `activeQuery`.

Twice reproduced through CDP:

1. Find closed: an independent `searchCursor('embedded-needle')` returns 0 results because the text exists only in the embed.
2. Find open: the same independent API call returns 1 result with detached-editor coordinates.
3. Another independent query for `host-needle` changes the bridge query from `embedded-needle` to `host-needle`, while the panel retains its original cursor.
4. `isLiveAggregateMatch` now rejects the panel's unchanged current embed result. Its navigation/highlight validation can fail until a later panel refresh repairs state.
5. Close Find: the independent query returns 0 again.

Reproduction probes (manual isolated instance only):

    node scripts/obsidian-cdp.js --port 19234 eval-file .tmp/blp12-compat-setup.js
    node scripts/obsidian-cdp.js --port 19234 eval-file .tmp/blp12-compat-boundaries.js

Evidence: nativeExternalCountBefore=0; externalCountWhileFindOpen=1; queryBefore.search=embedded-needle; queryAfter.search=host-needle; validAfterExternal=false; panelCursorWasUnchanged=true.

No source corruption or named third-party plugin failure was demonstrated. The probe simulates another plugin's API calls. Actual plugin combinations and other Obsidian versions remain untested.

Proposed correction: explicitly scope aggregate cursor creation to the native Find panel. Other callers must receive native cursors and must not update panel query/current-match state. Focus or query equality alone is insufficient to identify ownership. Add a same-editor, two-caller regression and rerun CDP.

## Passed compatibility boundaries

- Another open note's five editor methods remained unchanged; its native search worked.
- Adding/removing another highlight class preserved the embedded Find highlight.
- Wrappers installed before and after BLP's Find wrapper survived close in the expected chain; host selection still worked.
- Three open/close cycles left zero bridges and restored all five editor methods.
- Disabling BLP with Find open removed the bridge and restored editor methods. A later global command wrapper survived; its independent command callback ran once.
- BLP re-enabled successfully. Probe wrappers were removed; disposable fixture notes remain for reproduction.

Lifecycle probe: `.tmp/blp12-compat-lifecycle.js`.

## Records and scope

Stale focus behavior exists locally in approved-design.md, implementation-routing.md, implementation.md and code-review.md. The approved design is a Plane export; both the local snapshot and the current control-plane narrative eventually need an explicit amendment describing passive scroll/highlight with Find retaining focus. Preserve historical evidence. No Plane writes, merge or release occurred in this audit.

Separate launcher observation: the fresh launcher reported ready despite initial duplicate-view-registration and no-tab-group errors. A full app reload after layout initialization recovered the isolated runtime. Engine availability and a mounted embed were verified before probes. The launcher readiness race remains unmodified and is separate from the search conflict.
