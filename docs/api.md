# API参考

Block Link Plus 提供的编程接口。

## 全局API

插件在 `window.BlockLinkPlus` 注册全局对象（插件实例）：

```javascript
// 获取插件实例
const plugin = window.BlockLinkPlus;
```

## 可用方法

### Inline Edit（兼容 API）
```javascript
// 兼容旧版 API：当前版本中不再“打开/关闭 Flow Editor UI”，通常为 no-op
plugin.api.openFlowEditor();

// 同上
plugin.api.closeFlowEditor();

// 检查是否启用 Inline Edit（对应设置 inlineEditEnabled）
const isEnabled = plugin.api.isFlowEnabled();
```

### 设置管理
```javascript
// 获取当前设置
const settings = plugin.api.getSettings();

// 更新设置
await plugin.api.updateSettings({
    mult_line_handle: 1,
    alias_type: 2
});
```

### 编辑器访问
```javascript
// 获取当前编辑器实例（CodeMirror；可能为空）
const editor = plugin.api.getActiveEditor();

// 获取路径操作器
const enactor = plugin.api.getEnactor();
```

## 设置接口

```typescript
interface PluginSettings {
    mult_line_handle: number;
    alias_type: number;
    enable_right_click_block: boolean;
    alias_length: number;
    enable_prefix: boolean;
    id_prefix: string;
    id_length: number;
    // ... 其他设置项（详见文档：参考 → 设置）
}
```

## 注意事项

- API为实验性功能，可能在版本更新中变化
- 仅在插件加载后可用
- 建议检查方法存在性后再调用

## 示例用法

```javascript
// 检查插件是否可用
if (window.BlockLinkPlus) {
    const plugin = window.BlockLinkPlus;
    
    // 获取设置
    const settings = plugin.api.getSettings();
    console.log('当前别名长度:', settings.alias_length);
    
    // 修改设置
    await plugin.api.updateSettings({
        alias_length: 30
    });
}
```

## TODO

- 详细的类型定义
- 更多操作方法
- 事件监听机制
- 完整的开发示例

更多API信息请关注 [GitHub Issues](https://github.com/Jasper-1024/obsidian-block-link-plus/issues)。
