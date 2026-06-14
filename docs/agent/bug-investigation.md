# Bug Investigation

Use this process for BLP issue triage, regression analysis, and middle-flow
handoffs.

## Steps

1. Capture workspace state.

   ```powershell
   git status --short
   ```

2. Classify the report.

   Use: confirmed bug, possible bug, feature request, documentation issue, or
   cluster. If the issue bundles multiple symptoms, split it before planning a
   fix.

3. Find the relevant capability.

   Search specs, source, tests, docs, and CDP snippets:

   ```powershell
   rg -n "<keyword>" openspec src scripts doc docs
   ```

4. Decide the gate.

   Use [openspec-gates.md](openspec-gates.md). Bug fixes that restore intended
   behavior usually do not need a proposal. Changes to intended behavior do.

5. Reproduce with the smallest useful check.

   Prefer targeted static evidence when enough. Use the isolated Obsidian/CDP
   runtime when behavior depends on Obsidian DOM, CodeMirror state, plugin
   lifecycle, focus, scroll, or settings.

6. Identify root cause.

   Reference exact files, functions, selectors, settings, and runtime facts. Do
   not infer from issue titles alone when runtime behavior can be checked.

7. Plan the fix.

   Keep the plan scoped to the confirmed sub-bug. State expected files, why the
   owner layer is correct, and what could regress.

8. Plan validation.

   Pick targeted Jest tests, `npm test`, `npm run build-with-types`, and CDP
   snippets according to blast radius. Runtime snippets must restore settings or
   clearly state any side effects.

9. Handoff.

   Use [evidence-format.md](evidence-format.md). Stop without code edits at the
   middle-flow gate unless implementation was requested.

## Notes

- After rebuilding plugin CSS or JS, a full Obsidian reload may be needed before
  CDP checks reflect current code.
- Temporary notes should live in the isolated debug vault, usually under
  `_blp_tmp/`.
- If static analysis is insufficient, say which runtime evidence is missing.
