import { App, Plugin } from 'obsidian';

export class DebugUtils {
  private static plugin: Plugin;
  
  /**
   * 初始化调试工具
   * @param plugin 插件实例
   */
  static init(plugin: Plugin) {
    this.plugin = plugin;
    
    // 在开发模式下，将调试工具添加到全局对象
    if (process.env.NODE_ENV === 'development') {
      (window as any).debug = this;
      (window as any).$plugin = plugin;
      console.log('🔧 Debug mode enabled. Access via window.debug');
    }
  }

  /**
   * 条件断点
   * @param condition 条件，为 true 时触发断点
   * @param message 可选的消息
   */
  static break(condition: boolean = true, message?: string) {
    if (condition) {
      if (message) {
        console.log(`🔍 Debug break: ${message}`);
      }
      debugger;
    }
  }

  /**
   * 带有堆栈跟踪的日志
   * @param label 标签
   * @param data 数据
   * @returns 返回原始数据，支持链式调用
   */
  static log<T>(label: string, data: T): T {
    console.group(`🔍 ${label}`);
    console.log(data);
    console.trace();
    console.groupEnd();
    return data;
  }

  /**
   * 监控函数执行
   * @param fn 要监控的函数
   * @param label 标签
   * @returns 包装后的函数
   */
  static monitor<T extends (...args: any[]) => any>(fn: T, label: string): T {
    return ((...args: any[]) => {
      console.log(`🚀 ${label} - 开始执行`, args);
      const start = performance.now();
      
      try {
        const result = fn(...args);
        const end = performance.now();
        console.log(`✅ ${label} - 执行完成 (${(end - start).toFixed(2)}ms)`, result);
        return result;
      } catch (error) {
        const end = performance.now();
        console.error(`❌ ${label} - 执行失败 (${(end - start).toFixed(2)}ms)`, error);
        throw error;
      }
    }) as T;
  }

  /**
   * 获取当前活动文件信息
   */
  static getCurrentFile() {
    if (!this.plugin?.app) return null;
    return this.plugin.app.workspace.getActiveFile();
  }

  /**
   * 获取所有多行 embed 元素
   */
  static getMultilineEmbeds() {
    return Array.from(document.querySelectorAll('.internal-embed'))
      .filter(el => el.getAttribute('src')?.includes('-'));
  }

  /**
   * 获取插件实例
   */
  static getPlugin() {
    return this.plugin;
  }

  /**
   * 获取 Obsidian App 实例
   */
  static getApp(): App | null {
    return this.plugin?.app || null;
  }

  /**
   * 强制重新渲染当前编辑器
   */
  static forceRerender() {
    const app = this.getApp();
    if (app?.workspace?.activeLeaf?.view) {
      const view = app.workspace.activeLeaf.view;
      if ('editor' in view && view.editor) {
        // 触发重新渲染
        (view.editor as any).cm?.dispatch();
      }
    }
  }

  /**
   * 获取所有已加载的插件
   */
  static getAllPlugins() {
    const app = this.getApp();
    if (!app) return null;
    
    return {
      enabled: app.plugins.enabledPlugins,
      plugins: app.plugins.plugins
    };
  }

  /**
   * 检查某个插件是否启用
   */
  static isPluginEnabled(pluginId: string) {
    const app = this.getApp();
    return app?.plugins?.enabledPlugins?.has(pluginId) || false;
  }

  /**
   * 获取当前文档的所有 embed 链接
   */
  static getCurrentEmbedLinks() {
    const embeds = document.querySelectorAll('.internal-embed');
    return Array.from(embeds).map(embed => ({
      element: embed,
      src: embed.getAttribute('src'),
      isMultiline: embed.getAttribute('src')?.includes('-') || false
    }));
  }

  /**
   * 模拟点击某个元素
   */
  static clickElement(selector: string) {
    const element = document.querySelector(selector);
    if (element) {
      (element as HTMLElement).click();
      return true;
    }
    return false;
  }

  /**
   * 导出调试信息
   */
  static exportDebugInfo() {
    return {
      currentFile: this.getCurrentFile(),
      multilineEmbeds: this.getMultilineEmbeds(),
      allPlugins: this.getAllPlugins(),
      embedLinks: this.getCurrentEmbedLinks(),
      timestamp: new Date().toISOString()
    };
  }
}

// 为了向后兼容，保留旧的命名
export const debug = DebugUtils; 