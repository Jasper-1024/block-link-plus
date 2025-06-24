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
    const domPos = props.view.posAtDOM(props.dom);
    const line = props.view.state.doc.lineAt(domPos);
    const pos = line.from;
    if (props.toggleState) {
      props.view.dispatch({
        changes: { from: pos, to: pos + 1 },
      });
    } else {
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
