# BLP-19: Markdown input behavior investigation

Date: 2026-09-05. Foreground investigation only; no runner or product changes.

## Runtime and method

Fresh isolated vault `blp-19-input-audit`, port 19519, Obsidian 1.13.6,
BLP 2.0.20, current master c9434e2. No personal instance was touched.
Initially both `autoPairBrackets` and `autoPairMarkdown` were true.
Fixtures are `native.md` and `outline.md` in the disposable vault.
Native view is ordinary Markdown Live Preview, not File Outliner.

Exploratory scripts in ignored `.tmp/`:

```powershell
node scripts/obsidian-cdp.js --port 19519 eval-file .tmp/blp19-setup.js
node .tmp/blp19-input-audit.cjs fence
node .tmp/blp19-input-audit.cjs
node .tmp/blp19-input-audit.cjs edges
```

Setup uses editor dispatch only to reset initial text/selection. Characters are
then sent individually using CDP Input.dispatchKeyEvent, not inserted directly
into editor state. Enter uses the repository CDP key command. Backspace uses
the generic CDP call because the key shorthand does not support Backspace.
Results were read from the actual focused editor state and Outliner block count.

## Observations

| Action | Native Live Preview | Outliner |
| --- | --- | --- |
| Type three backticks | Opening + newline + closing fence; caret after opening | Only opening fence |
| Enter after opening fence | Blank code line, caret inside fence | Splits into two blocks |
| Shift+Enter after opening fence | Blank code line inside fence | Inserts newline in same block, no closing fence |
| Type opening parenthesis, square bracket, double quote | Pairs | Pairs |
| Backspace between freshly paired parentheses | Deletes pair | Deletes pair |
| Type closing parenthesis over auto-inserted closer | Skips closer | Skips closer |
| Select word, type opening parenthesis | Wraps and retains selection | Same |
| Type one backtick, asterisk, underscore | Pairs | Inserts only the typed character |
| Select word, type backtick / asterisk / tilde / equals | Wraps word, retains selection | Ordinary replacement of selected word |
| Type two asterisks / tildes / equals into empty editor | Two characters, caret at end | Same final text and caret in this sequence |
| Disable autoPairBrackets, then type opening parenthesis | Single character | Still pairs |

Do not extrapolate the two-character observation into equivalence for all
formatting contexts. Selection wrapping and one-character input already differ.
Replacement of selected text is ordinary input behavior, not evidence of
unprompted data loss.

## Code explanation

- `src/features/file-outliner-view/editor-state.ts`: createOutlinerEditorState
  installs generic basicSetup, line wrapping, BLP keymaps and listeners. It does
  not consume the Obsidian pairing settings or install Markdown pairing rules.
- Installed `@codemirror/basic-setup/dist/index.js` includes closeBrackets and
  closeBracketsKeymap. This explains the working generic bracket behaviors.
- `src/features/file-outliner-view/view.ts`: createEditorState supplies no
  pairing settings. onEditorEnter always routes non-task blocks to
  splitAtSelection. onEditorSoftEnter inserts a literal newline (tasks split).
- Therefore the fence defect is not merely a disabled global setting. There
  are two separate seams: Markdown character handling and structural key handling.

## Recommended bounded scope, pending user agreement

1. Follow Obsidian's bracket/Markdown pairing settings, including disabling them.
2. Fill the verified Markdown pairing and selection-wrapping gaps, prioritizing
   fenced code and inline code. Preserve generic behavior already working.
3. Decide a narrow code-fence exception: Enter inside a fenced code region
   should insert a newline within the current block; outside code retain normal
   Outliner structural Enter. This is a proposed behavior change, not yet approved.
4. Do not import all Obsidian internal editor extensions or replace the Outliner
   editor merely to get pairing. Assess a small settings-aware input module first.

Before implementation acceptance, cover language-tagged fences, existing closers,
indentation, escaped symbols, multiline selections, paste vs typing, undo/redo,
Chinese IME, save/reopen, and task blocks. These were NOT validated in this
initial investigation. Mobile was not tested.

## Cleanup and current state

The two Obsidian pairing settings were restored to true. Runtime and disposable
fixtures are retained for the user's follow-up, not archived/deleted. Only
investigation artifacts were added; no product code, release, or Plane state
changes were made.
