import { editBlockExtensions } from "../shared/utils/codemirror/selectiveEditor";
import {
  flowEditorInfo,
  preloadFlowEditor
} from "./codemirror/flowEditor";
import { flowIDStateField, flowTypeStateField } from "./codemirror/flowStateFields";
import { flowViewUpdates } from "./codemirror/flowViewUpdates";
import { placeholderExtension } from "./codemirror/placeholder";

import { Extension } from '@codemirror/state';

import BlockLinkPlus from "main";
import { tooltips } from "./tooltip";

export const cmExtensions = (plugin: BlockLinkPlus) => {
  const extensions : Extension[] = [...editBlockExtensions()];

  extensions.push(
    tooltips({ parent: document.body })
  );
  
  if (plugin.settings.editorFlow) {
    extensions.push(
      flowTypeStateField,
      
      preloadFlowEditor,
    );
    
    extensions.push(
      
      flowEditorInfo,
      flowIDStateField,
      flowViewUpdates(plugin)
    );
  }
  
  return extensions;
};
