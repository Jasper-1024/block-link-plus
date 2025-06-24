import BlockLinkPlus from "main";
import i18n from "shared/i18n";

export const loadFlowCommands = (plugin: BlockLinkPlus) => {
  plugin.addCommand({
    id: "mk-open-flow",
    name: i18n.commandPalette.openFlow,
    callback: () => plugin.openFlow(),
  });

  plugin.addCommand({
    id: "mk-close-flow",
    name: i18n.commandPalette.closeFlow,
    callback: () => plugin.closeFlow(),
  });
};