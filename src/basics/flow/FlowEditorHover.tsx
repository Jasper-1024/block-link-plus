import { EditorView } from "@codemirror/view";
import BlockLinkPlus from "main";
import { App } from "obsidian";
import React from "react";
import { uiIconSet } from "shared/assets/icons";
import i18n from "shared/i18n";

export const FlowEditorHover = (props: {
  path: string;
  pos: { from: number; to: number };
  plugin: BlockLinkPlus;
  source?: string;
  app: App;
  view: EditorView;
  toggle: boolean;
  toggleState: boolean;
  dom?: HTMLElement;
}) => {
  const toggleFlow = () => {
    console.log("FlowEditorHover clicked", { 
      toggleState: props.toggleState, 
      dom: props.dom,
      pos: props.pos 
    });
    
    if (!props.dom) {
      console.error("No DOM element provided to FlowEditorHover");
      return;
    }
    
    const domPos = props.view.posAtDOM(props.dom);
    console.log("DOM position:", domPos);
    
    const line = props.view.state.doc.lineAt(domPos);
    const pos = line.from;
    console.log("Line position:", pos, "Line content:", line.text);
    
    if (props.toggleState) {
      console.log("Removing ! at position:", pos);
      props.view.dispatch({
        changes: { from: pos, to: pos + 1 },
      });
    } else {
      console.log("Adding ! at position:", pos);
      props.view.dispatch({
        changes: {
          from: pos,
          to: pos,
          insert: "!",
        },
      });
    }
  };

  return (
    <div className="mk-flowblock-menu">
      {props.toggle && (
        <button
          aria-label={i18n.buttons.toggleFlow}
          onClick={toggleFlow}
          className={`mk-toolbar-button ${
            props.toggleState ? "mk-toggle-on" : ""
          }`}
          dangerouslySetInnerHTML={{
            __html: !props.toggleState
              ? uiIconSet["edit-3"]
              : uiIconSet["book-open"],
          }}
        ></button>
      )}
    </div>
  );
};
