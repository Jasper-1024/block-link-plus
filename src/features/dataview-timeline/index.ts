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
import { getDataviewApi } from "../../utils/dataview-detector";
import crypto from "crypto";

const TIMELINE_END_MARKER = REGION_END_MARKER;

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
    debug?: boolean;
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
 * Renders debug output showing the parsed configuration and search results
 * @param config The timeline configuration
 * @param resolvedTags The resolved tags for filtering
 * @param resolvedLinks The resolved links for filtering
 * @param pages The dataview query results
 * @param allSections The extracted sections
 * @returns A formatted debug output string
 */
function renderDebugOutput(
    config: TimelineConfig,
    resolvedTags: string[],
    resolvedLinks: Link[],
    pages: any,
    allSections: { file: TFile; heading: HeadingCache }[]
): string {
    const debugInfo = {
        parsedConfig: {
            source_folders: config.source_folders,
            within_days: config.within_days,
            sort_order: config.sort_order,
            heading_level: config.heading_level,
            embed_format: config.embed_format,
            time_pattern: config.time_pattern,
            debug: config.debug,
            filters: config.filters
        },
        resolvedFilters: {
            tags: resolvedTags,
            links: resolvedLinks.map(link => ({
                path: link.path,
                type: link.type || 'file'
            }))
        },
        dataviewQueryResults: {
            totalPages: pages.length || pages.values?.length || 0,
            pages: (pages.values || pages).slice(0, 10).map((page: any) => ({
                path: page.file?.path,
                name: page.file?.name,
                tags: page.file?.tags,
                cday: page.file?.cday?.toString(),
                outlinks: page.file?.outlinks?.slice(0, 5).map((link: any) => link.path)
            }))
        },
        extractedSections: {
            totalSections: allSections.length,
            sections: allSections.slice(0, 20).map(section => ({
                file: {
                    path: section.file.path,
                    name: section.file.name,
                    basename: section.file.basename
                },
                heading: {
                    text: section.heading.heading,
                    level: section.heading.level,
                    line: section.heading.position.start.line
                }
            }))
        },
        filteringStats: {
            candidateFiles: pages.length || pages.values?.length || 0,
            sectionsAfterExtraction: allSections.length,
            filterEfficiency: `${allSections.length}/${pages.length || pages.values?.length || 0} sections extracted`
        }
    };

    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(debugInfo, null, 2);
    return pre.outerHTML;
}

/**
 * Get the basenames of the links
 * @param pathsSet The set of link paths
 * @returns The set of link basenames
 * 
 * eg: 
 * input: ['/path/to/file.md', '/path/to/file2.md']
 * output: ['file', 'file2']
 */
function getBasenamesWithRegex(pathsSet: Set<string>): Set<string> {
    const basenames = new Set<string>();
    const regex = /([^/]+?)(?:\.md)?$/; 
    
    for (const path of pathsSet) {
      const match = path.match(regex);
      if (match && match[1]) {
        basenames.add(match[1]);
      }
    }
    return basenames;
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
        
        const targetLinkBasenames = getBasenamesWithRegex(targetLinkPaths)
        // Check if this section contains any of the target links
        const containsTargetLink = allLinksInFile.some(link => 
            (targetLinkBasenames.has(link.link)) &&
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
        // 使用统一的检测逻辑获取 Dataview API
        const dataviewApi = getDataviewApi();
        if (!dataviewApi) {
            // Still render errors in the preview pane
            el.empty();
            el.createEl("pre", { text: "Error: Dataview plugin is not installed or enabled." });
            return;
        }

        // 解析代码块配置
        const blockConfig = yaml.load(source) as Partial<TimelineConfig>;

        // 创建完整配置，合并默认值和代码块配置
        const config: TimelineConfig = {
            // 从插件设置中获取默认值
            sort_order: plugin.settings.timelineDefaultSortOrder,
            heading_level: plugin.settings.timelineDefaultHeadingLevel,
            embed_format: plugin.settings.timelineDefaultEmbedFormat,
            
            // 覆盖代码块中指定的值
            ...blockConfig,
            
            // 确保 app 属性存在
            app: plugin.app
        };

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

        // Check if debug mode is enabled
        if (config.debug) {
            // Render debug output in preview pane
            el.empty();
            el.createEl("h3", { text: "🐛 Timeline Debug Output" });
            
            const debugOutput = renderDebugOutput(
                config,
                resolvedTags,
                resolvedLinks,
                pages,
                allSections
            );
            
            const debugContainer = el.createEl("div");
            debugContainer.innerHTML = debugOutput;
            return; // Exit early in debug mode
        }

        const fileContent = await plugin.app.vault.read(file);
        const sectionInfo = ctx.getSectionInfo(el);
        if (!sectionInfo) {
            return; // Exit silently
        }
        const codeBlockEndLine = sectionInfo.lineEnd;

        // --- Phase 3.2: Read and parse existing region ---
        const region = findDynamicRegion(fileContent, codeBlockEndLine);
        const userModificationsMap = new Map<string, string>();
        if (region) {
            const existingLines = region.currentContent.split('\n').filter(line => line.trim());
            for (const line of existingLines) {
                const key = parseLinkLineForKey(line);
                if (key) {
                    userModificationsMap.set(key, line);
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

        // --- Phase 3.5: Calculate hash and check for changes ---
        const newContentBlock = newContentLines.join('\n');
        const newContentHash = crypto.createHash('md5').update(newContentBlock).digest('hex');
        
        // Check if content has changed by comparing hashes
        if (region?.existingHash === newContentHash) {
            return; // Content unchanged, skip file modification
        }

        // --- Phase 3.6: Write new content back to file ---
        const originalLines = fileContent.split('\n');
        const newStartMarker = `${REGION_START_MARKER_PREFIX} data-hash="${newContentHash}" %%`;

        let newFileContent: string;
        if (region) {
            // Region exists, replace its content
            const beforeRegion = originalLines.slice(0, region.regionStartLine).join('\n');
            const afterRegion = originalLines.slice(region.regionEndLine + 1).join('\n');
            newFileContent = `${beforeRegion}\n${newStartMarker}\n${newContentBlock}\n${TIMELINE_END_MARKER}${afterRegion ? `\n${afterRegion}`: ''}`;
        } else {
            // No region, create a new one after the code block
            const beforeRegion = originalLines.slice(0, codeBlockEndLine + 1).join('\n');
            const afterRegion = originalLines.slice(codeBlockEndLine + 1).join('\n');
            newFileContent = `${beforeRegion}\n${newStartMarker}\n${newContentBlock}\n${TIMELINE_END_MARKER}${afterRegion ? `\n${afterRegion}`: ''}`;
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
