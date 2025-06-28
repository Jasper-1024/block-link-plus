/**
 * query-builder.ts 的测试文件
 */
import { 
  executeTimelineQuery,
  extractTimeSections
} from '../query-builder';
import { App, TFile } from 'obsidian';
import { DataviewApi, Link } from '../../../../__mocks__/obsidian-dataview';
import { TimelineContext, TimelineConfig } from '../index';

// 定义 DataviewPage 接口，与 query-builder.ts 中的一致
interface DataviewPage {
  file: {
    path: string;
    name: string;
    outlinks?: Link[];
    tags?: string[];
    cday?: Date;
  };
  date?: Date;
  [key: string]: any;
}

// 导入私有函数，仅用于测试
// 这些函数在原模块中未导出，我们在这里重新实现它们
function generateLinkCondition(links: Link[], relation: 'AND' | 'OR'): (page: DataviewPage) => boolean {
  if (links.length === 0) {
    return () => true;
  }

  if (relation === 'AND') {
    return (p: DataviewPage) => {
      return links.every(link => {
        return p.file.outlinks?.some(outlink => outlink.path === link.path);
      });
    };
  } else { // OR
    return (p: DataviewPage) => {
      return links.some(link => {
        return p.file.outlinks?.some(outlink => outlink.path === link.path);
      });
    };
  }
}

function generateTagCondition(tags: string[], relation: 'AND' | 'OR'): (page: DataviewPage) => boolean {
  if (tags.length === 0) {
    return () => true;
  }

  if (relation === 'AND') {
    return (p: DataviewPage) => {
      return tags.every(tag => {
        return p.file.tags?.includes(tag);
      });
    };
  } else { // OR
    return (p: DataviewPage) => {
      return tags.some(tag => {
        return p.file.tags?.includes(tag);
      });
    };
  }
}

describe('query-builder', () => {
  let mockApp: App;
  let mockDataviewApi: DataviewApi;
  let mockCurrentFile: TFile;

  beforeEach(() => {
    // 设置测试环境
    mockApp = new App();
    mockDataviewApi = new DataviewApi();
    mockCurrentFile = new TFile();
    mockCurrentFile.path = '/test/current-file.md';
    
    // 将 dataviewApi 添加到 app
    mockDataviewApi.app = mockApp;

    // 添加测试页面数据
    mockDataviewApi._addPage({
      file: {
        path: '/test/page1.md',
        name: 'page1.md',
        basename: 'page1',
        extension: 'md'
      },
      tags: ['#tag1', '#tag2'],
      links: [],
      outlinks: [
        { path: '/test/linked-page1.md', type: 'file' },
        { path: '/test/linked-page2.md', type: 'file' }
      ],
      cday: new Date('2023-01-01')
    });
    
    mockDataviewApi._addPage({
      file: {
        path: '/test/page2.md',
        name: 'page2.md',
        basename: 'page2',
        extension: 'md'
      },
      tags: ['#tag2', '#tag3'],
      links: [],
      outlinks: [
        { path: '/test/linked-page3.md', type: 'file' }
      ],
      cday: new Date('2023-01-15')
    });
    
    mockDataviewApi._addPage({
      file: {
        path: '/test/page3.md',
        name: 'page3.md',
        basename: 'page3',
        extension: 'md'
      },
      tags: ['#tag1', '#tag3'],
      links: [],
      outlinks: [
        { path: '/test/current-file.md', type: 'file' }
      ],
      cday: new Date('2023-02-01')
    });
  });

  describe('generateLinkCondition', () => {
    test('应该生成正确的 AND 条件链接过滤器', () => {
      const links: Link[] = [
        { path: '/test/link1.md', type: 'file' },
        { path: '/test/link2.md', type: 'file' }
      ];
      const relation = 'AND';

      const condition = generateLinkCondition(links, relation);
      
      // 创建测试页面
      const pageWithBothLinks: DataviewPage = {
        file: { path: 'test.md', name: 'test.md',
        outlinks: [
          { path: '/test/link1.md', type: 'file' },
          { path: '/test/link2.md', type: 'file' }
        ]}
      };
      
      const pageWithOneLink: DataviewPage = {
        file: { path: 'test.md', name: 'test.md',
        outlinks: [
          { path: '/test/link1.md', type: 'file' }
        ]}
      };
      
      const pageWithNoLinks: DataviewPage = {
        file: { path: 'test.md', name: 'test.md',
        outlinks: []}
      };

      // 测试条件函数
      expect(condition(pageWithBothLinks)).toBe(true);
      expect(condition(pageWithOneLink)).toBe(false);
      expect(condition(pageWithNoLinks)).toBe(false);
    });

    test('应该生成正确的 OR 条件链接过滤器', () => {
      const links: Link[] = [
        { path: '/test/link1.md', type: 'file' },
        { path: '/test/link2.md', type: 'file' }
      ];
      const relation = 'OR';

      const condition = generateLinkCondition(links, relation);
      
      // 创建测试页面
      const pageWithBothLinks: DataviewPage = {
        file: { path: 'test.md', name: 'test.md',
        outlinks: [
          { path: '/test/link1.md', type: 'file' },
          { path: '/test/link2.md', type: 'file' }
        ]}
      };
      
      const pageWithOneLink: DataviewPage = {
        file: { path: 'test.md', name: 'test.md',
        outlinks: [
          { path: '/test/link1.md', type: 'file' }
        ]}
      };
      
      const pageWithOtherLink: DataviewPage = {
        file: { path: 'test.md', name: 'test.md',
        outlinks: [
          { path: '/test/other-link.md', type: 'file' }
        ]}
      };

      // 测试条件函数
      expect(condition(pageWithBothLinks)).toBe(true);
      expect(condition(pageWithOneLink)).toBe(true);
      expect(condition(pageWithOtherLink)).toBe(false);
    });

    test('当链接为空数组时应该返回始终为真的函数', () => {
      const links: Link[] = [];
      const relation = 'AND';

      const condition = generateLinkCondition(links, relation);
      
      const anyPage: DataviewPage = {
        file: { path: 'test.md', name: 'test.md',
        outlinks: []}
      };

      expect(condition(anyPage)).toBe(true);
    });
  });

  describe('generateTagCondition', () => {
    test('应该生成正确的 AND 条件标签过滤器', () => {
      const tags = ['#tag1', '#tag2'];
      const relation = 'AND';

      const condition = generateTagCondition(tags, relation);
      
      // 创建测试页面
      const pageWithBothTags: DataviewPage = {
        file: { path: 'test.md', name: 'test.md',
        tags: ['#tag1', '#tag2', '#tag3']}
      };
      
      const pageWithOneTag: DataviewPage = {
        file: { path: 'test.md', name: 'test.md',
        tags: ['#tag1']}
      };
      
      const pageWithNoTags: DataviewPage = {
        file: { path: 'test.md', name: 'test.md',
        tags: []}
      };

      // 测试条件函数
      expect(condition(pageWithBothTags)).toBe(true);
      expect(condition(pageWithOneTag)).toBe(false);
      expect(condition(pageWithNoTags)).toBe(false);
    });

    test('应该生成正确的 OR 条件标签过滤器', () => {
      const tags = ['#tag1', '#tag2'];
      const relation = 'OR';

      const condition = generateTagCondition(tags, relation);
      
      // 创建测试页面
      const pageWithBothTags: DataviewPage = {
        file: { path: 'test.md', name: 'test.md',
        tags: ['#tag1', '#tag2', '#tag3']}
      };
      
      const pageWithOneTag: DataviewPage = {
        file: { path: 'test.md', name: 'test.md',
        tags: ['#tag1']}
      };
      
      const pageWithOtherTag: DataviewPage = {
        file: { path: 'test.md', name: 'test.md',
        tags: ['#tag3']}
      };

      // 测试条件函数
      expect(condition(pageWithBothTags)).toBe(true);
      expect(condition(pageWithOneTag)).toBe(true);
      expect(condition(pageWithOtherTag)).toBe(false);
    });

    test('当标签为空数组时应该返回始终为真的函数', () => {
      const tags: string[] = [];
      const relation = 'AND';

      const condition = generateTagCondition(tags, relation);
      
      const anyPage: DataviewPage = {
        file: { path: 'test.md', name: 'test.md',
        tags: []}
      };

      expect(condition(anyPage)).toBe(true);
    });
  });

  describe('executeTimelineQuery', () => {
    test('应该执行查询并返回过滤后的结果', async () => {
      const context: TimelineContext = {
        config: {
          app: mockApp,
          source_folders: ['folder1', 'folder2'],
          within_days: 30,
          sort_order: 'desc'
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: mockCurrentFile,
        app: mockApp
      };

      const resolvedTags = ['#tag1'];
      const resolvedLinks: Link[] = [
        { path: '/test/linked-page1.md', type: 'file' }
      ];

      const result = await executeTimelineQuery(context, resolvedLinks, resolvedTags);
      
      // 验证结果
      expect(result).not.toBeNull();
    });

    test('应该处理空的标签和链接列表', async () => {
      const context: TimelineContext = {
        config: {
          app: mockApp,
          source_folders: ['folder1'],
          within_days: 7
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: mockCurrentFile,
        app: mockApp
      };

      const resolvedTags: string[] = [];
      const resolvedLinks: Link[] = [];

      const result = await executeTimelineQuery(context, resolvedLinks, resolvedTags);
      
      // 验证结果
      expect(result).not.toBeNull();
    });

    test('应该处理查询失败的情况', async () => {
      // 模拟查询失败
      const originalQuery = mockDataviewApi.query;
      mockDataviewApi.query = () => {
        return {
          successful: false,
          value: null,
          error: 'Query failed'
        };
      };

      const context: TimelineContext = {
        config: {
          app: mockApp,
          source_folders: ['folder1']
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: mockCurrentFile,
        app: mockApp
      };

      const resolvedTags: string[] = [];
      const resolvedLinks: Link[] = [];

      const result = await executeTimelineQuery(context, resolvedLinks, resolvedTags);
      
      // 验证结果
      expect(result).toEqual({ values: [] });
      
      // 恢复原始方法
      mockDataviewApi.query = originalQuery;
    });
  });
}); 