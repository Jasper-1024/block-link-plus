import {
	Editor,
	HeadingCache,
	CachedMetadata,
} from "obsidian";
import { HeadingAnalysisResult } from '../../types';
import { processLineContent, processMultiLineContent } from '../../utils';

const MAX_ALIAS_LENGTH = 100;

export function analyzeHeadings(
	fileCache: CachedMetadata,
	editor: Editor,
	start_line: number,
	end_line: number
): HeadingAnalysisResult {
	if (start_line === 0 && end_line === 0) {
		console.log("block-link-plus: analyzeHeadings: start_line === 0 && end_line === 0");
		return {
			isValid: false,
			start_line,
			end_line,
			isMultiline: false,
			block: null,
			nearestBeforeStartLevel: 0,
			minLevelInRange: Infinity,
			hasHeadingAtStart: false,
			hasHeadingAtEnd: false,
			headingAtStart: null,
			headingAtEnd: null,
			isStartHeadingMinLevel: false,
			isEndLineJustBeforeHeading: false,
			blockContent: null,
			nearestHeadingTitle: null,
			selectedText: null,
			blockText: null,
		};
	}

	if (!fileCache || end_line < start_line) {
		return {
			isValid: false,
			start_line,
			end_line,
			isMultiline: false,
			block: null,
			nearestBeforeStartLevel: 0,
			minLevelInRange: Infinity,
			hasHeadingAtStart: false,
			hasHeadingAtEnd: false,
			headingAtStart: null,
			headingAtEnd: null,
			isStartHeadingMinLevel: false,
			isEndLineJustBeforeHeading: false,
			blockContent: null,
			nearestHeadingTitle: null,
			selectedText: null,
			blockText: null,
		};
	}

	let closestBeforeStartDistance = Infinity; // record the closest heading distance at [0, start_line)
	let nearestHeadingTitle: string | null = null;
	let selectedText = editor.getSelection();
	let blockText = editor.getRange({ line: start_line, ch: 0 }, { line: end_line, ch: editor.getLine(end_line).length });

	// console.log("analyzeHeadings", fileCache, start_line, end_line); // debug
	// one line
	if (start_line == end_line) {
		let head_block: HeadingCache | undefined = fileCache.headings?.find(
			(heading) => {
				const { start, end } = heading.position;
				return start.line == start_line;
			}
		);

		let block = (fileCache.sections || []).find((section) => {
			return (
				section.position.start.line <= end_line &&
				section.position.end.line >= end_line
			);
		})!;

		const blockContent = block ? processLineContent(editor.getLine(start_line)) : null;

		// 添加与多行分析类似的逻辑来计算 nearestBeforeStartLevel
		let nearestBeforeStartLevel = 0;
		let closestBeforeStartDistance = Infinity;

		fileCache.headings?.forEach((heading) => {
			const { start, end } = heading.position;
			// 对于 start.line 在 (0, start_line) 开区间的处理
			if (start.line < start_line) {
				// 跳过以 ^ 或 ˅ 开头的标题
				if (heading.heading.startsWith('^') || heading.heading.startsWith('˅')) {
					return;
				}
				const distance = start_line - start.line;
				if (distance < closestBeforeStartDistance) {
					closestBeforeStartDistance = distance;
					nearestBeforeStartLevel = heading.level;
					nearestHeadingTitle = heading.heading;
				}
			}
		});

		return {
			isValid: true,
			start_line,
			end_line,
			isMultiline: false,
			block,
			nearestBeforeStartLevel,
			minLevelInRange: head_block ? head_block.level : Infinity,
			hasHeadingAtStart: !!block,
			hasHeadingAtEnd: false,
			headingAtStart: head_block || null,
			headingAtEnd: null,
			isStartHeadingMinLevel: block ? true : false,
			isEndLineJustBeforeHeading: false,
			blockContent,
			nearestHeadingTitle,
			selectedText,
			blockText
		};
	}

	let nearestBeforeStartLevel = 0;
	let minLevelInRange = Infinity;
	let hasHeadingAtStart = false;
	let hasHeadingAtEnd = false;

	let headingAtStart: HeadingCache | null = null;
	let headingAtEnd: HeadingCache | null = null;
	let isStartHeadingMinLevel = false;

	let isEndLineJustBeforeHeading = false;

	let inner_levels = new Array<number>();


	fileCache.headings?.forEach((heading) => {
		const { start, end } = heading.position;
		// 对于 start.line 在 (0, start_line) 开区间的处理
		if (start.line < start_line) {
			const distance = start_line - start.line;
			if (start_line - start.line < closestBeforeStartDistance) {
				closestBeforeStartDistance = distance;
				nearestBeforeStartLevel = heading.level;
				// 跳过以 ^ 或 ˅ 开头的标题 | 这里存疑,有可能存在 多行 block 套 block ;
				if (heading.heading.startsWith('^') || heading.heading.startsWith('˅')) {
					return;
				}
				nearestHeadingTitle = heading.heading;  // 记录最近的标题内容
			}
		}
		// 对于 start.line 在 [start_line, end_line] 全闭区间的处理
		if (start.line >= start_line && end.line <= end_line) {
			minLevelInRange = Math.min(minLevelInRange, heading.level);
			inner_levels.push(heading.level);
		}
		// 检查是否有 heading 的 start.line 正好是 start_line 或 end_line
		if (start.line === start_line) {
			hasHeadingAtStart = true;
			headingAtStart = heading;
		}
		if (start.line === end_line) {
			hasHeadingAtEnd = true;
			headingAtEnd = heading;
		}
		// 检查 end_line 是否恰好在一个 heading 的上一行
		if (start.line === end_line + 1 || start.line === end_line + 2) {
			isEndLineJustBeforeHeading = true;
		}
	});

	// 检查在 hasHeadingAtStart 为 true 时，其 level 是否是范围内最小的，并且这个值的 heading 是否唯一
	if (hasHeadingAtStart && headingAtStart != null) {
		// @ts-ignore | ts 类型识别错误了
		if (headingAtStart.level === minLevelInRange) {
			const minLevel = Math.min(...inner_levels);
			const countOfMinLevel = inner_levels.filter(
				(level) => level === minLevel
			).length;
			// headingAtStart.level is the min level in the range
			// and it is the only heading in the range
			if (
				headingAtStart &&
				// @ts-ignore
				headingAtStart.level === minLevel &&
				countOfMinLevel === 1
			) {
				isStartHeadingMinLevel = true;
			}
		}
	}
	let block = (fileCache.sections || []).find((section) => {
		return (
			section.position.start.line <= end_line &&
			section.position.end.line >= end_line
		);
	})!;

	const blockContent = block ?
		processMultiLineContent(editor, start_line, end_line, MAX_ALIAS_LENGTH) :
		null;

	return {
		isValid: true,
		start_line,
		end_line,
		isMultiline: true,
		block: block,
		nearestBeforeStartLevel,
		minLevelInRange,
		hasHeadingAtStart,
		hasHeadingAtEnd,
		headingAtStart,
		headingAtEnd,
		isStartHeadingMinLevel,
		isEndLineJustBeforeHeading,
		blockContent,
		nearestHeadingTitle,
		selectedText,
		blockText
	};
} 