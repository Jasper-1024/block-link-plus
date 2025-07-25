import { RangeSetBuilder, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import BlockLinkPlus from "main";
import i18n from "shared/i18n";
const placeholderLine = (plugin: BlockLinkPlus) => Decoration.line({
  attributes: { "data-ph": i18n.labels.placeholder.replace('${1}', "/") },
  class: "mk-placeholder",
});

export const placeholderExtension = (plugin: BlockLinkPlus) => StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    const builder = new RangeSetBuilder<Decoration>();
    const currentLine = tr.state.doc.lineAt(tr.state.selection.main.head);

    if (currentLine?.length == 0)
      builder.add(currentLine.from, currentLine.from, placeholderLine(plugin));
    const dec = builder.finish();
    return dec;
  },
  provide: (f) => EditorView.decorations.from(f),
});
