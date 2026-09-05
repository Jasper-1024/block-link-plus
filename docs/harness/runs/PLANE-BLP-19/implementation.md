# BLP-19 implementation and validation

2026-09-05. Foreground implementation; user approved the three-part proposal
after investigation. Baseline: c9434e283e643334ae70bfeddc3be42413d50d66.
The earlier investigation file is historical, not the final implementation status.

## Accepted scope

Follow Obsidian autoPairBrackets / autoPairMarkdown settings, reuse CodeMirror
pairing for Markdown delimiters and selection wrapping, complete a three-backtick
opening fence within the current block, and use block-local Enter within code
while keeping structural Enter outside code. No editor replacement, global
prototype patch, new user setting, or added dependency.

## Slice evidence

| Slice | Mode / before | Implementation | After |
| --- | --- | --- | --- |
| Settings and Markdown pairing | Runtime-fix: original CDP comparison found missing backtick/asterisk/underscore pairing and wrapping; disabling global bracket pairing still inserted a closer | Dynamic CodeMirror languageData configuration reads the vault settings per operation | Native and Outliner actual typed input/selection agree; toggling settings on the same editor works |
| Fence completion and Enter | Runtime-fix: third backtick left only an opener; Enter created a second block | Small scoped input handler and fence-aware newline command before structural Enter | Opening/closing fence in one block; language text, Enter, Shift+Enter, save/reopen pass |
| Delimiter boundaries | TDD: 3 boundary/task tests failed (expected true/false vs actual opposite) after initial implementation | Respect cursor before opener / within closer; remove blanket task exclusion | All 3 pass; runtime covers task-contained fence and before-closer Enter |

The first unit invocation failed because the new module did not exist yet; this
is not claimed as behavioral reproduction. The actual original failure was
captured by the CDP input comparison recorded in the investigation.

## Commands and results

- `corepack pnpm exec jest --runInBand`: 52 suites, 324 tests passed.
- `corepack pnpm run build-with-types`: passed.
- `corepack pnpm run agent:workflow-check`: passed.
- `git diff --check` / staged whitespace check: passed.
- `node scripts/verify-outliner-markdown-input.cjs 19519 blp-19-input-audit`:
  16 runtime scenario groups passed; cleanup passed. Actual Obsidian 1.13.6,
  plugin 2.0.20 built from this working tree. The script uses the supported CDP
  client with an explicit port and vault guard; it restores settings and removes
  only its uniquely named fixture folder.
- The runtime script exercises the real Outliner editor/basicSetup input path,
  native comparison, closer skipping/deletion, Markdown wrapping, language fence,
  task and delimiter-boundary Enter, live settings, undo/redo, save/reopen,
  CDP composition commit, and bulk insertion.

Initial exploratory script had a fixture-count assumption (one block even after
a previous structural split). Corrected to compare pre/post block counts;
subsequent reusable regression uses unique fixtures and passes.

## Standards review

Independent reviewer requested implementation evidence and real pairing coverage
(unit config assertions alone do not test basicSetup). Addressed with this record
and the reusable CDP regression. Re-review found no new blocking standards or
architecture finding. Reviewer did not operate the runtime; execution evidence
was collected by the main session.

## Spec review

Independent reviewer found two P2 gaps: blanket task-block exclusion and cursor
position ignored on fence delimiter lines. Both fixed with failing-before /
passing-after tests and runtime checks. Re-review found no remaining blocking
spec finding.

## Handoff

Fresh task instance remains on port 19519 for user testing. No release/version
bump, remote push, or Done/merge approval inferred. CDP composition testing is
not a claim that physical Chinese IMEs or mobile were tested. Bulk insert testing
does not replace every operating-system clipboard/third-party paste scenario.
