/**
 * 创建模拟的 Dataview API 实例
 * 用于测试中快速创建 Dataview API
 */
import { DataviewApi, Page } from '../../__mocks__/obsidian-dataview';
import { App, TFile } from 'obsidian';

/**
 * 创建模拟的 Dataview API 实例
 * @param app 模拟的 App 实例
 * @param pages 初始页面数据（可选）
 * @returns 模拟的 DataviewApi 实例
 */
export function createMockDataviewApi(
  app: App,
  pages: Page[] = []
): DataviewApi {
  // 创建 DataviewApi 实例
  const api = new DataviewApi(pages);
  
  // 将 Dataview API 添加到 app.plugins.plugins 中
  app.plugins.plugins.dataview = {
    api
  };
  
  return api;
}

/**
 * 从 TFile 创建 Dataview Page 对象
 * @param file Obsidian TFile 对象
 * @param tags 标签列表（可选）
 * @param links 链接列表（可选）
 * @param additionalProps 其他属性（可选）
 * @returns Dataview Page 对象
 */
export function createPageFromFile(
  file: TFile,
  tags: string[] = [],
  links: { path: string; subpath?: string; display?: string }[] = [],
  additionalProps: Record<string, any> = {}
): Page {
  return {
    file: {
      path: file.path,
      name: file.name,
      basename: file.basename,
      extension: file.extension
    },
    tags,
    links,
    ...additionalProps
  };
} 