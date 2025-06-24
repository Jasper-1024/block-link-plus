import { TFile, Notice, App } from 'obsidian';
import { HeadingAnalysisResult, PluginSettings, BlockLinkAliasType } from '../../types';
import { processLineContent } from '../../utils';

function _gene_obsidian_url(app: App, file: TFile, blockId: string): string {
    const vault = app.vault.getName();
    const filePath = encodeURIComponent(file.path);
    const encodedBlockId = encodeURIComponent(`#${blockId}`);

    return `obsidian://open?vault=${vault}&file=${filePath}${encodedBlockId}`;
}

export function copyToClipboard(
    app: App,
    settings: PluginSettings,
    file: TFile,
    links: string | string[],
    isEmbed: boolean,
    alias?: string | string[],
    isUrl: boolean = false
) {
    const linksArray = typeof links === "string" ? [links] : links;
    const aliasArray = typeof alias === "string" ? [alias] : alias;

    const content = linksArray
        .map((link, index) => {
            const addNewLine = index < linksArray.length - 1 ? "\n" : "";
            if (isUrl) {
                return `${_gene_obsidian_url(app, file, link)}${addNewLine}`;
            }
            return `${isEmbed ? "!" : ""}${app.fileManager.generateMarkdownLink(
                file,
                "",
                "#" + link,
                aliasArray?.[index] ?? ""
            )}${addNewLine}`;
        })
        .join("");

    navigator.clipboard.writeText(content);

    // Show notification based on settings
    if (isUrl && settings.enable_url_notification) {
        new Notice("Obsidian URI copied to clipboard");
    } else if (isEmbed && settings.enable_embed_notification) {
        new Notice("Block embed link copied to clipboard");
    } else if (!isEmbed && !isUrl && settings.enable_block_notification) {
        new Notice("Block link copied to clipboard");
    }
}

export function calculateAlias(
    settings: PluginSettings,
    links: string[] | string,
    isHeading: boolean,
    isEmbed: boolean,
    isUrl: boolean,
    alias_length: number,
    head_analysis: HeadingAnalysisResult,
): string[] | string | undefined {
    // 以下情况不需要 alias：
    // 1. 是 embed 链接
    // 2. 是 URL 链接
    // 3. settings 设置为 Default
    if (isEmbed || isUrl || Number(settings.alias_type) === BlockLinkAliasType.Default) {
        return undefined;
    }
    // heading 情况下 alias 只能是 heading
    if (isHeading && head_analysis.headingAtStart) {
        return head_analysis.headingAtStart.heading;
    }

    // 根据设置计算 alias
    switch (Number(settings.alias_type)) {
        case BlockLinkAliasType.FirstChars:
            // Return the first X chars of each line if links is an array
            return links instanceof Array
                ? head_analysis.blockText?.split("\n").filter((line: string) => line.length > 0).map((line: string) => processLineContent(line).slice(0, alias_length))
                : head_analysis.blockContent?.slice(0, alias_length);
        case BlockLinkAliasType.Heading:
            return head_analysis.nearestHeadingTitle != null ? head_analysis.nearestHeadingTitle.slice(0, alias_length) : undefined;
        case BlockLinkAliasType.SelectedText:
            const selectedText = head_analysis.selectedText?.trim();
            if (!selectedText) {
                return undefined;
            }
            return links instanceof Array
                ? selectedText.split("\n").filter((line: string) => line.length > 0).map((line: string) => processLineContent(line))
                : processLineContent(selectedText) || undefined;
        default:
            return undefined;
    }
} 