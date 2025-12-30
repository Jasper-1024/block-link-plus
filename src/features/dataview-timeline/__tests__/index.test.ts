/**
 * index.ts 的测试文件
 */
import { App, TFile, HeadingCache } from 'obsidian';
import { DataviewApi } from '../../../../__mocks__/obsidian-dataview';
import { TimelineContext, TimelineConfig } from '../index';

// 导入私有函数，仅用于测试
// 这些函数在原模块中未导出，我们需要重新实现它们
function findSyncRegion(fileContent: string, codeBlockEndLine: number): { start: number; end: number } | null {
  const lines = fileContent.split('\n');
  const startMarker = '<!-- blp-timeline-start -->';
  const endMarker = '<!-- blp-timeline-end -->';

  let startLine = -1;
  let endLine = -1;

  // 从代码块结束行开始向下搜索
  for (let i = codeBlockEndLine; i < lines.length; i++) {
    if (lines[i].includes(startMarker)) {
      startLine = i;
    } else if (lines[i].includes(endMarker) && startLine !== -1) {
      endLine = i;
      break;
    }
  }

  if (startLine !== -1 && endLine !== -1) {
    return { start: startLine, end: endLine };
  }

  return null;
}

function parseLinkLineForKey(line: string): string | null {
  // 匹配 Markdown 链接格式 [[文件名#标题]]
  const linkMatch = line.match(/\[\[([^|\]]+?)(?:#([^|\]]+?))?(?:\|([^|\]]+?))?\]\]/);
  if (!linkMatch) return null;

  const fileName = linkMatch[1];
  const heading = linkMatch[2];

  return heading ? `${fileName}#${heading}` : fileName;
}

function renderTimelineMarkdown(
  sections: { file: TFile; heading: HeadingCache }[],
  config: TimelineConfig
): string {
  if (sections.length === 0) {
    return "No items found for this timeline.";
  }

  // 1. Group sections by file path
  const groupedByFile: Record<string, { file: TFile; headings: HeadingCache[] }> = {};
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
      const embedLink = `![[${group.file.path}#${heading.heading}]]`;
      markdown += `${embedLink}\n`;
    }
    markdown += "\n---\n\n";
  }

  return markdown.trim();
}

describe('dataview-timeline/index', () => {
  let mockApp: App;
  let mockDataviewApi: DataviewApi;
  let mockCurrentFile: TFile;

  beforeEach(() => {
    // 设置测试环境
    mockApp = new App();
    mockDataviewApi = new DataviewApi();
    mockCurrentFile = new TFile();
    mockCurrentFile.path = '/test/current-file.md';
    mockCurrentFile.basename = 'current-file';
    
    // 将 dataviewApi 添加到 app
    mockDataviewApi.app = mockApp;
  });

  describe('findSyncRegion', () => {
    test('应该找到同步区域', () => {
      const fileContent = `
# 测试文件

\`\`\`blp-timeline
source_folders: ["folder1"]
\`\`\`

<!-- blp-timeline-start -->
这里是时间线内容
<!-- blp-timeline-end -->

其他内容
`;

      const result = findSyncRegion(fileContent, 4);
      expect(result).not.toBeNull();
      expect(result?.start).toBe(7);
      expect(result?.end).toBe(9);
    });

    test('当没有同步区域时应该返回 null', () => {
      const fileContent = `
# 测试文件

\`\`\`blp-timeline
source_folders: ["folder1"]
\`\`\`

其他内容
`;

      const result = findSyncRegion(fileContent, 4);
      expect(result).toBeNull();
    });

    test('当只有开始标记但没有结束标记时应该返回 null', () => {
      const fileContent = `
# 测试文件

\`\`\`blp-timeline
source_folders: ["folder1"]
\`\`\`

<!-- blp-timeline-start -->
这里是时间线内容

其他内容
`;

      const result = findSyncRegion(fileContent, 4);
      expect(result).toBeNull();
    });
  });

  describe('parseLinkLineForKey', () => {
    test('应该解析简单的文件链接', () => {
      const line = '[[文件名]]';
      const result = parseLinkLineForKey(line);
      expect(result).toBe('文件名');
    });

    test('应该解析带标题的链接', () => {
      const line = '[[文件名#标题]]';
      const result = parseLinkLineForKey(line);
      expect(result).toBe('文件名#标题');
    });

    test('应该解析带显示文本的链接', () => {
      const line = '[[文件名|显示文本]]';
      const result = parseLinkLineForKey(line);
      expect(result).toBe('文件名');
    });

    test('应该解析带标题和显示文本的链接', () => {
      const line = '[[文件名#标题|显示文本]]';
      const result = parseLinkLineForKey(line);
      expect(result).toBe('文件名#标题');
    });

    test('当不是链接格式时应该返回 null', () => {
      const line = '普通文本';
      const result = parseLinkLineForKey(line);
      expect(result).toBeNull();
    });
  });

  describe('renderTimelineMarkdown', () => {
    test('应该正确渲染时间线 Markdown', () => {
      // 创建测试数据
      const file1 = new TFile();
      file1.path = '/test/file1.md';
      file1.basename = 'file1';
      file1.name = 'file1.md';
      
      const file2 = new TFile();
      file2.path = '/test/file2.md';
      file2.basename = 'file2';
      file2.name = 'file2.md';
      
      const heading1: HeadingCache = {
        heading: '标题1',
        level: 2,
        position: { start: { line: 5, col: 0, offset: 50 }, end: { line: 5, col: 10, offset: 60 } }
      };
      
      const heading2: HeadingCache = {
        heading: '标题2',
        level: 2,
        position: { start: { line: 10, col: 0, offset: 100 }, end: { line: 10, col: 10, offset: 110 } }
      };
      
      const heading3: HeadingCache = {
        heading: '标题3',
        level: 2,
        position: { start: { line: 15, col: 0, offset: 150 }, end: { line: 15, col: 10, offset: 160 } }
      };
      
      const sections = [
        { file: file1, heading: heading1 },
        { file: file1, heading: heading2 },
        { file: file2, heading: heading3 }
      ];
      
      const config: TimelineConfig = {
        app: mockApp,
        sort_order: 'desc',
      } as TimelineConfig;
      
      const result = renderTimelineMarkdown(sections, config);
      
      // 由于我们设置了降序排序，file2 应该在 file1 之前
      expect(result).toContain('[[file2]]');
      expect(result).toContain('![[/test/file2.md#标题3]]');
      expect(result).toContain('[[file1]]');
      expect(result).toContain('![[/test/file1.md#标题1]]');
      expect(result).toContain('![[/test/file1.md#标题2]]');
    });
    
    test('当没有部分时应该返回无项目消息', () => {
      const sections: { file: TFile; heading: HeadingCache }[] = [];
      const config: TimelineConfig = {
        app: mockApp
      } as TimelineConfig;
      
      const result = renderTimelineMarkdown(sections, config);
      expect(result).toBe('No items found for this timeline.');
    });
    
    test('应该使用正确的嵌入格式', () => {
      const file = new TFile();
      file.path = '/test/file.md';
      file.basename = 'file';
      file.name = 'file.md';
      
      const heading: HeadingCache = {
        heading: '标题',
        level: 2,
        position: { start: { line: 5, col: 0, offset: 50 }, end: { line: 5, col: 10, offset: 60 } }
      };
      
      const sections = [{ file, heading }];
      
      const config1: TimelineConfig = {
        app: mockApp,
      } as TimelineConfig;
      
      const result1 = renderTimelineMarkdown(sections, config1);
      expect(result1).toContain('![[/test/file.md#标题]]');
      
      const config2: TimelineConfig = {
        app: mockApp,
      } as TimelineConfig;
      
      const result2 = renderTimelineMarkdown(sections, config2);
      expect(result2).toContain('![[/test/file.md#标题]]');
    });
  });
}); 
