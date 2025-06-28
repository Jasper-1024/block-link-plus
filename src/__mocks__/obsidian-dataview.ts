import { App } from 'obsidian';

export interface Link {
  path: string;
  type: string;
  display?: string;
  embed?: boolean;
}

export class DataviewApi {
  app: App;
  private pages: Record<string, any> = {};

  constructor() {
    this.app = null as any;
  }

  // 模拟添加页面数据的方法（仅用于测试）
  _addPage(pageData: any) {
    const path = pageData.file?.path || '';
    this.pages[path] = pageData;
  }

  // 模拟 page 方法，返回指定路径的页面数据
  page(path: string) {
    return this.pages[path] || null;
  }

  // 模拟 fileLink 方法，创建链接对象
  fileLink(path: string, display?: string): Link {
    return {
      path,
      type: 'file',
      display,
      embed: false
    };
  }

  // 模拟查询方法
  query(query: string): any {
    return {
      successful: true,
      value: []
    };
  }
} 