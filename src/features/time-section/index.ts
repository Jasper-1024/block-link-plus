import type { Editor, MarkdownView, MarkdownFileInfo, TFile } from 'obsidian';
import type { HeadingAnalysisResult } from '../../types';
import { formatCurrentTime, isDailyNote } from '../../utils';
import { analyzeHeadings } from '../heading-analysis'; // This will be a temporary import
import type BlockLinkPlus from '../../../main';

/**
 * Handle inserting time section
 * @param plugin BlockLinkPlus plugin instance
 * @param editor Editor instance
 * @param view Current view
 * @param headAnalysis Optional existing heading analysis result
 */
export function handleInsertTimeSection(
    plugin: BlockLinkPlus,
    editor: Editor,
    view: MarkdownView | MarkdownFileInfo,
    headAnalysis?: HeadingAnalysisResult
) {
    // Check if the feature is enabled
    if (!plugin.settings.enable_time_section) return;

    // Get current file
    const file: TFile | null = view.file;
    if (!file) return;

    // Get current formatted time
    const timeStr = formatCurrentTime(plugin.settings.time_section_format);

    // Get current cursor position
    const cursorLine = editor.getCursor().line;

    // Determine heading level
    let headingLevel = 1;
    let insertText = "";

    // Check if it is a daily note
    const isDaily = isDailyNote(file.basename, plugin.settings.daily_note_pattern);

    if (isDaily) {
        // Daily note uses fixed level
        headingLevel = plugin.settings.daily_note_heading_level;
    } else {
        // Use existing analysis if provided, otherwise analyze heading level at current position
        if (headAnalysis && headAnalysis.isValid) {
            // Use the heading level before the current position + 1
            // If there is no previous heading, use level 1
            headingLevel = Math.min(headAnalysis.nearestBeforeStartLevel + 1, 6);
            if (headingLevel === 0) headingLevel = 1;
        } else {
            // Analyze heading level at current position
            const fileCache = plugin.app.metadataCache.getFileCache(file);
            if (fileCache) {
                const newHeadAnalysis = analyzeHeadings(fileCache, editor, cursorLine, cursorLine);
                if (newHeadAnalysis.isValid) {
                    // Use the heading level before the current position + 1
                    // If there is no previous heading, use level 1
                    headingLevel = Math.min(newHeadAnalysis.nearestBeforeStartLevel + 1, 6);
                    if (headingLevel === 0) headingLevel = 1;
                }
            }
        }
    }

    // Prepare text to insert
    if (plugin.settings.insert_heading_level) {
        insertText = "#".repeat(headingLevel) + " " + timeStr + "\n";
    } else {
        insertText = timeStr + "\n";
    }

    // Insert text at current position
    editor.replaceRange(insertText, editor.getCursor());

    // Move cursor to the position after inserted text
    const newPosition = {
        line: cursorLine + 1,
        ch: 0
    };
    editor.setCursor(newPosition);
}

/**
 * Handle the insert time section command
 * @param plugin BlockLinkPlus plugin instance
 * @param isChecking Whether this is a checking call
 * @param editor Editor instance
 * @param view Current view
 * @returns Whether the command can be executed
 */
export function handleTimeCommand(
    plugin: BlockLinkPlus,
    isChecking: boolean,
    editor: Editor,
    view: MarkdownView | MarkdownFileInfo
): boolean {
    if (isChecking) {
        return plugin.settings.enable_time_section;
    }

    // Similar to handleCommand but for time section
    const file: TFile | null = view.file;
    if (!file) return false;

    const start_line = editor.getCursor("from").line;
    const end_line = editor.getCursor("to").line;
    const fileCache = plugin.app.metadataCache.getFileCache(file);
    if (!fileCache) return false;

    let head_analysis = analyzeHeadings(fileCache, editor, start_line, end_line);
    if (!head_analysis.isValid) {
        // Even if analysis is invalid, we can still insert time section
        handleInsertTimeSection(plugin, editor, view);
    } else {
        handleInsertTimeSection(plugin, editor, view, head_analysis);
    }

    return true;
}
