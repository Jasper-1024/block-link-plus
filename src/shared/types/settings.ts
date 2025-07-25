import { MakeBasicsSettings } from "basics/types/settings";

export type DeleteFileOption = "trash" | "permanent" | "system-trash";
export type InlineContextLayout = "horizontal" | "vertical";

export interface MakeMDSettings {
  defaultInitialization: boolean;
  filePreviewOnHover: boolean;
  blinkEnabled: boolean;
  spacesEnabled: boolean;
  navigatorEnabled: boolean;
  spacesDisablePatch: boolean;
  spacesPerformance: boolean;
  spaceRowHeight: number;
  spacesStickers: boolean;
  banners: boolean;
  bannerHeight: number;
  spaceViewEnabled: boolean;
  sidebarTabs: boolean;
  showRibbon: boolean;
  deleteFileOption: DeleteFileOption;
  autoOpenFileContext: boolean;
  expandFolderOnClick: boolean;
  expandedSpaces: string[];
  contextEnabled: boolean;
  saveAllContextToFrontmatter: boolean;
  activeView: string;
  currentWaypoint: number;
  activeSpace: string;
  hideFrontmatter: boolean;
  spacesFolder: string;
  spacesMDBInHidden: boolean;
  autoAddContextsToSubtags: boolean;
  folderNoteInsideFolder: boolean;
  folderNoteName: string;
  enableFolderNote: boolean;
  folderIndentationLines: boolean;
  revealActiveFile: boolean;
  hiddenFiles: string[];
  skipFolders: string[];
  skipFolderNames: string[];
  hiddenExtensions: string[];
  newFileLocation: string;
  newFileFolderPath: string;
  inlineContext: boolean;
  inlineContextProperties: boolean;
  imageThumbnails: boolean;
  inlineBacklinks: boolean;
  defaultDateFormat: string;
  defaultTimeFormat: string;
  inlineBacklinksExpanded: boolean;
  inlineContextExpanded: boolean;
  inlineContextSectionsExpanded: boolean;
  inlineContextNameLayout: InlineContextLayout;
  spacesUseAlias: boolean,
  spaceSubFolder: string,
  suppressedWarnings: string[],
  fmKeyAlias: string;
  fmKeyBanner: string;
  fmKeyBannerOffset: string;
  fmKeyColor: string;
  fmKeySticker: string;
  openSpacesOnLaunch: boolean;
  spacesRightSplit: boolean;
  indexSVG: boolean;
  readableLineWidth: boolean;
  syncFormulaToFrontmatter: boolean;
  releaseNotesPrompt: number;
  firstLaunch: boolean;
  enableDefaultSpaces: boolean;
  showSpacePinIcon: boolean;
  experimental: boolean;
  systemName: string;
  defaultSpaceTemplate: string;
  selectedKit: string;
  actionMaxSteps: number;
  contextPagination: number;
  searchWorker: boolean;
  newNotePlaceholder: string;
  cacheIndex: boolean;
  enhancedLogs: boolean;
  basics: boolean;
  basicsSettings: MakeBasicsSettings;
  
}
