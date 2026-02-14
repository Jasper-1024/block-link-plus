import { EditorView } from "@codemirror/view";
import BlockLinkPlus from "main";
import { MarkdownView } from "obsidian";

export const getActiveCM = (plugin: BlockLinkPlus): EditorView | undefined => {
  let rcm: EditorView | undefined;
  plugin.app.workspace.iterateLeaves((leaf) => {
    const cm = (leaf.view as MarkdownView).editor?.cm;
    if (cm?.hasFocus) {
      rcm = cm;
      return true;
    }
  }, plugin.app.workspace["rootSplit"]!);
  return rcm;
};
