import i18n from "shared/i18n";
import { Command } from 'obsidian';

export const loadFlowCommands = (
    addCommand: (cmd: Command) => any,
    openFlow: () => void,
    closeFlow: () => void
) => {
  addCommand({
    id: "mk-open-flow",
    name: i18n.commandPalette.openFlow,
    callback: openFlow,
  });

  addCommand({
    id: "mk-close-flow",
    name: i18n.commandPalette.closeFlow,
    callback: closeFlow,
  });
};