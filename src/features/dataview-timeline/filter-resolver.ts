import { TimelineConfig, TimelineContext } from './index';
import { Link } from 'obsidian-dataview';

/**
 * Resolves the final list of tags to be used for filtering, based on the timeline configuration.
 * It combines explicit tags with tags sourced from the current file's frontmatter.
 * @param context The timeline context, containing config and file information.
 * @returns A de-duplicated array of tags.
 */
export function resolveTags(context: TimelineContext): string[] {
    const { config, currentFile } = context;
    // It's more reliable to get the frontmatter directly from the file cache
    const frontmatter = context.dataviewApi.page(currentFile.path)?.file?.frontmatter;

    let explicitTags: string[] = [];
    if (config.filters?.tags?.items) {
        explicitTags = config.filters.tags.items;
    }

    let frontmatterTags: string[] = [];
    const fmConfig = config.filters?.tags?.from_frontmatter;

    // Check if the frontmatter sourcing is configured and the target key exists
    if (fmConfig && frontmatter && frontmatter[fmConfig.key]) {
        const rawFmTags = frontmatter[fmConfig.key];
        let potentialTags: string[] = [];

        // Handle both array of tags and comma-separated string of tags
        if (Array.isArray(rawFmTags)) {
            potentialTags = rawFmTags.map(String).filter(Boolean);
        } else if (typeof rawFmTags === 'string') {
            potentialTags = rawFmTags.split(',').map(t => t.trim()).filter(Boolean);
        }

        const excludedTags = new Set(fmConfig.exclude || []);
        frontmatterTags = potentialTags.filter(tag => !excludedTags.has(tag));
    }

    // Combine explicit tags and frontmatter tags, then de-duplicate
    const allTagsRaw = [...explicitTags, ...frontmatterTags];
    const allTagsDeduplicated = [...new Set(allTagsRaw)];

    // Normalize all tags to ensure they start with a '#' for Dataview compatibility
    const normalizedTags = allTagsDeduplicated
        .map(tag => {
            const trimmedTag = tag.trim();
            if (trimmedTag && !trimmedTag.startsWith('#')) {
                return '#' + trimmedTag;
            }
            return trimmedTag;
        })
        .filter(Boolean); // Filter out any empty strings

    return normalizedTags;
}

/**
 * Resolves the final list of links to be used for filtering.
 * It combines explicit links with a potential link to the current file.
 * @param context The timeline context, containing config and file information.
 * @returns A de-duplicated array of Dataview Link objects.
 */
export function resolveLinks(context: TimelineContext): Link[] {
    const { config, currentFile, dataviewApi } = context;

    const allLinkPaths: string[] = [];

    // Add explicit links from config
    if (config.filters?.links?.items) {
        allLinkPaths.push(...config.filters.links.items);
    }

    // Add link to current file if configured
    if (config.filters?.links?.link_to_current_file) {
        allLinkPaths.push(currentFile.path);
    }

    // De-duplicate paths first to avoid creating redundant Link objects
    const uniqueLinkPaths = [...new Set(allLinkPaths)];

    // Convert all unique link paths to Dataview Link objects
    const links = uniqueLinkPaths.map(path => {
        // Extract the actual path from the wikilink syntax, if present.
        const wikilinkMatch = path.match(/^\[\[([^|\]]+)]]$/);
        const cleanedPath = wikilinkMatch ? wikilinkMatch[1] : path;
        
        // Resolve the link text to a full file path
        const file = context.dataviewApi.app.metadataCache.getFirstLinkpathDest(cleanedPath, currentFile.path);
        const resolvedPath = file ? file.path : cleanedPath;

        const link = dataviewApi.fileLink(resolvedPath);
        return link;
    });
    
    return links.filter(Boolean); // Filter out any null links if resolution failed
} 