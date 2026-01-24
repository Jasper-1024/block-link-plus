// @ts-nocheck
import { Editor } from "obsidian";

import { MyEditor } from "../editor";
import { isBuiltInOutlinerEnabled } from "../integration/enabled";

export function createEditorCallback(cb: (editor: MyEditor) => boolean) {
  return (editor: Editor) => {
    const myEditor = new MyEditor(editor);
    if (!isBuiltInOutlinerEnabled()) {
      if (window.event && window.event.type === "keydown") {
        myEditor.triggerOnKeyDown(window.event as KeyboardEvent);
      }
      return;
    }
    const shouldStopPropagation = cb(myEditor);

    if (
      !shouldStopPropagation &&
      window.event &&
      window.event.type === "keydown"
    ) {
      myEditor.triggerOnKeyDown(window.event as KeyboardEvent);
    }
  };
}
