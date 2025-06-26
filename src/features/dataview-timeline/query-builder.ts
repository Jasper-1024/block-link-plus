import { DataviewApi, Link } from "obsidian-dataview";
import { TimelineConfig, TimelineContext } from "./index";
import { DateTime } from "luxon";
import { TFile, HeadingCache } from "obsidian";

/**
 * Represents a Dataview page with file metadata
 */
interface DataviewPage {
    file: {
        path: string;
        name: string;
        outlinks?: Link[];
        tags?: string[];
        cday?: DateTime;
    };
    date?: DateTime;
    [key: string]: any;
}

/**
 * Generates a function that checks if a Dataview page meets the specified link criteria.
 * @param links The list of Link objects to check for.
 * @param relation The logical relation ('AND' or 'OR') to apply.
 * @returns A function that takes a page and returns true if it matches, false otherwise.
 */
function generateLinkCondition(links: Link[], relation: 'AND' | 'OR'): (page: DataviewPage) => boolean {
    if (links.length === 0) {
        return () => true; // No link criteria means this part of the filter passes.
    }

    if (relation === 'AND') {
        return (p: DataviewPage) => {
            const result = links.every(link => {
                const hasLink = p.file.outlinks?.some(outlink => outlink.path === link.path);
                return hasLink;
            });
            return result;
        };
    } else { // OR
        return (p: DataviewPage) => {
            const result = links.some(link => {
                const hasLink = p.file.outlinks?.some(outlink => outlink.path === link.path);
                return hasLink;
            });
            return result;
        };
    }
}

/**
 * Generates a function that checks if a Dataview page meets the specified tag criteria.
 * @param tags The list of tag strings to check for.
 * @param relation The logical relation ('AND' or 'OR') to apply.
 * @returns A function that takes a page and returns true if it matches, false otherwise.
 */
function generateTagCondition(tags: string[], relation: 'AND' | 'OR'): (page: DataviewPage) => boolean {
    if (tags.length === 0) {
        return () => true; // No tag criteria means this part of the filter passes.
    }

    if (relation === 'AND') {
        return (p: DataviewPage) => {
            const result = tags.every(tag => {
                const hasTag = p.file.tags?.includes(tag);
                return hasTag;
            });
            return result;
        };
    } else { // OR
        return (p: DataviewPage) => {
            const result = tags.some(tag => {
                const hasTag = p.file.tags?.includes(tag);
                return hasTag;
            });
            return result;
        };
    }
}


export function executeTimelineQuery(
    context: TimelineContext,
    resolvedLinks: Link[],
    resolvedTags: string[]
) {
    const { config, dataviewApi: dv } = context;
    let pages;

    // 1. Build base pages from source_folders or all pages
    if (config.source_folders && config.source_folders.length > 0) {
        const sourceQuery = config.source_folders.map((f: string) => `"${f}"`).join(" or ");
        pages = dv.pages(sourceQuery);
    } else {
        pages = dv.pages(); // All pages if no source is specified
    }

    // 2. Generate filter conditions from resolved links and tags
    const linkCondition = generateLinkCondition(
        resolvedLinks,
        config.filters?.links?.relation || 'AND'
    );
    const tagCondition = generateTagCondition(
        resolvedTags,
        config.filters?.tags?.relation || 'AND'
    );

    // 3. Apply the main filter logic
    const mainRelation = config.filters?.relation || 'AND';

    const hasLinkFilters = resolvedLinks.length > 0;
    const hasTagFilters = resolvedTags.length > 0;

    if (hasLinkFilters || hasTagFilters) {
        if (mainRelation === 'AND') {
            pages = pages.where((p: DataviewPage) => {
                const linkResult = linkCondition(p);
                const tagResult = tagCondition(p);
                return linkResult && tagResult;
            });
        } else { // OR
            pages = pages.where((p: DataviewPage) => {
                const linkResult = linkCondition(p);
                const tagResult = tagCondition(p);
                return linkResult || tagResult;
            });
        }
    }

    // 4. Filter by date using file name (for daily notes)
    if (config.within_days) {
        try {
            const threshold = dv.luxon.DateTime.now().minus({ days: config.within_days });
            pages = pages.where((p: DataviewPage) => {
                const fileDate = p.file.cday;
                const isWithinRange = fileDate && fileDate >= threshold;
                return isWithinRange;
            });
        } catch(e) {
            console.error("Block Link Plus: Could not parse file names as dates. 'within_days' filter works best with daily notes (e.g., YYYY-MM-DD).", e);
        }
    }

    // 5. Sort the results
    if (config.sort_order) {
        pages = pages.sort((p: DataviewPage) => p.file.name, config.sort_order);
    }

    return pages;
}

export function extractTimeSections(
    file: TFile,
    context: TimelineContext
): { file: TFile; heading: HeadingCache }[] {
    const { config, app } = context;
    const fileCache = app.metadataCache.getFileCache(file);

    if (!fileCache || !fileCache.headings) {
        return [];
    }

    let validHeadings = fileCache.headings.filter(
        (h) => h.level === config.heading_level
    );

    if (config.time_pattern) {
        try {
            const timeRegex = new RegExp(config.time_pattern);
            validHeadings = validHeadings.filter((h) =>
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

    return validHeadings.map((heading) => ({
        file,
        heading,
    }));
} 