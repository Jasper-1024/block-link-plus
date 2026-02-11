import {
  Annotation,
  EditorState,
  Facet,
  RangeSetBuilder,
  StateEffect,
  StateField,
  Transaction
} from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { getAvailableRanges } from "range-analyzer";

type ContentRangeType  = [number | undefined, number | undefined];


const combinedRangeFacets = (
  rangeA: ContentRangeType | undefined,
  rangeB: ContentRangeType | undefined
): ContentRangeType => {
  const aStart = rangeA?.[0];
  const aEnd = rangeA?.[1];
  const bStart = rangeB?.[0];
  const bEnd = rangeB?.[1];

  const start =
    aStart === undefined ? bStart : bStart === undefined ? aStart : Math.max(aStart, bStart);
  const end =
    aEnd === undefined ? bEnd : bEnd === undefined ? aEnd : Math.min(aEnd, bEnd);

  if (start !== undefined && end !== undefined && start > end) {
    return [undefined, undefined];
  }

  return [start, end];
};

const isCompleteLineRange = (
  range: ContentRangeType
): range is [number, number] =>
  typeof range[0] === "number" && typeof range[1] === "number";

export const editableRange =
  Annotation.define<ContentRangeType>();
  export const contentRange =
  Annotation.define<ContentRangeType>();

// Effects-based API (more robust than transaction annotations in some Obsidian editor stacks).
export const setEditableRange = StateEffect.define<ContentRangeType>();
export const setContentRange = StateEffect.define<ContentRangeType>();

// Config-based API: set initial ranges via facets (usable with `StateEffect.appendConfig`).
// This avoids relying on transaction annotations/effects that may be dropped by other CM6 filters.
export const initialEditableRangeFacet = Facet.define<ContentRangeType, ContentRangeType>({
  combine: (values) => (values.length > 0 ? values[values.length - 1] : [undefined, undefined]),
});
export const initialContentRangeFacet = Facet.define<ContentRangeType, ContentRangeType>({
  combine: (values) => (values.length > 0 ? values[values.length - 1] : [undefined, undefined]),
});
export const hiddenLine = Decoration.replace({ inclusive: true, block: true });

// Outliner v2 system tail line marker (Dataview inline field).
const OUTLINER_SYS_MARKER_RE = /\[blp_sys::\s*1\]/;

//partial note editor

export const hideLine = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    const builder = new RangeSetBuilder<Decoration>();

    const editableLines = tr.state.field(selectiveLinesFacet, false);
    const contentLines = tr.state.field(frontmatterFacet, false);
    const visibleLines = contentLines?.[0] ? contentLines : editableLines;

    if (visibleLines?.[0] != null && visibleLines?.[1] != null) {
      const startLine = Math.min(tr.state.doc.lines, visibleLines[0]);
      const endLine = Math.min(tr.state.doc.lines, visibleLines[1]);
      if (startLine > 1) {
        const hideBeforeTo = tr.state.doc.line(startLine).from - 1;
        if (hideBeforeTo >= tr.state.doc.line(1).from) {
          builder.add(tr.state.doc.line(1).from, hideBeforeTo, hiddenLine);
        }
      }

      // Hide outliner system tail lines inside the visible range.
      // This keeps embeds/editable ranges free of internal maintenance lines.
      for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
        const line = tr.state.doc.line(lineNumber);
        if (!OUTLINER_SYS_MARKER_RE.test(line.text)) continue;

        // Hide the whole line; include the newline when it's not the last visible line,
        // so we don't leave blank spacing behind.
        const to = lineNumber === endLine
          ? line.to
          : tr.state.doc.line(Math.min(tr.state.doc.lines, lineNumber + 1)).from;
        builder.add(line.from, to, hiddenLine);
      }

      // Add the tail hider after system-line ranges so RangeSetBuilder sees sorted `from` values.
      if (endLine < tr.state.doc.lines) {
        builder.add(
          tr.state.doc.line(endLine).to,
          tr.state.doc.line(tr.state.doc.lines).to,
          hiddenLine
        );
      }
    }
    const dec = builder.finish();
    return dec;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const frontmatterFacet = StateField.define<
  [number | undefined, number | undefined]
>({
  create: () => [undefined, undefined],
  update(value, tr) {
    let next: ContentRangeType | undefined = undefined;
    for (const effect of tr.effects) {
      if (effect.is(setContentRange)) next = effect.value;
    }
    if (next === undefined) {
      next = tr.annotation(contentRange);
    }
    if (next === undefined) {
      const facetNext = tr.state.facet(initialContentRangeFacet);
      if (facetNext?.[0] !== undefined || facetNext?.[1] !== undefined) {
        next = facetNext;
      }
    }

    if (next !== undefined) {
      const [startLine, endLine] = next;
      if (startLine !== undefined) {
        const clampedEnd =
          endLine === undefined ? endLine : Math.min(tr.state.doc.lines, endLine);
        return [startLine, clampedEnd];
      }
      return next;
    }
    return value;
  },
});

export const selectiveLinesFacet = StateField.define<
  [number | undefined, number | undefined]
>({
  create: () => [undefined, undefined],
  update(value, tr) {
    let next: ContentRangeType | undefined = undefined;
    for (const effect of tr.effects) {
      if (effect.is(setEditableRange)) next = effect.value;
    }
    if (next === undefined) {
      next = tr.annotation(editableRange);
    }
    if (next === undefined) {
      const facetNext = tr.state.facet(initialEditableRangeFacet);
      if (facetNext?.[0] !== undefined || facetNext?.[1] !== undefined) {
        next = facetNext;
      }
    }

    if (next !== undefined) {
      const [startLine, endLine] = next;
      if (startLine !== undefined) {
        const clampedEnd =
          endLine === undefined ? endLine : Math.min(tr.state.doc.lines, endLine);
        return [startLine, clampedEnd];
      }
      return next;
    }
    return value;
  },
});

export const lineRangeToPosRange = (
  state: EditorState,
  range: [number, number]
) => {
  return {
    from: state.doc.line(range[0]).from,
    to: state.doc.line(Math.min(state.doc.lines, range[1])).to,
  };
};


export const smartDelete = EditorState.transactionFilter.of(
  (tr: Transaction) => {

    const userEvent = tr.annotation(Transaction.userEvent) ?? "delete";
    if (tr.isUserEvent("delete") && !userEvent.endsWith(".smart")) {
      const initialSelections = tr.startState.selection.ranges.map((range) => ({
        from: range.from,
        to: range.to,
      }));
      
      const betterFacet = combinedRangeFacets(
        tr.startState.field(selectiveLinesFacet, false),
        tr.startState.field(frontmatterFacet, false)
      );
      if (initialSelections.length > 0 && isCompleteLineRange(betterFacet)) {
        const posRange = lineRangeToPosRange(
          tr.startState,
          betterFacet
        );
        if (tr.changes.touchesRange(0, posRange.from-1)) {
          const minFrom = Math.max(posRange.from, initialSelections[0].from);
          const minTo = Math.min(posRange.to, initialSelections[0].to);
          return [{
            changes: {
              from: Math.min(minFrom, minTo),
              to: Math.max(minFrom, minTo),
            },
            annotations: Transaction.userEvent.of(
              `${userEvent}.smart`
            ),
          }];
        }
        
      }
    }
    return tr;
  }
);

export const preventModifyTargetRanges = EditorState.transactionFilter.of(
  (tr: Transaction) => {
    const newTrans = [];
    try {
      const editableLines =
        tr.startState.field(selectiveLinesFacet, false) ?? [undefined, undefined];
      const contentLines =
        tr.startState.field(frontmatterFacet, false) ?? [undefined, undefined];
      const selectiveLines = combinedRangeFacets(editableLines, contentLines);

      if (
        tr.isUserEvent("input") ||
        tr.isUserEvent("delete") ||
        tr.isUserEvent("move")
      ) {
        if (isCompleteLineRange(selectiveLines)) {
          const posRange = lineRangeToPosRange(
            tr.startState,
            selectiveLines
          );
          if (
            !tr.changes.touchesRange(posRange.from, posRange.to)
          ) {
            return [];
          }
        }
      }
      if (tr.state.doc.lines != tr.startState.doc.lines) {
        const numberNewLines = tr.state.doc.lines - tr.startState.doc.lines;
        if (isCompleteLineRange(selectiveLines)) {
          const posRange = lineRangeToPosRange(
            tr.startState,
            selectiveLines
          );
          if (tr.changes.touchesRange(0, posRange.from - 1)) {
            const newAnnotations = [];
            if (editableLines[0] !== undefined && editableLines[1] !== undefined) {
              newAnnotations.push(editableRange.of([
                editableLines[0] + numberNewLines,
                editableLines[1] + numberNewLines,
              ]))
               
            }
            if (contentLines[0] !== undefined && contentLines[1] !== undefined) {
              newAnnotations.push(contentRange.of([
                contentLines[0] + numberNewLines,
                contentLines[1] + numberNewLines,
              ]))
               
            }
            newTrans.push({
              annotations: newAnnotations,
            });
            
          } else if (tr.changes.touchesRange(posRange.from - 1, posRange.to)) {
            const newAnnotations = [];
            if (editableLines[0] !== undefined && editableLines[1] !== undefined) {
              newAnnotations.push(editableRange.of([
                editableLines[0],
                editableLines[1] + numberNewLines,
              ]))
               
            }
            if (contentLines[0] !== undefined && contentLines[1] !== undefined) {
              newAnnotations.push(contentRange.of([
                contentLines[0],
                contentLines[1] + numberNewLines,
              ]))
               
            }
            newTrans.push({
              annotations: newAnnotations,
            });
          }
        }
      }
    } catch (e) {
      return [];
    }
    return [tr, ...newTrans];
  }
);

export const smartPaste = (
  getReadOnlyRanges: (
    targetState: EditorState
  ) => Array<{ from: number | undefined; to: number | undefined }>
) =>
  EditorView.domEventHandlers({
    paste(event, view) {
      const clipboardData =
        event.clipboardData || (window as any).clipboardData;
      const pastedData = clipboardData.getData("Text");
      const initialSelections = view.state.selection.ranges.map((range) => ({
        from: range.from,
        to: range.to,
      }));

      if (initialSelections.length > 0) {
        const readOnlyRanges = getReadOnlyRanges(view.state);
        const result = getAvailableRanges(
          readOnlyRanges,
          initialSelections[0],
          { from: 0, to: view.state.doc.line(view.state.doc.lines).to }
        ) as Array<{ from: number; to: number }>;
        if (result.length > 0) {
          view.dispatch({
            changes: {
              from: result[0].from,
              to: result[0].to,
              insert: pastedData,
            },
            annotations: Transaction.userEvent.of(`input.paste.smart`),
          });
        }
      }
    },
  });

const readOnlyRangesExtension = [smartDelete, preventModifyTargetRanges];
export const editBlockExtensions = () => [
  readOnlyRangesExtension,
  hideLine,
  selectiveLinesFacet,
  frontmatterFacet
];
export default readOnlyRangesExtension;
