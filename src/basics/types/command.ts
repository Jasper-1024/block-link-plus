import BlockLinkPlus from "main";

import { Editor, TFile } from "obsidian";

export enum CommandType {
  None,
  Command,
  Section
}

export type Command = {
  label: string;
  value: string;
  offset?: [number, number];
  icon: string;
  type?: CommandType,
  onSelect?: (
    _evt: any,
    plugin: BlockLinkPlus,
    file: TFile,
    editor: Editor,
    start: { line: number; ch: number },
    startCh: number,
    end: { line: number; ch: number },
    onComplete: () => void
  ) => void
}
