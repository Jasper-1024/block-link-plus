# Core Global Search -> File Outliner navigation

2026-09-05. Foreground user-approved bug fix; no runner.
Baseline: 838fd544d4e33b05f1fbc035a4443462777a0d80.

## Reproduction and root cause

Fresh isolated Obsidian 1.13.6 / BLP 2.0.20 runtime on port 19520,
vault `blp-search-jump-audit`. Actual mouse click on the core Search result
opened `search-jump.md` in Outliner with scrollTop=0; the target block was below
the viewport. Temporary wrappers captured the actual navigation payload:

```json
{"match":{"content":"<source snapshot>","matches":[[7614,7638]]}}
```

The same match payload arrived at setEphemeralState: routing did not lose it.
The existing extractor only recognized line/startLoc.line, so it returned null.
Converting the captured start offset into source line 133 and passing that line
to existing navigation scrolled to 1463.33 and made target jump65 visible.
Temporary wrappers were restored in finally; no global runtime patch remains.

## Accepted change and evidence

One runtime-fix slice: accept validated UTF-16 match offsets and count preceding
LFs in the supplied source snapshot; preserve explicit line/startLoc precedence.
Reuse the existing source-line-to-block resolver, scrolling and highlight.
No Ctrl+F, editing, data model, core Search patch, or new setting changes.

- Before: actual mouse click above remained at file start. Added unit regression
  failed with expected source line 4, received null.
- After: identical actual mouse click scrolls to target; new reusable regression
  exercises production core Search DOM clicks, not handcrafted line payloads.
- Guards cover malformed/negative/fractional/reversed/out-of-bounds ranges.
  Tests cover Unicode UTF-16 offsets, CRLF, frontmatter, continuation lines,
  first-character matches, repeated hits and explicit line/startLoc precedence.

## Validation

- `corepack pnpm exec jest --runInBand`: 52 suites, 338 tests passed.
- `corepack pnpm run build-with-types`: passed.
- `corepack pnpm run agent:workflow-check`: passed.
- `git diff --check` / staged whitespace check: passed.
- `node scripts/obsidian-cdp.js --port 19520 eval-file scripts/cdp-snippets/regression/file-outliner/global-search-result-jump.js`:
  passed, cleanup passed. Actual clicks global65 -> global35 (continuation) ->
  global65 produced the expected visible and highlighted IDs, scrolling to
  1482.67 -> 648 -> 1482.67.
- `node scripts/obsidian-cdp.js --port 19520 eval-file scripts/cdp-snippets/regression/file-outliner/search-line-jump.js`:
  final rerun passed, cleanup passed, preserving explicit line, block subpath
  and legacy child line mapping. Initial invocation passed navigation assertions
  but failed persisted-settings cleanup comparison; that initial result is not
  counted as a passing gate. Effective memory/persisted scope was checked before
  the complete rerun; exact initial persisted-byte difference was not established.
- Strengthened new regression to check target ID, not visibility alone. Existing
  transient target hints can overlap during rapid navigation, so the test clears
  only its fixture's previous hint before each click. No production highlight
  behavior was changed.

## Standards review

Independent read-only reviewer: no blocking standards/correctness finding.
Optional stronger target-ID assertion was incorporated and rerun successfully.

## Spec review

Independent read-only reviewer: no blocking spec finding. Suggested coverage
for startLoc precedence, offset zero and malformed endpoints was added and passed.
Runtime proof was collected by the main session, not independently by reviewers.

## Handoff

Port 19520 remains available with `search-jump.md` and its left Search result
for user testing. Product fix and evidence committed locally only. No remote
push, release/version change or control-panel completion inferred.
