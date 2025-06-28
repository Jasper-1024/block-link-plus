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
import { DataviewApi, Link } from "obsidian-dataview";
import { resolveTags, resolveLinks } from "./filter-resolver";

const TIMELINE_START_MARKER = "%% blp-timeline-start %%";
const TIMELINE_END_MARKER = "%% blp-timeline-end %%";

/**
 * Finds the timeline sync region in a file's content.
 * @param fileContent The full content of the file.
 * @param codeBlockEndLine The line where the timeline code block definition ends.
 * @returns An object describing the found region.
 */
function findSyncRegion(fileContent: string, codeBlockEndLine: number) {
    const lines = fileContent.split('\n');
    const region = {
        regionExists: false,
        startLine: -1,
        endLine: -1,
        existingLines: [] as string[],
    };

    let foundStart = false;
    for (let i = codeBlockEndLine + 1; i < lines.length; i++) {
        if (lines[i].trim() === TIMELINE_START_MARKER) {
            region.startLine = i;
            foundStart = true;
        } else if (foundStart && lines[i].trim() === TIMELINE_END_MARKER) {
            region.endLine = i;
            region.regionExists = true;
            // Extract the content between the markers
            region.existingLines = lines.slice(region.startLine + 1, region.endLine);
            return region;
        }
    }
    // Reset if only start or end is found, to prevent partial matches
    if (!region.regionExists) {
        region.startLine = -1;
        region.endLine = -1;
    }
    return region;
}

/**
 * Parses a line of markdown link to generate a stable key (filepath#heading).
 * @param line The markdown line to parse.
 * @returns A stable key or null if parsing fails.
 */
function parseLinkLineForKey(line: string): string | null {
    const match = line.match(/\[\[([^#|\]]+)#([^|\]]+)/);
    if (match && match.length > 2) {
        // Key is 'filepath#heading'
        return `${match[1]}#${match[2]}`;
    }
    return null;
}

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
    app: App;
}

export interface TimelineContext {
    config: TimelineConfig;
    dataviewApi: DataviewApi;
    currentFile: TFile;
    app: App;
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
 * Extracts only the sections that contain the specified tags or links.
 * @param file The file to extract sections from.
 * @param context The timeline context.
 * @param resolvedTags The tags to search for.
 * @param resolvedLinks The links to search for.
 * @returns An array of sections that contain the specified tags or links.
 */
function extractRelevantSections(
    file: TFile,
    context: TimelineContext,
    resolvedTags: string[],
    resolvedLinks: Link[]
): { file: TFile; heading: HeadingCache }[] {
    const { config, app } = context;
    const fileCache = app.metadataCache.getFileCache(file);

    if (!fileCache || !fileCache.headings) {
        return [];
    }

    // Get all headings of the specified level
    const candidateHeadings = fileCache.headings.filter(
        (h) => h.level === config.heading_level
    );

    if (candidateHeadings.length === 0) {
        return [];
    }

    // Apply time pattern filter if specified
    let filteredHeadings = candidateHeadings;
    if (config.time_pattern) {
        try {
            const timeRegex = new RegExp(config.time_pattern);
            filteredHeadings = filteredHeadings.filter((h) =>
                timeRegex.test(h.heading)
            );
        } catch (e) {
            console.error(
                `Block Link Plus: Invalid time_pattern regex: ${config.time_pattern}`,
                e
            );
            return []; // Return empty if the regex is invalid
        }
    }

    // Get all tags and links in the file
    const allTagsInFile = fileCache.tags || [];
    const allLinksInFile = fileCache.links || [];

    // Create sets for faster lookup
    const targetTags = new Set(resolvedTags);
    const targetLinkPaths = new Set(resolvedLinks.map(link => link.path));

    // Find the valid sections
    const validSections: { file: TFile; heading: HeadingCache }[] = [];
    
    // Process each candidate heading
    for (let i = 0; i < filteredHeadings.length; i++) {
        const heading = filteredHeadings[i];
        
        // Determine the range of this heading (from its start line to the line before the next heading of same or higher level)
        const startLine = heading.position.start.line;
        let endLine = Infinity;
        
        // Find the next heading of same or higher level
        for (let j = 0; j < fileCache.headings.length; j++) {
            const nextHeading = fileCache.headings[j];
            if (nextHeading.position.start.line > startLine && 
                nextHeading.level <= heading.level) {
                endLine = nextHeading.position.start.line;
                break;
            }
        }
        
        // Check if this section contains any of the target tags
        const containsTargetTag = allTagsInFile.some(tag => 
            targetTags.has(tag.tag) && 
            tag.position.start.line >= startLine && 
            tag.position.start.line < endLine
        );
        
        // Check if this section contains any of the target links
        const containsTargetLink = allLinksInFile.some(link => 
            targetLinkPaths.has(link.link) && 
            link.position.start.line >= startLine && 
            link.position.start.line < endLine
        );
        
        // If this section contains a target tag or link, add it to the valid sections
        if (containsTargetTag || containsTargetLink) {
            validSections.push({ file, heading });
        }
    }

    return validSections;
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
    // Phase 4: Give user feedback in the preview pane.
    el.setText("Timeline content is managed directly in the editor.");
    
    try {
        const dataviewApi = plugin.app.plugins.plugins.dataview?.api;
        if (!dataviewApi) {
            // Still render errors in the preview pane
            el.empty();
            el.createEl("pre", { text: "Error: Dataview plugin is not installed or enabled." });
            return;
        }

        const config = yaml.load(source) as TimelineConfig;

        // --- Set Defaults ---
        config.sort_order = config.sort_order ?? 'desc';
        config.heading_level = config.heading_level ?? 4;
        config.embed_format = config.embed_format ?? '!![[]]';

        // --- Validation (omitted for brevity, assume it's here) ---

        // Find the file
        const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
        if (!(file instanceof TFile)) {
            return; // Exit silently if not a file
        }

        const context: TimelineContext = {
            config,
            dataviewApi,
            currentFile: file,
            app: plugin.app
        };

        const fileContent = await plugin.app.vault.read(file);
        const sectionInfo = ctx.getSectionInfo(el);
        if (!sectionInfo) {
            return; // Exit silently
        }
        const codeBlockEndLine = sectionInfo.lineEnd;

        // --- Phase 3.2: Read and parse existing region ---
        const region = findSyncRegion(fileContent, codeBlockEndLine);
        const userModificationsMap = new Map<string, string>();
        if (region.regionExists) {
            for (const line of region.existingLines) {
                const key = parseLinkLineForKey(line);
                if (key) {
                    userModificationsMap.set(key, line);
                }
            }
        }

        // --- Phase 3.3: Execute query ---
        const resolvedTags = resolveTags(context);
        const resolvedLinks = resolveLinks(context);
        const pages = executeTimelineQuery(
            context,
            resolvedLinks,
            resolvedTags
        );

        // 4. Extract sections from pages
        let allSections: { file: TFile; heading: HeadingCache }[] = [];
        for (const page of pages) {
            if (page.file && page.file.path) {
                const pageFile = plugin.app.vault.getAbstractFileByPath(
                    page.file.path
                );
                if (pageFile instanceof TFile) {
                    // Replace extractTimeSections with our new function that only returns relevant sections
                    const sections = extractRelevantSections(pageFile, context, resolvedTags, resolvedLinks);
                    allSections.push(...sections);
                }
            }
        }
        
        // --- Phase 3.4: Intelligent merge ---
        // Sort sections before processing
        allSections.sort((a, b) => {
            const pathCompare = a.file.path.localeCompare(b.file.path);
            if (pathCompare !== 0) return pathCompare;
            return a.heading.position.start.line - b.heading.position.start.line;
        });

        const newContentLines: string[] = [];
        for (const section of allSections) {
            const key = `${section.file.path}#${section.heading.heading}`;
            if (userModificationsMap.has(key)) {
                newContentLines.push(userModificationsMap.get(key)!);
            } else {
                // This is a new item, create a default link
                const embedLink =
                config.embed_format === "!![[]]"
                    ? `!![[${section.file.path}#${section.heading.heading}]]`
                    : `![[${section.file.path}#${section.heading.heading}]]`;
                newContentLines.push(embedLink);
            }
        }

        // --- Phase 3.5: Write new content back to file ---
        const newContentBlock = newContentLines.join('\n');
        const originalLines = fileContent.split('\n');

        let newFileContent: string;
        if (region.regionExists) {
            // Region exists, replace its content
            const beforeRegion = originalLines.slice(0, region.startLine + 1).join('\n');
            const afterRegion = originalLines.slice(region.endLine).join('\n');
            newFileContent = `${beforeRegion}\n${newContentBlock}\n${afterRegion}`;
        } else {
            // No region, create a new one after the code block
            const beforeRegion = originalLines.slice(0, codeBlockEndLine + 1).join('\n');
            const afterRegion = originalLines.slice(codeBlockEndLine + 1).join('\n');
            newFileContent = `${beforeRegion}\n${TIMELINE_START_MARKER}\n${newContentBlock}\n${TIMELINE_END_MARKER}${afterRegion ? `\n${afterRegion}`: ''}`;
        }

        // Only write if content has actually changed
        if (newFileContent.trim() !== fileContent.trim()) {
            await plugin.app.vault.modify(file, newFileContent);
        }

    } catch (error) {
        console.error("Block Link Plus Timeline Error:", error);
        el.empty();
        el.createEl("pre", { text: `Timeline Error: ${error.message}` });
    }
}
