/**
 * Obsidian API 模拟
 * 这个文件模拟了 Obsidian API 中常用的类和接口，用于测试
 */

// 基本类型定义
export interface Position {
  line: number;
  col: number;
  offset: number;
}

export interface Range {
  from: Position;
  to: Position;
}

// 元数据相关
export interface HeadingCache {
  heading: string;
  level: number;
  position: {
    start: Position;
    end: Position;
  };
}

export interface TagCache {
  tag: string;
  position: {
    start: Position;
    end: Position;
  };
}

export interface LinkCache {
  link: string;
  displayText?: string;
  position: {
    start: Position;
    end: Position;
  };
}

export interface FrontmatterCache {
  [key: string]: any;
  position: {
    start: Position;
    end: Position;
  };
}

export interface CachedMetadata {
  headings?: HeadingCache[];
  tags?: TagCache[];
  links?: LinkCache[];
  frontmatter?: FrontmatterCache;
}

// 文件相关
export class TFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
  stat: {
    ctime: number;
    mtime: number;
    size: number;
  };

  constructor(path: string) {
    this.path = path;
    const parts = path.split('/');
    this.name = parts[parts.length - 1];
    const nameParts = this.name.split('.');
    this.extension = nameParts.pop() || '';
    this.basename = nameParts.join('.');
    this.stat = {
      ctime: Date.now(),
      mtime: Date.now(),
      size: 0
    };
  }
}

// Vault 类模拟
export class Vault {
  private files: Map<string, string> = new Map();

  async read(file: TFile): Promise<string> {
    const content = this.files.get(file.path);
    if (content === undefined) {
      throw new Error(`File not found: ${file.path}`);
    }
    return content;
  }

  async modify(file: TFile, data: string): Promise<void> {
    this.files.set(file.path, data);
  }

  getFiles(): TFile[] {
    return Array.from(this.files.keys()).map(path => new TFile(path));
  }

  // 用于测试的辅助方法
  _addFile(path: string, content: string): TFile {
    this.files.set(path, content);
    return new TFile(path);
  }
}

// MetadataCache 类模拟
export class MetadataCache {
  private cache: Map<string, CachedMetadata> = new Map();

  getFileCache(file: TFile): CachedMetadata | null {
    return this.cache.get(file.path) || null;
  }

  // 用于测试的辅助方法
  _setFileCache(file: TFile, metadata: CachedMetadata): void {
    this.cache.set(file.path, metadata);
  }
}

// App 类模拟
export class App {
  vault: Vault;
  metadataCache: MetadataCache;
  workspace: {
    activeLeaf?: {
      view: any;
    };
    on: any;
  };
  plugins: {
    plugins: Record<string, any>;
  };

  constructor() {
    this.vault = new Vault();
    this.metadataCache = new MetadataCache();
    this.workspace = {
      activeLeaf: undefined,
      on: function() { return null; }
    };
    this.plugins = {
      plugins: {}
    };
  }
}

// Plugin 类模拟
export abstract class Plugin {
  app: App;
  manifest: {
    id: string;
    name: string;
    version: string;
    minAppVersion: string;
    description: string;
    author: string;
    authorUrl: string;
    isDesktopOnly: boolean;
  };

  constructor(app: App, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  addCommand(command: any): void {}
  
  registerMarkdownPostProcessor(processor: any): void {}
  
  registerMarkdownCodeBlockProcessor(language: string, processor: any): void {}
  
  registerEvent(event: any): void {}
  
  registerEditorExtension(extension: any[]): void {}
  
  loadData(): Promise<any> {
    return Promise.resolve({});
  }
  
  saveData(data: any): Promise<void> {
    return Promise.resolve();
  }
  
  addSettingTab(tab: any): void {}
}

// 编辑器相关
export class Editor {
  private content: string = '';
  private cursor: number = 0;

  getValue(): string {
    return this.content;
  }

  setValue(value: string): void {
    this.content = value;
  }

  getCursor(): Position {
    return {
      line: 0,
      col: this.cursor,
      offset: this.cursor
    };
  }

  setCursor(pos: Position): void {
    this.cursor = pos.offset;
  }

  getLine(line: number): string {
    return this.content.split('\n')[line] || '';
  }

  replaceRange(replacement: string, from: Position, to: Position): void {
    const lines = this.content.split('\n');
    const startLine = lines[from.line] || '';
    const endLine = lines[to.line] || '';
    
    const start = startLine.substring(0, from.col);
    const end = endLine.substring(to.col);
    
    lines[from.line] = start + replacement + end;
    
    // 如果跨越多行，需要删除中间的行
    if (from.line !== to.line) {
      lines.splice(from.line + 1, to.line - from.line);
    }
    
    this.content = lines.join('\n');
  }
}

// MarkdownView 类模拟
export class MarkdownView {
  editor: Editor;
  file: TFile | null;
  private mode: 'source' | 'preview' | 'live' = 'source';

  constructor(editor: Editor, file: TFile | null = null) {
    this.editor = editor;
    this.file = file;
  }

  getMode(): 'source' | 'preview' | 'live' {
    return this.mode;
  }

  setMode(mode: 'source' | 'preview' | 'live'): void {
    this.mode = mode;
  }
}

// 其他常用的 Obsidian API 对象和字段
export const MarkdownRenderer = {
  renderMarkdown: function() { return null; }
};

export const editorLivePreviewField = {};

export const MarkdownPostProcessorContext = class {
  sourcePath: string;
  
  constructor(sourcePath: string) {
    this.sourcePath = sourcePath;
  }
};

// 导出一些常用的工具函数
export const normalizePath = (path: string): string => {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/');
};

export const parseLinktext = (linktext: string): { path: string; subpath: string } => {
  const [path, subpath] = linktext.split('#');
  return { path, subpath: subpath || '' };
}; 