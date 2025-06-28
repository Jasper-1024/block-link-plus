import { App, HeadingCache, resolveSubpath, HeadingSubpathResult, BlockSubpathResult, BlockCache, CachedMetadata } from 'obsidian';

/**
 * 从 CachedMetadata 中获取文件最后一个内容块的结束行号。
 *
 * 此函数的核心逻辑是检查 `cache.sections` 数组，因为它记录了文件中所有
 * 的内容块（如段落、标题、列表等）。最后一个 section 的结束行就是
 * 文件内容的最后一行。
 *
 * @param cache - 从 `app.metadataCache.getCache(filePath)` 获取的 CachedMetadata 对象，可以为 `null`。
 * @returns {number} 文件最后一个内容块的结束行号（从 0 开始计数）。
 * - 如果文件有内容，返回最后一行的行号。
 * - 如果文件只包含 frontmatter，返回 frontmatter 的结束行号。
 * - 如果缓存不存在或文件完全为空，安全地返回 0。
 */
export function getLastContentLineFromCache(cache: CachedMetadata | null): number {
  // 1. 处理缓存不存在的边缘情况
  if (!cache) {
    // 如果没有缓存，我们无法确定行数，返回 0 是最安全的默认值。
    return 0;
  }

  // 2. 优先使用 sections 数组，这是最可靠的数据源
  // sections 数组包含了文件中所有的块级元素。
  if (cache.sections && cache.sections.length > 0) {
    // 获取最后一个 section 元素
    const lastSection = cache.sections[cache.sections.length - 1];
    // 返回该 section 的结束行号（0-indexed）
    return lastSection.position.end.line;
  }

  // 3. 处理文件只包含 frontmatter 的情况
  // 如果 sections 为空，但有 frontmatter，那么 frontmatter 就是唯一的内容。
  if (cache.frontmatter) {
    return cache.frontmatter.position.end.line;
  }

  // 4. 处理文件完全为空的情况
  // 如果缓存存在但既没有 sections 也没有 frontmatter，说明文件是空的。
  return 0;
}

/**
 * 根据路径和引用(ref)获取对应内容的起止行号范围（1-based）。
 * - 支持块引用和标题引用。
 * - 若未找到或参数无效，返回 [undefined, undefined]。
 *
 * @param path - 文件路径
 * @param ref - 引用字符串，可以是块引用或标题引用
 * @param app - Obsidian 应用实例
 * @returns 起止行号范围 [number | undefined, number | undefined]
 */
export const getLineRangeFromRef = (
  path: string,
  ref: string | undefined,
  app: App
): [number | undefined, number | undefined] => {
  if (!ref) return [undefined, undefined];

  const cache = app.metadataCache.getCache(path);
  if (!cache) return [undefined, undefined];

  const resolved = resolveSubpath(cache, ref) as HeadingSubpathResult | BlockSubpathResult | null;
  if (!resolved) return [undefined, undefined];

  if (resolved.type === "block") {
    const { position } = resolved.block as BlockCache;
    return [position.start.line + 1, position.end.line + 1];
  }

  if (resolved.type === "heading") {
    const { current: heading, next } = resolved as HeadingSubpathResult;
    const start = heading.position.start.line + 1;
    const end = next
      ? next.position.start.line
      : getLastContentLineFromCache(cache) + 1;
    return [start, end];
  }

  return [undefined, undefined];
};
