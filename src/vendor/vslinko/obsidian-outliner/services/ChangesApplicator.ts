// @ts-nocheck
import { MyEditor } from "../editor";
import { List, Position, Root, isRangesIntersects } from "../root";

export class ChangesApplicator {
  apply(editor: MyEditor, prevRoot: Root, newRoot: Root) {
    // Debug hook: set `window.__blpOutlinerDebug = true` in DevTools to capture the
    // last apply() inputs/outputs without spamming the console.
    const captureDebug = (phase: string, payload: any) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = typeof window !== "undefined" ? (window as any) : null;
        if (!w || w.__blpOutlinerDebug !== true) return;

        const MAX = 2000;
        const clip = (s: any) => {
          const str = typeof s === "string" ? s : JSON.stringify(s);
          if (!str) return str;
          if (str.length <= MAX) return str;
          return str.slice(0, MAX) + `...(len=${str.length})`;
        };

        const evt = {
          t: Date.now(),
          phase,
          ...payload,
          // Keep payload JSON-ish and bounded.
          oldString: payload?.oldString ? clip(payload.oldString) : undefined,
          newString: payload?.newString ? clip(payload.newString) : undefined,
          replacement: payload?.replacement ? clip(payload.replacement) : undefined,
          safeReplacement: payload?.safeReplacement ? clip(payload.safeReplacement) : undefined,
        };

        const prev = w.__blpOutlinerLastApply;
        const events = Array.isArray(prev?.events) ? prev.events.slice() : [];
        events.push(evt);
        if (events.length > 20) events.splice(0, events.length - 20);
        w.__blpOutlinerLastApply = { events };
      } catch {
        // ignore debug hook errors
      }
    };

    const changes = this.calculateChanges(editor, prevRoot, newRoot);
    if (changes) {
      const { replacement, changeFrom, changeTo } = changes;
      const rootRange = prevRoot.getContentRange();
      let oldString = "";
      let newString = "";
      try {
        oldString = editor.getRange(rootRange[0], rootRange[1]);
      } catch {
        oldString = "";
      }
      try {
        newString = newRoot.print();
      } catch {
        newString = "";
      }
      captureDebug("before-apply", {
        rootRange,
        changeFrom,
        changeTo,
        replacement,
        oldLen: oldString.length,
        newLen: newString.length,
        oldString,
        newString,
      });

      // Work around an observed Obsidian CM6 replaceRange edge case where replacing a multi-line
      // range ending at EOL may also consume the following line break, causing the next line to be
      // appended to the previous one (e.g. list items "g" + "f" joined on the same line).
      //
      // If the cursor position maps to a '\n' in the underlying document, replace that newline
      // explicitly and re-add it in the replacement to preserve line boundaries.
      const { changeTo: safeChangeTo, replacement: safeReplacement } =
        this.ensureTrailingNewlinePreserved(editor, changeTo, replacement);

      const { unfold, fold } = this.calculateFoldingOprations(
        prevRoot,
        newRoot,
        changeFrom,
        changeTo,
      );

      for (const line of unfold) {
        editor.unfold(line);
      }

      // Suppress Enhanced List delete-subtree cleanup while we apply structural outliner edits.
      // Those edits can temporarily remove list markers and must not be interpreted as user deletion.
      let w: any = null;
      try {
        w = typeof window !== "undefined" ? (window as any) : null;
        if (w) w.__blpOutlinerApplying = (w.__blpOutlinerApplying ?? 0) + 1;
      } catch {
        w = null;
      }

      try {
        editor.replaceRange(safeReplacement, changeFrom, safeChangeTo);
      } finally {
        try {
          if (w) {
            w.__blpOutlinerApplying = (w.__blpOutlinerApplying ?? 1) - 1;
            if (w.__blpOutlinerApplying <= 0) {
              delete w.__blpOutlinerApplying;
            }
          }
        } catch {
          // ignore
        }
      }
      captureDebug("after-replaceRange", { safeChangeTo, safeReplacement });

      for (const line of fold) {
        editor.fold(line);
      }
    }

    const sels = newRoot.getSelections();
    const safeSels = this.clampSelections(editor, sels);
    captureDebug("before-setSelections", { selections: sels, safeSelections: safeSels });
    try {
      editor.setSelections(safeSels);
    } catch {
      // Last resort: keep the editor usable even if selection math went wrong.
      try {
        editor.setSelections([{ anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 0 } }]);
      } catch {
        // ignore
      }
    }
    captureDebug("after-setSelections", {});
  }

  private clampSelections(editor: MyEditor, selections: any[]) {
    if (!Array.isArray(selections) || selections.length === 0) {
      return [{ anchor: { line: 0, ch: 0 }, head: { line: 0, ch: 0 } }];
    }

    let lastLine = 0;
    try {
      lastLine = editor.lastLine();
      if (!Number.isFinite(lastLine) || lastLine < 0) lastLine = 0;
    } catch {
      lastLine = 0;
    }

    const clampPos = (pos: any) => {
      let line = Number(pos?.line ?? 0);
      let ch = Number(pos?.ch ?? 0);
      if (!Number.isFinite(line)) line = 0;
      if (!Number.isFinite(ch)) ch = 0;

      line = Math.max(0, Math.min(lastLine, Math.floor(line)));

      let lineText = "";
      try {
        lineText = editor.getLine(line) ?? "";
      } catch {
        lineText = "";
      }
      const maxCh = Math.max(0, lineText.length);
      ch = Math.max(0, Math.min(maxCh, Math.floor(ch)));

      return { line, ch };
    };

    return selections.map((s) => ({
      anchor: clampPos(s?.anchor),
      head: clampPos(s?.head),
    }));
  }

  private calculateChanges(editor: MyEditor, prevRoot: Root, newRoot: Root) {
    const rootRange = prevRoot.getContentRange();
    const oldString = editor.getRange(rootRange[0], rootRange[1]);
    const newString = newRoot.print();

    const changeFrom = { ...rootRange[0] };
    const changeTo = { ...rootRange[1] };
    let oldTmp = oldString;
    let newTmp = newString;

    while (true) {
      const nlIndex = oldTmp.lastIndexOf("\n");

      if (nlIndex < 0) {
        break;
      }

      const oldLine = oldTmp.slice(nlIndex);
      const newLine = newTmp.slice(-oldLine.length);

      if (oldLine !== newLine) {
        break;
      }

      oldTmp = oldTmp.slice(0, -oldLine.length);
      newTmp = newTmp.slice(0, -oldLine.length);
      const nlIndex2 = oldTmp.lastIndexOf("\n");
      changeTo.ch =
        nlIndex2 >= 0 ? oldTmp.length - nlIndex2 - 1 : oldTmp.length;
      changeTo.line--;
    }

    while (true) {
      const nlIndex = oldTmp.indexOf("\n");

      if (nlIndex < 0) {
        break;
      }

      const oldLine = oldTmp.slice(0, nlIndex + 1);
      const newLine = newTmp.slice(0, oldLine.length);

      if (oldLine !== newLine) {
        break;
      }

      changeFrom.line++;
      oldTmp = oldTmp.slice(oldLine.length);
      newTmp = newTmp.slice(oldLine.length);
    }

    if (oldTmp === newTmp) {
      return null;
    }

    return {
      replacement: newTmp,
      changeFrom,
      changeTo,
    };
  }

  private ensureTrailingNewlinePreserved(
    editor: MyEditor,
    changeTo: Position,
    replacement: string,
  ): { changeTo: Position; replacement: string } {
    if (replacement.endsWith("\n")) {
      return { changeTo, replacement };
    }

    // If changeTo points at the line break (EOL), include the newline in the replaced range and
    // re-add it to the replacement so we keep the next line separated.
    try {
      const doc = editor.getValue();
      const toOff = editor.posToOffset(changeTo);
      if (typeof toOff !== "number" || toOff < 0 || toOff >= doc.length) {
        return { changeTo, replacement };
      }

      if (doc[toOff] !== "\n") {
        return { changeTo, replacement };
      }

      const nextLine = changeTo.line + 1;
      // Guard against out-of-range line numbers (shouldn't happen if doc[toOff] is '\n').
      if (nextLine > editor.lastLine()) {
        return { changeTo, replacement };
      }

      return {
        changeTo: { line: nextLine, ch: 0 },
        replacement: replacement + "\n",
      };
    } catch {
      return { changeTo, replacement };
    }
  }

  private calculateFoldingOprations(
    prevRoot: Root,
    newRoot: Root,
    changeFrom: Position,
    changeTo: Position,
  ) {
    const changedRange: [Position, Position] = [changeFrom, changeTo];

    const prevLists = getAllChildren(prevRoot);
    const newLists = getAllChildren(newRoot);

    const unfold: number[] = [];
    const fold: number[] = [];

    for (const prevList of prevLists.values()) {
      if (!prevList.isFoldRoot()) {
        continue;
      }

      const newList = newLists.get(prevList.getID());

      if (!newList) {
        continue;
      }

      const prevListRange: [Position, Position] = [
        prevList.getFirstLineContentStart(),
        prevList.getContentEndIncludingChildren(),
      ];

      if (isRangesIntersects(prevListRange, changedRange)) {
        unfold.push(prevList.getFirstLineContentStart().line);
        fold.push(newList.getFirstLineContentStart().line);
      }
    }

    unfold.sort((a, b) => b - a);
    fold.sort((a, b) => b - a);

    return { unfold, fold };
  }
}

function getAllChildrenReduceFn(acc: Map<number, List>, child: List) {
  acc.set(child.getID(), child);
  child.getChildren().reduce(getAllChildrenReduceFn, acc);

  return acc;
}

function getAllChildren(root: Root): Map<number, List> {
  return root.getChildren().reduce(getAllChildrenReduceFn, new Map());
}
