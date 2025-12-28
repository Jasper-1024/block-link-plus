import { editBlockExtensions } from "../shared/utils/codemirror/selectiveEditor";

import { Extension } from '@codemirror/state';

import BlockLinkPlus from "main";
import { tooltips } from "./tooltip";

export const cmExtensions = (plugin: BlockLinkPlus) => {
  const extensions : Extension[] = [...editBlockExtensions()];

  extensions.push(
    tooltips({ parent: document.body })
  );

  return extensions;
};
