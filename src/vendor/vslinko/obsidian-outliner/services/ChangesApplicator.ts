// @ts-nocheck
import { MyEditor } from "../editor";
import { List, Position, Root, isRangesIntersects } from "../root";

export class ChangesApplicator {
  apply(editor: MyEditor, prevRoot: Root, newRoot: Root) {
    const changes = this.calculateChanges(editor, prevRoot, newRoot);
    if (changes) {
      const { replacement, changeFrom, changeTo } = changes;

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

      editor.replaceRange(safeReplacement, changeFrom, safeChangeTo);

      for (const line of fold) {
        editor.fold(line);
      }
    }

    editor.setSelections(newRoot.getSelections());
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
