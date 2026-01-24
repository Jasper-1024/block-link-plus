import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	HeadingCache,
	ListItemCache,
	SectionCache,
	EditorPosition,
	MarkdownFileInfo,
	Menu,
	CachedMetadata,
} from "obsidian";

import {
	Decoration,
	MatchDecorator,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";
import { Extension, RangeSet } from "@codemirror/state";

export type HeadingAnalysisResult = {
	isValid: boolean; // 是否有效
	start_line: number; // 选中文本的开始行
	end_line: number; // 选中文本的结束行
	isMultiline: boolean; // 是否是多行选中
	block: SectionCache | null; // 暂时for single line
	nearestBeforeStartLevel: number; // 距离 start_line 最近的 heading 的 level
	minLevelInRange: number; // [start_line, end_line] 范围内的最小 heading level
	hasHeadingAtStart: boolean; // 是否有 heading 的 start.line 正好是 start_line
	hasHeadingAtEnd: boolean; // 是否有 heading 的 start.line 正好是 end_line
	headingAtStart: HeadingCache | null; // 在 start_line 处的 heading | 仅在 hasHeadingAtStart 为 true 时有效
	headingAtEnd: HeadingCache | null; // 在 end_line 处的 heading | 仅在 hasHeadingAtEnd 为 true 时有效
	isStartHeadingMinLevel: boolean; //	headingAtStart 是否是最小其唯一 level 的 heading | 仅在 hasHeadingAtStart 为 true 时有效
	isEndLineJustBeforeHeading: boolean; // end_line 是否正好是某个 heading 的 start.line - 1
	blockContent: string | null;        // 处理后的块内容
	nearestHeadingTitle: string | null; // 最近的标题内容
	selectedText: string | null; // 选中的文本
	blockText: string | null; // 选中的块内容
};

export const enum MultLineHandle {
	oneline, // as one line handle
	heading, // add new heading, if select text contain not heading
	multblock, // add new block, if select text contain not block
	multilineblock, // add multiline block with ^xyz-xyz format
}

export const enum BlockLinkAliasType {
	Default, // no alias
	FirstChars, // first x characters of block content
	Heading, // alias as heading
	SelectedText // alias as selected text
}

export type KeysOfType<Obj, Type> = {
	[k in keyof Obj]: Obj[k] extends Type ? k : never;
}[keyof Obj];

export type BlockLinkPlusViewPlugin = ViewPlugin<{
	decorations: RangeSet<Decoration>;
	update(u: ViewUpdate): void;
}>;

export type BuiltInObsidianOutlinerSettings = {
	styleLists: boolean;
	debug: boolean;
	stickCursor: "never" | "bullet-only" | "bullet-and-checkbox" | boolean;
	betterEnter: boolean;
	betterVimO: boolean;
	betterTab: boolean;
	selectAll: boolean;
	listLines: boolean;
	listLineAction: "none" | "zoom-in" | "toggle-folding";
	dnd: boolean;
	previousRelease: string | null;
};

export type BuiltInObsidianZoomSettings = {
	debug: boolean;
	zoomOnClick: boolean;
	zoomOnClickMobile: boolean;
};

export interface PluginSettings {
	mult_line_handle: MultLineHandle;
	alias_type: BlockLinkAliasType;
	enable_right_click_block: boolean;
	enable_right_click_embed: boolean;
	enable_right_click_url: boolean;
	alias_length: number;
	enable_prefix: boolean;
	id_prefix: string;
	id_length: number;
	heading_id_newline: boolean;
	enable_block_notification: boolean;
	enable_embed_notification: boolean;
	enable_url_notification: boolean;
	// Enhanced List Blocks
	enhancedListEnabledFolders: string[];
	enhancedListEnabledFiles: string[];
	enhancedListHideSystemLine: boolean;

	// blp-view (Query/View) guardrails
	blpViewAllowMaterialize: boolean;
	blpViewMaxSourceFiles: number; // 0 = unlimited
	blpViewMaxResults: number; // 0 = unlimited
	blpViewShowDiagnostics: boolean;

	// Built-in vslinko plugins (vendored)
	builtInObsidianOutlinerEnabled: boolean;
	builtInObsidianOutlinerSettings: BuiltInObsidianOutlinerSettings;
	builtInObsidianZoomEnabled: boolean;
	builtInObsidianZoomSettings: BuiltInObsidianZoomSettings;

	// Inline Edit
	inlineEditEnabled: boolean;
	inlineEditFile: boolean;
	inlineEditHeading: boolean;
	inlineEditBlock: boolean;

	// Internal: used to show "What's New" once after upgrade.
	lastSeenVersion: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	mult_line_handle: MultLineHandle.oneline, // Default: treat multi-line selection as single block
	alias_type: BlockLinkAliasType.Default, // Default: no alias text for block links
	enable_right_click_block: true,
	enable_right_click_embed: true,
	enable_right_click_url: false,
	alias_length: 20,
	enable_prefix: false, // Default: no prefix for block IDs
	id_prefix: "", // Custom prefix for block IDs (empty by default)
	id_length: 4, // Default block ID length in characters
	heading_id_newline: false,
	enable_block_notification: true,
	enable_embed_notification: true,
	enable_url_notification: true,
	// Enhanced List Blocks
	enhancedListEnabledFolders: [],
	enhancedListEnabledFiles: [],
	enhancedListHideSystemLine: true,

	// blp-view (Query/View) guardrails
	blpViewAllowMaterialize: true,
	blpViewMaxSourceFiles: 0,
	blpViewMaxResults: 0,
	blpViewShowDiagnostics: false,

	// Built-in vslinko plugins (vendored)
	builtInObsidianOutlinerEnabled: false,
	builtInObsidianOutlinerSettings: {
		styleLists: true,
		debug: false,
		stickCursor: "bullet-and-checkbox",
		betterEnter: true,
		betterVimO: true,
		betterTab: true,
		selectAll: true,
		listLines: false,
		listLineAction: "toggle-folding",
		dnd: true,
		previousRelease: null,
	},
	builtInObsidianZoomEnabled: false,
	builtInObsidianZoomSettings: {
		debug: false,
		zoomOnClick: true,
		zoomOnClickMobile: false,
	},
	
	// Inline edit (default: enabled, but file-embed editing off)
	inlineEditEnabled: true,
	inlineEditFile: false,
	inlineEditHeading: true,
	inlineEditBlock: true,

	// Internal
	lastSeenVersion: "",
};
