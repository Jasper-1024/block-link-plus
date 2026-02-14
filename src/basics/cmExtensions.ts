import { editBlockExtensions } from "../shared/utils/codemirror/selectiveEditor";

import { Extension } from '@codemirror/state';

import BlockLinkPlus from "main";

export const cmExtensions = (plugin: BlockLinkPlus) => {
  const extensions : Extension[] = [...editBlockExtensions()];

  return extensions;
};
