import { App, Editor, MarkdownView, MarkdownFileInfo, Menu, TFile, CachedMetadata, Notice } from 'obsidian';
import { PluginSettings, HeadingAnalysisResult, MultLineHandle } from '../types';
import { get_is_heading } from '../utils';
import { analyzeHeadings } from '../features/heading-analysis';
import * as LinkCreation from '../features/link-creation';
import * as Clipboard from '../features/clipboard-handler';
import BlockLinkPlus from '../main';
import * as TimeSection from '../features/time-section';


function handleSingleLine(
    plugin: BlockLinkPlus,
    file: any,
    isHeading: boolean,
    isEmbed: boolean,
    head_analysis: HeadingAnalysisResult,
    editor: any,
    isUrl: boolean = false
) {
    let link: string | undefined;

    if (plugin.settings.heading_id_newline && head_analysis.block) {
        link = LinkCreation.gen_insert_blocklink_singleline(head_analysis.block, editor, plugin.settings);
    } else if (isHeading && head_analysis.headingAtStart) {
        link = head_analysis.headingAtStart.heading;
    } else if (!isHeading && head_analysis.block) {
        link = LinkCreation.gen_insert_blocklink_singleline(head_analysis.block, editor, plugin.settings);
    }

    if (link) {
        const alias = Clipboard.calculateAlias(plugin.settings, link, isHeading, isEmbed, isUrl, plugin.settings.alias_length, head_analysis);
        Clipboard.copyToClipboard(plugin.app, plugin.settings, file, link, isEmbed, alias, isUrl);
    }
}

function handleMultiLine(
    plugin: BlockLinkPlus,
    file: any,
    isHeading: boolean,
    isEmbed: boolean,
    head_analysis: HeadingAnalysisResult,
    editor: any,
    fileCache: any,
    isUrl: boolean = false
) {
    if (isHeading && head_analysis.headingAtStart) {
        Clipboard.copyToClipboard(plugin.app, plugin.settings, file, head_analysis.headingAtStart.heading, isEmbed, undefined, isUrl);
    } else {
        handleMultiLineBlock(plugin, file, isEmbed, head_analysis, editor, fileCache, isUrl);
    }
}

function _gen_insert_blocklink_multline_heading(
    plugin: BlockLinkPlus,
    fileCache: CachedMetadata,
    editor: any,
    head_analysis: HeadingAnalysisResult
): string {
    if (!head_analysis.block) return "";

    return LinkCreation.gen_insert_blocklink_multline_heading(
        head_analysis.block,
        editor,
        plugin.settings,
        head_analysis.nearestBeforeStartLevel + 1
    );
}

function _gen_insert_blocklink_multline_block(
    plugin: BlockLinkPlus,
    fileCache: CachedMetadata,
    editor: any,
    head_analysis: HeadingAnalysisResult
) {
    return LinkCreation.gen_insert_blocklink_multline_block(
        fileCache,
        editor,
        plugin.settings
    );
}

function handleMultiLineBlock(
    plugin: BlockLinkPlus,
    file: any,
    isEmbed: boolean,
    head_analysis: HeadingAnalysisResult,
    editor: any,
    fileCache: any,
    isUrl: boolean = false
) {
    if (plugin.settings.mult_line_handle == MultLineHandle.oneline) {
        if (head_analysis.block) {
            const link = LinkCreation.gen_insert_blocklink_singleline(
                head_analysis.block,
                editor,
                plugin.settings
            );
            const alias = Clipboard.calculateAlias(plugin.settings, link, false, isEmbed, isUrl, plugin.settings.alias_length, head_analysis);
            Clipboard.copyToClipboard(plugin.app, plugin.settings, file, link, isEmbed, alias, isUrl);
        }
        return;
    } else if (plugin.settings.mult_line_handle == MultLineHandle.multilineblock) {
        // Handle multiline block format ^xyz-xyz
        if (head_analysis.minLevelInRange != Infinity) {
            new Notice(
                `Selection cannot contain headings`,
                1500
            );
            return;
        }

        const result = LinkCreation.gen_insert_blocklink_multiline_block(
            fileCache,
            editor,
            plugin.settings
        );
        if (!result.ok) {
            new Notice(result.message, 1500);
            return;
        }

        const link = result.link;
        const alias = Clipboard.calculateAlias(plugin.settings, link, false, isEmbed, isUrl, plugin.settings.alias_length, head_analysis);
        Clipboard.copyToClipboard(plugin.app, plugin.settings, file, link, isEmbed, alias, isUrl);
        return;
    } else {
        if (head_analysis.minLevelInRange != Infinity) {
            new Notice(
                `Selection cannot contain headings`,
                1500
            );
            return;
        }
        const linkMethod =
            plugin.settings.mult_line_handle == MultLineHandle.heading
                ? _gen_insert_blocklink_multline_heading
                : _gen_insert_blocklink_multline_block;
        const link = linkMethod.call(
            plugin,
            fileCache,
            editor,
            head_analysis
        );
        const alias = Clipboard.calculateAlias(plugin.settings, link, false, isEmbed, isUrl, plugin.settings.alias_length, head_analysis);
        Clipboard.copyToClipboard(plugin.app, plugin.settings, file, link, isEmbed, alias, isUrl);
        return;
    }
}


function handleMenuItemClick(
    plugin: BlockLinkPlus,
    view: any,
    isHeading: boolean,
    isEmbed: boolean,
    head_analysis: HeadingAnalysisResult,
    isUrl: boolean = false
) {
    if (!view.file || !head_analysis.isValid) return;

    const { file, editor } = view;
    const fileCache = plugin.app.metadataCache.getFileCache(file);
    if (!fileCache) return;

    if (!head_analysis.isMultiline) {
        handleSingleLine(plugin, file, isHeading, isEmbed, head_analysis, editor, isUrl);
    } else {
        handleMultiLine(plugin, file, isHeading, isEmbed, head_analysis, editor, fileCache, isUrl);
    }
}


export function handleEditorMenu(
    plugin: BlockLinkPlus,
    menu: Menu,
    editor: Editor,
    view: MarkdownView | MarkdownFileInfo
) {
    const file: TFile | null = view.file;
    if (!file) return;

    const start_line = editor.getCursor("from").line;
    const end_line = editor.getCursor("to").line;
    const fileCache = plugin.app.metadataCache.getFileCache(file);
    if (!fileCache) return;

    let head_analysis = analyzeHeadings(fileCache, editor, start_line, end_line);

    if (!head_analysis.isValid) return;

    let isHeading = get_is_heading(head_analysis);

    const addItemToMenu = (title: string, isEmbed: boolean, isUrl: boolean = false) => {
        menu.addItem((item: any) => {
            item.setTitle(title)
                .setIcon("links-coming-in")
                .onClick(() =>
                    handleMenuItemClick(
                        plugin,
                        view,
                        isHeading,
                        isEmbed,
                        head_analysis,
                        isUrl
                    )
                );
        });
    };

    if (plugin.settings.enable_right_click_block) {
        addItemToMenu(
            isHeading ? "Copy Heading as Link" : "Copy Block as Link",
            false
        );
    }

    if (plugin.settings.enable_right_click_embed) {
        addItemToMenu(
            isHeading ? "Copy Heading as Embed" : "Copy Block as Embed",
            true
        );
    }

    if (plugin.settings.enable_right_click_url) {
        addItemToMenu(
            isHeading ? "Copy Heading as Obsidian URI" : "Copy Block as Obsidian URI",
            false,
            true
        );
    }

    if (plugin.settings.enable_time_section && plugin.settings.enable_time_section_in_menu) {
        menu.addItem((item) => {
            item.setTitle("Insert Time Section")
                .setIcon("clock")
                .onClick(() => {
                    TimeSection.handleInsertTimeSection(plugin, editor, view, head_analysis);
                });
        });
    }
} 
