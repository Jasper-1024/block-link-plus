/**
 * Dataview API 模拟
 * 这个文件模拟了 Dataview API 中常用的类和接口，用于测试
 */
import { App } from 'obsidian';

// Link 类型定义
export interface Link {
  path: string;
  subpath?: string;
  display?: string;
  embed?: boolean;
  type?: string;
}

// DataArray 类
export class DataArray<T> {
  values: T[];

  constructor(values: T[] = []) {
    this.values = values;
  }

  where(predicate: (item: T) => boolean): DataArray<T> {
    return new DataArray<T>(this.values.filter(predicate));
  }

  map<U>(mapper: (item: T) => U): DataArray<U> {
    return new DataArray<U>(this.values.map(mapper));
  }

  filter(predicate: (item: T) => boolean): DataArray<T> {
    return this.where(predicate);
  }

  sort(comparator: (a: T, b: T) => number): DataArray<T> {
    const sorted = [...this.values].sort(comparator);
    return new DataArray<T>(sorted);
  }

  groupBy<K>(keyFunc: (item: T) => K): Map<K, DataArray<T>> {
    const groups = new Map<K, DataArray<T>>();
    for (const item of this.values) {
      const key = keyFunc(item);
      if (!groups.has(key)) {
        groups.set(key, new DataArray<T>([]));
      }
      groups.get(key)?.values.push(item);
    }
    return groups;
  }

  // 数组兼容方法
  forEach(callback: (item: T, index: number, array: T[]) => void): void {
    this.values.forEach(callback);
  }

  get length(): number {
    return this.values.length;
  }

  [Symbol.iterator](): Iterator<T> {
    return this.values[Symbol.iterator]();
  }
}

// Page 类型
export interface Page {
  file: {
    path: string;
    name: string;
    basename: string;
    extension: string;
    frontmatter?: any;
  };
  tags: string[];
  links: Link[];
  [key: string]: any;
}

// Dataview API 类
export class DataviewApi {
  private _pagesList: Page[] = [];
  app: App;
  luxon: any = {
    DateTime: {
      now: () => ({
        minus: (obj: any) => new Date(Date.now() - (obj.days || 0) * 24 * 60 * 60 * 1000)
      })
    }
  };

  constructor(pages: Page[] = []) {
    this._pagesList = pages;
    this.app = null as any;
  }

  // 为测试添加页面
  _addPage(page: Page): void {
    this._pagesList.push(page);
  }

  // 清除所有页面
  _clear(): void {
    this._pagesList = [];
  }

  // API 方法
  page(path: string): Page | null {
    return this._pagesList.find(p => p.file.path === path) || null;
  }

  pages(source?: string | string[]): DataArray<Page> {
    if (!source) {
      return new DataArray<Page>(this._pagesList);
    }

    if (typeof source === 'string') {
      // 简单的文件夹过滤
      return new DataArray<Page>(
        this._pagesList.filter(p => p.file.path.startsWith(source))
      );
    } else {
      // 多文件夹过滤
      return new DataArray<Page>(
        this._pagesList.filter(p => source.some(s => p.file.path.startsWith(s)))
      );
    }
  }

  // 日期相关方法
  date(dateString: string): Date {
    return new Date(dateString);
  }

  duration(amount: number, unit: string): number {
    const units: Record<string, number> = {
      second: 1000,
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    };
    return amount * (units[unit] || 0);
  }

  // 链接相关方法
  fileLink(path: string, display?: string): Link {
    return {
      path,
      display,
      type: 'file',
      embed: false
    };
  }

  // 查询方法
  query(queryString: string): { successful: boolean; value: any; error?: string } {
    // 在测试中，我们通常会模拟这个方法的返回值
    return {
      successful: true,
      value: this._pagesList
    };
  }
} 