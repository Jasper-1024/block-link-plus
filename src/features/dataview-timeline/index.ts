import {
    MarkdownPostProcessorContext,
    TFile,
    App,
    HeadingCache,
} from "obsidian";
import type BlockLinkPlus from "../../main";
import * as yaml from "js-yaml";
import {
    findDynamicRegion,
    REGION_START_MARKER_PREFIX,
    REGION_END_MARKER,
} from "./region-parser";
import { executeTimelineQuery, extractTimeSections } from "./query-builder";
import { DataviewApi } from "obsidian-dataview";
import { resolveTags, resolveLinks } from "./filter-resolver";

/**
 * Type definition for the blp-timeline configuration block.
 */
export interface TimelineConfig {
    source_folders?: string[];
    within_days?: number;
    sort_order?: 'asc' | 'desc';
    heading_level?: number;
    embed_format?: '!![[]]' | '![[]]';
    time_pattern?: string;
    filters?: {
        relation: 'AND' | 'OR';
        links?: {
            relation: 'AND' | 'OR';
            items?: string[];
            link_to_current_file?: boolean;
        };
        tags?: {
            relation: 'AND' | 'OR';
            items?: string[];
            from_frontmatter?: {
                key: string;
                exclude?: string[];
            };
        };
    };
}

export interface TimelineContext {
    config: TimelineConfig;
    dataviewApi: DataviewApi;
    currentFile: TFile;
    app: App;
}

/**
 * A simple, non-secure hash function for checking content changes.
 * @param str The string to hash.
 * @returns A 32-bit integer hash.
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

/**
 * Generates a stable signature from the timeline sections.
 * This signature is used for hashing and is independent of rendering format.
 * @param sections The sections to generate a signature for.
 * @returns A stable string signature.
 */
function generateTimelineSignature(
    sections: { file: TFile; heading: HeadingCache }[]
): string {
    // Sort by file path, then by heading line number to ensure stability
    const sortedSections = [...sections].sort((a, b) => {
        if (a.file.path < b.file.path) return -1;
        if (a.file.path > b.file.path) return 1;
        return a.heading.position.start.line - b.heading.position.start.line;
    });

    return sortedSections
        .map((s) => `${s.file.path}#${s.heading.heading}`)
        .join(";");
}

function renderTimelineMarkdown(
    sections: { file: TFile; heading: HeadingCache }[],
    config: TimelineConfig
): string {
    if (sections.length === 0) {
        return "No items found for this timeline.";
    }

    // 1. Group sections by file path
    const groupedByFile: Record<
        string,
        { file: TFile; headings: HeadingCache[] }
    > = {};
    for (const section of sections) {
        if (!groupedByFile[section.file.path]) {
            groupedByFile[section.file.path] = {
                file: section.file,
                headings: [],
            };
        }
        groupedByFile[section.file.path].headings.push(section.heading);
    }

    // 2. Sort groups by file name (date)
    const sortedGroups = Object.values(groupedByFile).sort((a, b) => {
        if (config.sort_order === "asc") {
            return a.file.name.localeCompare(b.file.name);
        } else {
            return b.file.name.localeCompare(a.file.name);
        }
    });

    // 3. Build the markdown string
    let markdown = "";
    for (const group of sortedGroups) {
        // Sort headings within the group by line number
        const sortedHeadings = group.headings.sort(
            (a, b) => a.position.start.line - b.position.start.line
        );

        markdown += `[[${group.file.basename}]]\n`;
        for (const heading of sortedHeadings) {
            const embedLink =
                config.embed_format === "!![[]]"
                    ? `!![[${group.file.path}#${heading.heading}]]`
                    : `![[${group.file.path}#${heading.heading}]]`;
            markdown += `${embedLink}\n`;
        }
        markdown += "\n---\n\n";
    }

    return markdown.trim();
}

/**
 * Handles the processing of blp-timeline blocks.
 * @param plugin The main plugin instance.
 * @param source The source code of the block.
 * @param el The HTML element to render in.
 * @param ctx The context of the markdown rendering.
 */
export async function handleTimeline(
    plugin: BlockLinkPlus,
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
) {
    el.empty(); // Clear the default message
    try {
        const dataviewApi = plugin.app.plugins.plugins.dataview?.api;
        if (!dataviewApi) {
            el.createEl("pre", { text: "Error: Dataview plugin is not installed or enabled." });
            return;
        }

        const config = yaml.load(source) as TimelineConfig;

        // --- Set Defaults ---
        config.sort_order = config.sort_order ?? 'desc';
        config.heading_level = config.heading_level ?? 4;
        config.embed_format = config.embed_format ?? '!![[]]';

        // --- Validation ---
        if (!config) {
            el.createEl("pre", { text: "Error: YAML configuration is empty or invalid." });
            return;
        }
        if (config.filters) {
            if (!config.filters.relation || !['AND', 'OR'].includes(config.filters.relation)) {
                 el.createEl("pre", { text: "Error: filters.relation must be 'AND' or 'OR'." });
                 return;
            }
            if (config.filters.links && (!config.filters.links.relation || !['AND', 'OR'].includes(config.filters.links.relation))) {
                 el.createEl("pre", { text: "Error: filters.links.relation must be 'AND' or 'OR'." });
                 return;
            }
            if (config.filters.tags && (!config.filters.tags.relation ||!['AND', 'OR'].includes(config.filters.tags.relation))) {
                 el.createEl("pre", { text: "Error: filters.tags.relation must be 'AND' or 'OR'." });
                 return;
            }
            if (config.filters.tags?.from_frontmatter && !config.filters.tags.from_frontmatter.key) {
                el.createEl("pre", { text: "Error: filters.tags.from_frontmatter must have a 'key'." });
                return;
            }
        }
        if (!['asc', 'desc'].includes(config.sort_order)) {
            el.createEl("pre", { text: "Error: sort_order must be 'asc' or 'desc'." });
            return;
        }
        if (config.heading_level && (config.heading_level < 1 || config.heading_level > 6)) {
            el.createEl("pre", { text: "Error: heading_level must be between 1 and 6." });
            return;
        }
        if (config.embed_format && !['!![[]]', '![[]]'].includes(config.embed_format)) {
            el.createEl("pre", { text: "Error: embed_format must be '!![[]]' or '![[]]'." });
            return;
        }
        // --- End Validation ---

        // Find the dynamic region in the file
        const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
        if (!(file instanceof TFile)) {
            el.createEl("pre", { text: "Error: Could not process a non-file path." });
            return;
        }

        const context: TimelineContext = {
            config,
            dataviewApi,
            currentFile: file,
            app: plugin.app
        };

        const resolvedTags = resolveTags(context);
        const resolvedLinks = resolveLinks(context);

        const fileContent = await plugin.app.vault.read(file);
        const sectionInfo = ctx.getSectionInfo(el);
        if (!sectionInfo) {
            el.createEl("pre", { text: "Error: Could not get section info." });
            return;
        }
        const codeBlockEndLine = sectionInfo.lineEnd;

        const region = findDynamicRegion(fileContent, codeBlockEndLine);
        
        // ==================
        // 3. Execute query
        // ==================
        const pages = executeTimelineQuery(
            context,
            resolvedLinks,
            resolvedTags
        );

        // 4. Extract sections from pages
        let allSections: { file: TFile; heading: HeadingCache }[] = [];
        for (const page of pages) {
            if (page.file && page.file.path) {
                // We need the TFile object, but dataview pages only give us the path.
                const file = plugin.app.vault.getAbstractFileByPath(
                    page.file.path
                );
                if (file instanceof TFile) {
                    const sections = extractTimeSections(file, context);
                    allSections.push(...sections);
                }
            }
        }

        // 5. Generate a stable signature of the data before rendering
        const dataSignature = generateTimelineSignature(allSections);
        const newHash = simpleHash(dataSignature).toString();

        // 6. Compare with existing content and update if needed
        if (region) {
            if (newHash === region.existingHash) {
                // Content is the same, do nothing.
                // We still need to render something to the live preview element.
                el.createEl("pre", {
                    text: "Timeline content is up to date.",
                });
                return;
            }

            // Data has changed, re-render and update the file
            const newContent = renderTimelineMarkdown(allSections, config);
            const newStartMarker = `${REGION_START_MARKER_PREFIX} data-hash="${newHash}" -->`;
            const newFullRegion = `${newStartMarker}\n${newContent}\n${REGION_END_MARKER}`;

            const fileContentLines = fileContent.split("\n");
            fileContentLines.splice(
                region.regionStartLine,
                region.regionEndLine - region.regionStartLine + 1,
                ...newFullRegion.split("\n")
            );
            await plugin.app.vault.modify(file, fileContentLines.join("\n"));
        } else {
            // No existing region, render and append to the end of the code block
            const newContent = renderTimelineMarkdown(allSections, config);
            const newStartMarker = `${REGION_START_MARKER_PREFIX} data-hash="${newHash}" -->`;
            const newRegion = `\n${newStartMarker}\n${newContent}\n${REGION_END_MARKER}`;

            const fileContentLines = fileContent.split("\n");
            fileContentLines.splice(codeBlockEndLine + 1, 0, ...newRegion.split('\n'));
            await plugin.app.vault.modify(file, fileContentLines.join("\n"));
        }

        // Final "up to date" message
        el.createEl("pre", { text: "Timeline updated successfully." });
    } catch (e) {
        console.error("Block Link Plus: Error executing timeline query.", e);
        el.createEl("pre", {
            text: `Failed to execute timeline query:\n${e.message}`
        });
    }
}
