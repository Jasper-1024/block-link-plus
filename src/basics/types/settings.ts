export type DeleteFileOption = "trash" | "permanent" | "system-trash";
export type InlineContextLayout = "horizontal" | "vertical";

export interface MakeBasicsSettings {
  inlineEditEnabled: boolean;
  inlineEditFile: boolean;
  inlineEditHeading: boolean;
  inlineEditBlock: boolean;
}
