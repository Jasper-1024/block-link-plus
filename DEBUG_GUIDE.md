# Obsidian 插件调试指南 (WSL2 环境)

## 🚀 快速开始

### 1. 构建调试版本

```bash
npm install
npm run build
npm run dev
# 使用专门的调试构建脚本
npm run debug
```

这将：
- 生成内联 source maps
- 禁用代码压缩
- 启用调试模式
- 保持函数名称

### 2. 启动 Obsidian 调试模式

在 WSL2 终端中运行：
```bash
obsidian --remote-debugging-port=9222
```

### 3. 连接 VS Code 调试器

1. 打开 VS Code 的调试面板 (`Ctrl+Shift+D`)
2. 选择 "Attach to Obsidian in WSL2"
3. 点击绿色的启动按钮

### 4. 验证连接

在 VS Code 调试控制台中输入：
```javascript
location.href
// 应该显示: "app://obsidian.md/index.html"

$plugin
// 应该显示插件实例
```

## 🔧 调试工具

### 全局调试对象

调试版本会自动注册全局调试对象：
```javascript
// 在调试控制台中可以直接使用
window.debug      // 调试工具类
window.$plugin    // 插件实例
```

### 代码中使用调试工具

```typescript
import { DebugUtils } from './utils/debug';

// 条件断点
DebugUtils.break(someCondition, "检查条件");

// 带堆栈跟踪的日志
const result = DebugUtils.log("处理结果", data);

// 监控函数执行
const monitoredFunction = DebugUtils.monitor(myFunction, "函数名");
```

## 🎯 设置断点

### 1. 在源代码中设置断点

直接在 TypeScript 源文件中点击行号设置断点：
```typescript
// src/basics/flow/markdownPost.tsx
export function processMultilineEmbed(
  dom: HTMLElement,
  ctx: MarkdownPostProcessorContext,
  plugin: BlockLinkPlus,
  app: App,
  showEditIcon: boolean
) {
  debugger;  // 或者点击这一行的行号
  let embedLink = dom.getAttribute('src');
  // ...
}
```

### 2. 使用条件断点

```typescript
// 只在特定条件下断点
DebugUtils.break(embedLink?.includes('-'), "多行嵌入链接");
```

## 🔍 常用调试命令

### 在调试控制台中使用：

```javascript
// 获取当前文件
debug.getCurrentFile()

// 获取所有多行 embed 块
debug.getMultilineEmbeds()

// 强制重新渲染
debug.forceRerender()

// 获取所有插件信息
debug.getAllPlugins()

// 获取当前文档的 embed 链接
debug.getCurrentEmbedLinks()

// 导出调试信息
debug.exportDebugInfo()
```

### Obsidian API 调试

```javascript
// 获取当前活动文件
app.workspace.getActiveFile()

// 查找所有多行 block
$$('.internal-embed').filter(el => el.getAttribute('src')?.includes('-'))

// 触发编辑器重新渲染
app.workspace.activeLeaf.view.editor.cm.dispatch()

// 查看插件实例
app.plugins.plugins['obsidian-block-link-plus']
```

## 🐛 故障排除

### 断点不生效

1. 确认使用的是 `npm run debug` 构建
2. 检查 source map 是否正确生成
3. 在调试控制台运行：
   ```javascript
   console.log(Array.from(document.scripts).map(s => s.src));
   ```

### 无法连接调试器

1. 确认 Obsidian 是否使用正确的调试端口启动
2. 检查防火墙设置
3. 重新启动 Obsidian 和 VS Code

### Source Map 路径问题

如果断点位置不对，可能需要调整 `.vscode/launch.json` 中的 `sourceMapPathOverrides`：
```json
{
  "sourceMapPathOverrides": {
    "app://obsidian.md/.obsidian/plugins/obsidian-block-link-plus/*": "${workspaceFolder}/*",
    "app://obsidian.md/*": "${workspaceFolder}/*"
  }
}
```

## 📝 调试技巧

### 1. 使用条件断点

```typescript
// 只在特定条件下断点
if (someCondition) {
  debugger;
}
```

### 2. 日志调试

```typescript
// 使用调试工具类的增强日志
DebugUtils.log("数据处理", { input, output, timestamp: Date.now() });
```

### 3. 性能监控

```typescript
// 包装函数以监控性能
const optimizedFunction = DebugUtils.monitor(expensiveFunction, "性能测试");
```

### 4. 实时调试

在调试控制台中可以实时修改插件行为：
```javascript
// 临时修改设置
$plugin.settings.someOption = true;

// 触发特定功能
$plugin.flowEditorManager.openFlow();
```

## 🎨 调试模式特性

开发模式下的特殊功能：
- 全局调试对象自动注册
- 详细的错误堆栈跟踪
- 性能监控工具
- 内联 source maps
- 未压缩的代码

## ⚙️ 配置文件

### `.vscode/launch.json`
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "attach",
      "name": "Attach to Obsidian in WSL2",
      "port": 9222,
      "webRoot": "${workspaceFolder}",
      "sourceMaps": true,
      "sourceMapPathOverrides": {
        "app://obsidian.md/.obsidian/plugins/obsidian-block-link-plus/*": "${workspaceFolder}/*",
        "app://obsidian.md/*": "${workspaceFolder}/*"
      },
      "trace": true,
      "verboseDiagnosticOutput": true
    }
  ]
}
```

### `package.json` 脚本
```json
{
  "scripts": {
    "debug": "node esbuild.debug.mjs",
    "dev": "node esbuild.config.mjs",
    "build": "node esbuild.config.mjs production"
  }
}
```

## 🏁 完整调试流程

1. **构建调试版本**：`npm run debug`
2. **启动 Obsidian**：`obsidian --remote-debugging-port=9222`
3. **连接调试器**：VS Code 中选择调试配置并启动
4. **设置断点**：在源代码中点击行号
5. **触发调试**：在 Obsidian 中执行相关操作
6. **使用调试工具**：在控制台中使用 `debug` 对象

现在您可以在 WSL2 环境下高效地调试您的 Obsidian 插件了！ 