/**
 * 创建模拟的 BlockLinkPlus 插件实例
 * 用于测试中快速创建插件实例
 */
import { App } from 'obsidian';
import BlockLinkPlus from 'main';
import { PluginSettings, DEFAULT_SETTINGS } from '../types';

/**
 * 创建模拟的 BlockLinkPlus 插件实例
 * @param app 模拟的 App 实例，如果未提供则创建一个新的
 * @param settings 插件设置，如果未提供则使用默认设置
 * @returns 模拟的 BlockLinkPlus 插件实例
 */
export function createMockPlugin(
  app?: App,
  settings?: Partial<PluginSettings>
): BlockLinkPlus {
  // 创建 App 实例（如果未提供）
  const mockApp = app || new App();
  
  // 创建插件清单
  const manifest = {
    id: 'block-link-plus',
    name: 'Block Link Plus',
    version: '1.4.0',
    minAppVersion: '0.15.0',
    description: 'Mock plugin for testing',
    author: 'Test',
    authorUrl: 'https://example.com',
    isDesktopOnly: false
  };
  
  // 创建插件实例
  const plugin = new BlockLinkPlus(mockApp, manifest);
  
  // 设置插件设置
  plugin.settings = {
    ...DEFAULT_SETTINGS,
    ...settings
  };
  
  // 模拟 loadData 方法
  plugin.loadData = async () => {
    return plugin.settings;
  };
  
  // 模拟 saveData 方法
  plugin.saveData = async () => {
    return;
  };
  
  return plugin;
} 