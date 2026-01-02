/**
 * filter-resolver.ts 的测试文件
 */
import { resolveTags, resolveLinks } from '../filter-resolver';
import { App, TFile } from 'obsidian';
import { DataviewApi, Link, Page } from '../../../../__mocks__/obsidian-dataview';
import { TimelineContext, TimelineConfig } from '../index';

describe('filter-resolver', () => {
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
    mockCurrentFile.name = 'current-file.md';
    
    // 模拟 dataviewApi.page 方法
    mockDataviewApi._addPage({
      file: {
        path: '/test/current-file.md',
        name: 'current-file.md',
        basename: 'current-file',
        extension: 'md',
        frontmatter: {
          tags: ['frontmatter-tag1', 'frontmatter-tag2', 'excluded-tag'],
          categories: ['category1', 'category2']
        }
      },
      tags: ['#test', '#sample'],
      links: []
    } as Page);
    
    // 模拟 metadataCache.getFirstLinkpathDest 方法
    mockApp.metadataCache = {
      getFirstLinkpathDest: (linkpath: string) => {
        if (linkpath === 'existing-file') {
          const file = new TFile();
          file.path = '/test/existing-file.md';
          return file;
        }
        if (linkpath === 'current-file') {
          return mockCurrentFile;
        }
        return null;
      }
    } as any;
    
    // 将 dataviewApi 添加到 app
    mockDataviewApi.app = mockApp;
  });

  describe('resolveTags', () => {
    test('应该返回空数组，当没有配置标签过滤器时', () => {
      const context: TimelineContext = {
        config: {
          app: mockApp
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: mockCurrentFile,
        app: mockApp
      };

      const result = resolveTags(context);
      expect(result).toEqual([]);
    });

    test('应该正确处理显式标签', () => {
      const context: TimelineContext = {
        config: {
          app: mockApp,
          filters: {
            tags: {
              items: ['tag1', '#tag2', 'tag3'],
              relation: 'AND'
            }
          }
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: mockCurrentFile,
        app: mockApp
      };

      const result = resolveTags(context);
      expect(result).toEqual(['#tag1', '#tag2', '#tag3']);
    });

    test('应该从前置元数据中获取标签', () => {
      const context: TimelineContext = {
        config: {
          app: mockApp,
          filters: {
            tags: {
              from_frontmatter: {
                key: 'tags'
              }
            }
          }
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: mockCurrentFile,
        app: mockApp
      };

      const result = resolveTags(context);
      expect(result).toContain('#frontmatter-tag1');
      expect(result).toContain('#frontmatter-tag2');
      expect(result).toContain('#excluded-tag');
    });

    test('应该从前置元数据中获取标签并排除指定标签', () => {
      const context: TimelineContext = {
        config: {
          app: mockApp,
          filters: {
            tags: {
              from_frontmatter: {
                key: 'tags',
                exclude: ['excluded-tag']
              }
            }
          }
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: mockCurrentFile,
        app: mockApp
      };

      const result = resolveTags(context);
      expect(result).toContain('#frontmatter-tag1');
      expect(result).toContain('#frontmatter-tag2');
      expect(result).not.toContain('#excluded-tag');
    });

    test('应该合并显式标签和前置元数据标签', () => {
      const context: TimelineContext = {
        config: {
          app: mockApp,
          filters: {
            tags: {
              items: ['explicit-tag'],
              from_frontmatter: {
                key: 'tags',
                exclude: ['excluded-tag']
              }
            }
          }
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: mockCurrentFile,
        app: mockApp
      };

      const result = resolveTags(context);
      expect(result).toContain('#explicit-tag');
      expect(result).toContain('#frontmatter-tag1');
      expect(result).toContain('#frontmatter-tag2');
      expect(result).not.toContain('#excluded-tag');
    });

    test('应该处理前置元数据中的字符串标签列表', () => {
      // 模拟一个带有字符串标签列表的页面
      mockDataviewApi._addPage({
        file: {
          path: '/test/string-tags.md',
          name: 'string-tags.md',
          basename: 'string-tags',
          extension: 'md',
          frontmatter: {
            tags: 'tag1, tag2, tag3'
          }
        },
        tags: [],
        links: []
      } as Page);

      const stringTagsFile = new TFile();
      stringTagsFile.path = '/test/string-tags.md';

      const context: TimelineContext = {
        config: {
          app: mockApp,
          filters: {
            tags: {
              from_frontmatter: {
                key: 'tags'
              }
            }
          }
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: stringTagsFile,
        app: mockApp
      };

      const result = resolveTags(context);
      expect(result).toEqual(['#tag1', '#tag2', '#tag3']);
    });
  });

  describe('resolveLinks', () => {
    test('应该返回空数组，当没有配置链接过滤器时', () => {
      const context: TimelineContext = {
        config: {
          app: mockApp
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: mockCurrentFile,
        app: mockApp
      };

      const result = resolveLinks(context);
      expect(result).toEqual([]);
    });

    test('应该正确处理显式链接', () => {
      const context: TimelineContext = {
        config: {
          app: mockApp,
          filters: {
            links: {
              items: ['existing-file', 'non-existing-file'],
              relation: 'AND'
            }
          }
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: mockCurrentFile,
        app: mockApp
      };

      const result = resolveLinks(context);
      expect(result.length).toBe(2);
      expect(result[0].path).toBe('/test/existing-file.md');
      expect(result[1].path).toBe('non-existing-file');
    });

    test('应该处理 wiki 链接语法', () => {
      const context: TimelineContext = {
        config: {
          app: mockApp,
          filters: {
            links: {
              items: ['[[existing-file]]', '[[non-existing-file]]'],
              relation: 'AND'
            }
          }
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: mockCurrentFile,
        app: mockApp
      };

      const result = resolveLinks(context);
      expect(result.length).toBe(2);
      expect(result[0].path).toBe('/test/existing-file.md');
      expect(result[1].path).toBe('non-existing-file');
    });

    test('应该添加当前文件的链接，当 link_to_current_file 为 true 时', () => {
      const context: TimelineContext = {
        config: {
          app: mockApp,
          filters: {
            links: {
              link_to_current_file: true
            }
          }
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: mockCurrentFile,
        app: mockApp
      };

      const result = resolveLinks(context);
      expect(result.length).toBe(1);
      expect(result[0].path).toBe('/test/current-file.md');
    });

    test('应该合并显式链接和当前文件链接', () => {
      const context: TimelineContext = {
        config: {
          app: mockApp,
          filters: {
            links: {
              items: ['existing-file'],
              link_to_current_file: true
            }
          }
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: mockCurrentFile,
        app: mockApp
      };

      const result = resolveLinks(context);
      expect(result.length).toBe(2);
      expect(result[0].path).toBe('/test/existing-file.md');
      expect(result[1].path).toBe('/test/current-file.md');
    });

    test('应该去重重复的链接', () => {
      const context: TimelineContext = {
        config: {
          app: mockApp,
          filters: {
            links: {
              items: ['existing-file', 'existing-file', 'another-file'],
              link_to_current_file: false
            }
          }
        } as TimelineConfig,
        dataviewApi: mockDataviewApi,
        currentFile: mockCurrentFile,
        app: mockApp
      };

      const result = resolveLinks(context);
      expect(result.length).toBe(2);
      expect(result[0].path).toBe('/test/existing-file.md');
      expect(result[1].path).toBe('another-file');
    });
  });
}); 
