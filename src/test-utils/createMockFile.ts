/**
 * 创建模拟的文件和相关元数据
 * 用于测试中快速创建文件和元数据
 */
import { App, TFile, CachedMetadata, HeadingCache, TagCache, LinkCache } from 'obsidian';

// 扩展类型以包含模拟方法
interface MockVault {
  _addFile(path: string, content: string): TFile;
}

interface MockMetadataCache {
  _setFileCache(file: TFile, metadata: CachedMetadata): void;
}

/**
 * 创建模拟的文件和相关元数据
 * @param app 模拟的 App 实例
 * @param path 文件路径
 * @param content 文件内容
 * @param metadata 文件元数据（可选）
 * @returns 模拟的 TFile 实例
 */
export function createMockFile(
  app: App,
  path: string,
  content: string,
  metadata?: Partial<CachedMetadata>
): TFile {
  // 创建文件
  const file = (app.vault as unknown as MockVault)._addFile(path, content);
  
  // 如果提供了元数据，则设置元数据
  if (metadata) {
    (app.metadataCache as unknown as MockMetadataCache)._setFileCache(file, metadata as CachedMetadata);
  } else {
    // 否则，尝试从内容中提取基本元数据
    const extractedMetadata = extractBasicMetadata(content);
    (app.metadataCache as unknown as MockMetadataCache)._setFileCache(file, extractedMetadata);
  }
  
  return file;
}

/**
 * 从文件内容中提取基本元数据
 * @param content 文件内容
 * @returns 提取的元数据
 */
function extractBasicMetadata(content: string): CachedMetadata {
  const lines = content.split('\n');
  const metadata: CachedMetadata = {};
  
  // 提取标题
  const headings: HeadingCache[] = [];
  let lineNumber = 0;
  
  for (const line of lines) {
    // 标题匹配 (# 标题)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const heading = headingMatch[2];
      headings.push({
        heading,
        level,
        position: {
          start: { line: lineNumber, col: 0, offset: 0 },
          end: { line: lineNumber, col: line.length, offset: 0 }
        }
      });
    }
    
    lineNumber++;
  }
  
  if (headings.length > 0) {
    metadata.headings = headings;
  }
  
  // 提取标签
  const tags: TagCache[] = [];
  lineNumber = 0;
  
  for (const line of lines) {
    // 查找所有标签 (#标签)
    const tagMatches = Array.from(line.matchAll(/#([a-zA-Z0-9_/-]+)/g));
    for (const match of tagMatches) {
      const tag = match[0];
      const startCol = match.index || 0;
      tags.push({
        tag,
        position: {
          start: { line: lineNumber, col: startCol, offset: 0 },
          end: { line: lineNumber, col: startCol + tag.length, offset: 0 }
        }
      });
    }
    
    lineNumber++;
  }
  
  if (tags.length > 0) {
    metadata.tags = tags;
  }
  
  // 提取链接
  const links: LinkCache[] = [];
  lineNumber = 0;
  
  for (const line of lines) {
    // 查找所有链接 [[链接]]
    const linkMatches = Array.from(line.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g));
    for (const match of linkMatches) {
      const link = match[1];
      const displayText = match[2];
      const startCol = match.index || 0;
      // 使用类型断言处理可能缺少的属性
      links.push({
        link,
        displayText,
        position: {
          start: { line: lineNumber, col: startCol, offset: 0 },
          end: { line: lineNumber, col: startCol + match[0].length, offset: 0 }
        }
      } as LinkCache);
    }
    
    lineNumber++;
  }
  
  if (links.length > 0) {
    metadata.links = links;
  }
  
  return metadata;
} 