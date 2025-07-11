import type { Editor, ListItemCache, SectionCache, CachedMetadata } from 'obsidian';
import type { HeadingAnalysisResult } from '../types';

export function generateRandomId(prefix: string, length: number): string {
	if (length < 3 || length > 7) {
		throw new Error("Length must be between 3 and 7.");
	}
	const separator = prefix ? "-" : "";
	return `${prefix}${separator}${Math.random()
		.toString(36)
		.substring(2, 2 + length)}`;
}

export function shouldInsertAfter(block: ListItemCache | SectionCache) {
	if ((block as any).type) {
		return [
			"blockquote",
			"code",
			"table",
			"comment",
			"footnoteDefinition",
		].includes((block as SectionCache).type);
	}
}

export function formatCurrentTime(format: string): string {
	const now = new Date();
	const hours = now.getHours().toString().padStart(2, '0');
	const minutes = now.getMinutes().toString().padStart(2, '0');

	// 简单的格式替换
	return format
		.replace('HH', hours)
		.replace('mm', minutes);
}

export function isTimeSection(text: string, pattern: string = "\\d{1,2}:\\d{1,2}"): boolean {
	// Heading pattern: #+ {pattern}
	// This regex matches strings like "## 19:19" or "# 09:05" based on the provided pattern
	try {
		const regex = new RegExp(`^(#{1,6})\\s+(${pattern})$`);
		return regex.test(text);
	} catch (e) {
		console.error("Invalid regex pattern for time section:", e);
		return false;
	}
}

export function isDailyNote(fileName: string, pattern: string): boolean {
	try {
		const regex = new RegExp(pattern);
		const isMatch = regex.test(fileName);
		// console.log(`isDailyNote result: ${isMatch ? "MATCH" : "NO MATCH"}`);
		return isMatch;
	} catch (e) {
		console.error("Invalid regex pattern for daily note:", e);
		return false;
	}
}

export function processLineContent(line: string): string {
	// empty line
	if (!line.trim()) return '';

	// remove HTML tags
	line = line.replace(/<[^>]+>/g, '');

	// handle list mark
	line = line.replace(/^[\s]*[-*+]\s+/, '');
	line = line.replace(/^[\s]*\d+\.\s+/, '');

	// handle block quote
	line = line.replace(/^[\s]*>+\s*/, '');

	// handle block id at end of line
	line = line.replace(/\s*\^[a-zA-Z0-9-]+$/, '');

	// replace newlines with spaces
	line = line.replace(/\n/g, ' ');

	return line.trim();
}

export function processMultiLineContent(
	editor: Editor,
	start_line: number,
	end_line: number,
	alias_length: number
): string {
	// find first non empty line as real start line
	let currentLine = start_line;
	while (currentLine <= end_line) {
		const line = editor.getLine(currentLine);
		// 去掉行尾的 block id
		const lineWithoutBlockId = line.replace(/\s*\^[a-zA-Z0-9-]+$/, '');

		if (!lineWithoutBlockId.trim()) {
			currentLine++;
			continue;
		}
		// handle special format line
		if (lineWithoutBlockId.startsWith('|-') || lineWithoutBlockId.startsWith('```')) {
			// if table separator or code block start, jump to next line
			currentLine++;
			if (currentLine <= end_line) {
				const nextLine = editor.getLine(currentLine);
				// if code block language identifier, jump to next line
				if (nextLine.match(/^```\w+$/)) {
					currentLine++;
				}
			}
			continue;
		}

		// handle current line content
		const processedContent = processLineContent(lineWithoutBlockId);
		if (processedContent) {
			// if processed content is not empty, return processed content (limit length)
			return processedContent.slice(0, alias_length);
		}

		currentLine++;
	}

	// if all lines are empty, return empty string
	return '';
}

export function get_is_heading(head_analysis: HeadingAnalysisResult): boolean {
	// invalid input
	if (!head_analysis.isValid) {
		return false;
	}
	// console.log("head_analysis", head_analysis); // debug

	if (!head_analysis.isMultiline) {
		// single line
		if (
			head_analysis.hasHeadingAtStart &&
			head_analysis.headingAtStart != null
		)
			return true;
	} else {
		// multi line
		if (
			head_analysis.hasHeadingAtStart && // start_line is a heading
			head_analysis.isStartHeadingMinLevel // start_line's heading level is the min and only level in the range
		)
			return true;
	}
	return false;
} 