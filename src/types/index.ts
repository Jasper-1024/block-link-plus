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

export interface PluginSettings {
	mult_line_handle: MultLineHandle;
	alias_type: BlockLinkAliasType;
	enable_right_click_block: boolean;
	enable_right_click_embed: boolean;
	enable_right_click_editable_embed: boolean;
	enable_right_click_url: boolean;
	alias_length: number;
	enable_prefix: boolean;
	id_prefix: string;
	id_length: number;
	heading_id_newline: boolean;
	enable_block_notification: boolean;
	enable_embed_notification: boolean;
	enable_editable_embed_notification: boolean;
	enable_url_notification: boolean;
	// Time Section
	enable_time_section: boolean;
	time_section_format: string;
	time_section_title_pattern: string;
	daily_note_pattern: string;
	insert_heading_level: boolean;
	daily_note_heading_level: number;
	enable_time_section_in_menu: boolean;
	time_section_plain_style: boolean; // Controls whether time sections should be displayed as plain text

	// Timeline Feature
	enableTimeline: boolean;
	timelineDefaultHeadingLevel: number;
	timelineDefaultEmbedFormat: '!![[]]' | '![[]]';
	timelineDefaultSortOrder: 'asc' | 'desc';

	// inline edit
	editorFlow: boolean;
	editorFlowStyle: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	mult_line_handle: MultLineHandle.oneline, // Default: treat multi-line selection as single block
	alias_type: BlockLinkAliasType.Default, // Default: no alias text for block links
	enable_right_click_block: true,
	enable_right_click_embed: true,
	enable_right_click_editable_embed: true,
	enable_right_click_url: false,
	alias_length: 20,
	enable_prefix: false, // Default: no prefix for block IDs
	id_prefix: "", // Custom prefix for block IDs (empty by default)
	id_length: 4, // Default block ID length in characters
	heading_id_newline: false,
	enable_block_notification: true,
	enable_embed_notification: true,
	enable_editable_embed_notification: true,
	enable_url_notification: true,
	// Time Section
	enable_time_section: true,
	time_section_format: "HH:mm",
	time_section_title_pattern: "\\d{1,2}:\\d{1,2}",
	daily_note_pattern: "\\d{4}-\\d{1,2}-\\d{1,2}",
	insert_heading_level: true,
	daily_note_heading_level: 2,
	enable_time_section_in_menu: false,
	time_section_plain_style: false, // Default: use standard heading style for time sections
	
	// Timeline Feature
	enableTimeline: true,
	timelineDefaultHeadingLevel: 4,
	timelineDefaultEmbedFormat: '!![[]]',
	timelineDefaultSortOrder: 'desc',
	
	// Inline editing settings
	editorFlow: true, // Enable embedded block editing
	editorFlowStyle: "minimal", // Default editing style
}; 