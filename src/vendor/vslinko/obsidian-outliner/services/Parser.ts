// @ts-nocheck
import { Logger } from "./Logger";
import { Settings } from "./Settings";

import { List, Root } from "../root";
import { checkboxRe } from "../utils/checkboxRe";

const bulletSignRe = `(?:[-*+]|\\d+\\.)`;
const optionalCheckboxRe = `(?:${checkboxRe})?`;

// Markdown allows up to 3 leading spaces before the list marker. Treat those as
// a "root" list item for start-boundary detection (vs. nested indentation).
const listItemWithoutSpacesRe = new RegExp(`^ {0,3}${bulletSignRe}( |\t)`);
const listItemRe = new RegExp(`^[ \t]*${bulletSignRe}( |\t)`);
const stringWithSpacesRe = new RegExp(`^[ \t]+`);
const parseListItemRe = new RegExp(
  `^([ \t]*)(${bulletSignRe})( |\t)(${optionalCheckboxRe})(.*)$`,
);

export interface ReaderPosition {
  line: number;
  ch: number;
}

export interface ReaderSelection {
  anchor: ReaderPosition;
  head: ReaderPosition;
}

export interface Reader {
  getCursor(): ReaderPosition;
  getLine(n: number): string;
  lastLine(): number;
  listSelections(): ReaderSelection[];
  getAllFoldedLines(): number[];
}

interface ParseListList {
  getFirstLineIndent(): string;
  setNotesIndent(notesIndent: string): void;
  getNotesIndent(): string | null;
  addLine(text: string): void;
  getParent(): ParseListList | null;
  addAfterAll(list: ParseListList): void;
}

export class Parser {
  constructor(
    private logger: Logger,
    private settings: Settings,
  ) {}

  // Markdown indentation rules treat tabs as wider than a single character for nesting.
  // Upstream obsidian-outliner is strict about mixed indent chars; BLP notes often contain
  // legacy/system lines indented with tabs, so we compare indentation by a conservative
  // "column width" (tabs expanded) instead of raw string equality.
  private tabWidth = 4;

  private indentCols(indent: string): number {
    let cols = 0;
    for (const ch of indent) {
      cols += ch === "\t" ? this.tabWidth : 1;
    }
    return cols;
  }

  private normalizeIndent(indent: string): string {
    return indent.replace(/\t/g, " ".repeat(this.tabWidth));
  }

  parseRange(editor: Reader, fromLine = 0, toLine = editor.lastLine()): Root[] {
    const lists: Root[] = [];

    for (let i = fromLine; i <= toLine; i++) {
      const line = editor.getLine(i);

      if (i === fromLine || this.isListItem(line)) {
        const list = this.parseWithLimits(editor, i, fromLine, toLine);

        if (list) {
          lists.push(list);
          i = list.getContentEnd().line;
        }
      }
    }

    return lists;
  }

  parse(editor: Reader, cursor = editor.getCursor()): Root | null {
    return this.parseWithLimits(editor, cursor.line, 0, editor.lastLine());
  }

  private parseWithLimits(
    editor: Reader,
    parsingStartLine: number,
    limitFrom: number,
    limitTo: number,
  ): Root | null {
    const d = this.logger.bind("parseList");
    const error = (msg: string): null => {
      d(msg);
      return null;
    };

    const line = editor.getLine(parsingStartLine);

    let listLookingPos: number | null = null;

    if (this.isListItem(line)) {
      listLookingPos = parsingStartLine;
    } else if (this.isLineWithIndent(line)) {
      let listLookingPosSearch = parsingStartLine - 1;
      while (listLookingPosSearch >= 0) {
        const line = editor.getLine(listLookingPosSearch);
        if (this.isListItem(line)) {
          listLookingPos = listLookingPosSearch;
          break;
        } else if (this.isLineWithIndent(line)) {
          listLookingPosSearch--;
        } else {
          break;
        }
      }
    }

    if (listLookingPos === null) {
      return null;
    }

    let listStartLine: number | null = null;
    let listStartLineLookup = listLookingPos;
    while (listStartLineLookup >= 0) {
      const line = editor.getLine(listStartLineLookup);
      if (!this.isListItem(line) && !this.isLineWithIndent(line)) {
        break;
      }
      if (this.isListItemWithoutSpaces(line)) {
        listStartLine = listStartLineLookup;
        if (listStartLineLookup <= limitFrom) {
          break;
        }
      }
      listStartLineLookup--;
    }

    if (listStartLine === null) {
      return null;
    }

    let listEndLine = listLookingPos;
    let listEndLineLookup = listLookingPos;
    while (listEndLineLookup <= editor.lastLine()) {
      const line = editor.getLine(listEndLineLookup);
      if (!this.isListItem(line) && !this.isLineWithIndent(line)) {
        break;
      }
      if (!this.isEmptyLine(line)) {
        listEndLine = listEndLineLookup;
      }
      if (listEndLineLookup >= limitTo) {
        listEndLine = limitTo;
        break;
      }
      listEndLineLookup++;
    }

    if (listStartLine > parsingStartLine || listEndLine < parsingStartLine) {
      return null;
    }

    // if the last line contains only spaces and that's incorrect indent, then ignore the last line
    // https://github.com/vslinko/obsidian-outliner/issues/368
    if (listEndLine > listStartLine) {
      const lastLine = editor.getLine(listEndLine);
      if (lastLine.trim().length === 0) {
        const prevLine = editor.getLine(listEndLine - 1);
        const [, prevLineIndent] = /^(\s*)/.exec(prevLine);
        if (!lastLine.startsWith(prevLineIndent)) {
          listEndLine--;
        }
      }
    }

    const root = new Root(
      { line: listStartLine, ch: 0 },
      { line: listEndLine, ch: editor.getLine(listEndLine).length },
      editor.listSelections().map((r) => ({
        anchor: { line: r.anchor.line, ch: r.anchor.ch },
        head: { line: r.head.line, ch: r.head.ch },
      })),
    );

    let currentParent: ParseListList = root.getRootList();
    let currentList: ParseListList | null = null;
    let currentIndent = "";
    let currentIndentCols = 0;

    const foldedLines = editor.getAllFoldedLines();

    for (let l = listStartLine; l <= listEndLine; l++) {
      const line = editor.getLine(l);
      const matches = parseListItemRe.exec(line);

      if (matches) {
        const [, indent, bullet, spaceAfterBullet] = matches;
        const indentCols = this.indentCols(indent);
        const indentNorm = this.normalizeIndent(indent);
        const currentIndentNorm = this.normalizeIndent(currentIndent);
        let [, , , , optionalCheckbox, content] = matches;

        content = optionalCheckbox + content;
        if (this.settings.keepCursorWithinContent !== "bullet-and-checkbox") {
          optionalCheckbox = "";
        }

        const compareCols = Math.min(currentIndentCols, indentCols);
        const indentSlice = indentNorm.slice(0, compareCols);
        const currentIndentSlice = currentIndentNorm.slice(0, compareCols);

        if (indentSlice !== currentIndentSlice) {
          const expected = currentIndent
            .replace(/ /g, "S")
            .replace(/\t/g, "T");
          const got = indent.replace(/ /g, "S").replace(/\t/g, "T");

          return error(
            `Unable to parse list: expected indent "${expected}", got "${got}"`,
          );
        }

        // The first list item can legally start with up to 3 leading spaces in Markdown.
        // Treat its indent as the baseline for this root list (do not nest under a null currentList).
        if (!currentList) {
          currentIndent = indent;
          currentIndentCols = indentCols;
        } else if (indentCols > currentIndentCols) {
          currentParent = currentList;
          currentIndent = indent;
          currentIndentCols = indentCols;
        } else if (indentCols < currentIndentCols) {
          while (
            this.indentCols(currentParent.getFirstLineIndent()) >= indentCols &&
            currentParent.getParent()
          ) {
            currentParent = currentParent.getParent();
          }
          currentIndent = indent;
          currentIndentCols = indentCols;
        } else {
          currentIndent = indent;
          currentIndentCols = indentCols;
        }

        const foldRoot = foldedLines.includes(l);

        currentList = new List(
          root,
          indent,
          bullet,
          optionalCheckbox,
          spaceAfterBullet,
          content,
          foldRoot,
        );
        currentParent.addAfterAll(currentList);
      } else if (this.isLineWithIndent(line)) {
        if (!currentList) {
          return error(
            `Unable to parse list: expected list item, got empty line`,
          );
        }

        const indentToCheck = currentList.getNotesIndent() || currentIndent;
        const indentToCheckCols = this.indentCols(indentToCheck);
        const lineIndent = line.match(/^[ \t]*/)?.[0] ?? "";

        // Compare by indentation width (tabs expanded) instead of raw string prefix.
        if (this.indentCols(lineIndent) < indentToCheckCols) {
          const expected = indentToCheck.replace(/ /g, "S").replace(/\t/g, "T");
          const got = lineIndent.replace(/ /g, "S").replace(/\t/g, "T");

          return error(`Unable to parse list: expected indent "${expected}", got "${got}"`);
        }

        if (!currentList.getNotesIndent()) {
          const matches = line.match(/^[ \t]+/);

          if (!matches || this.indentCols(matches[0]) <= currentIndentCols) {
            if (/^\s+$/.test(line)) {
              continue;
            }

            return error(
              `Unable to parse list: expected some indent, got no indent`,
            );
          }

          currentList.setNotesIndent(matches[0]);
        }

        currentList.addLine(line.slice(currentList.getNotesIndent().length));
      } else {
        return error(
          `Unable to parse list: expected list item or note, got "${line}"`,
        );
      }
    }

    return root;
  }

  private isEmptyLine(line: string) {
    return line.length === 0;
  }

  private isLineWithIndent(line: string) {
    return stringWithSpacesRe.test(line);
  }

  private isListItem(line: string) {
    return listItemRe.test(line);
  }

  private isListItemWithoutSpaces(line: string) {
    return listItemWithoutSpacesRe.test(line);
  }
}
