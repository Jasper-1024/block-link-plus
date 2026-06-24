# 命令参考

所有可用命令及其用途。

## 块链接（复制到剪贴板）

### Copy Block Link
- **ID**: `copy-link-to-block`
- **功能**: 复制常规块链接 `[[文件#^id]]`
- **快捷键**: 可在设置中自定义

### Copy Block as Embed
- **ID**: `copy-embed-to-block`
- **功能**: 复制嵌入链接 `![[文件#^id]]`
- **快捷键**: 可在设置中自定义

### Copy Block as Obsidian URI
- **ID**: `copy-url-to-block`
- **功能**: 复制URI链接用于外部访问
- **快捷键**: 可在设置中自定义

## 内联编辑（Inline Edit）

### Toggle Inline Edit
- **ID**: `mk-flow-editor`
- **功能**: 快速开关内联编辑（对应设置 `inlineEditEnabled`）
- **说明**: 仅影响嵌入的可编辑性；不影响块链接/Outliner 功能

## Outliner

### Outliner：切换任务状态
- **ID**: `file-outliner-toggle-task-status`
- **功能**: 在 Outliner 视图中切换任务块状态（`[ ]` ↔ `[x]`）
- **默认快捷键**: `Mod+Enter`

### Outliner：切换任务标记
- **ID**: `file-outliner-toggle-task-marker`
- **功能**: 在普通块 / 任务块之间切换（`- ...` ↔ `- [ ] ...`）
- **默认快捷键**: `Mod+Shift+Enter`

## 使用方式

### 命令面板
1. 按 `Ctrl+P` 打开命令面板
2. 搜索命令名称
3. 回车执行

### 快捷键
1. 进入设置 → 快捷键
2. 搜索 "Block Link Plus"
3. 为常用命令设置快捷键

### 建议快捷键

```
Ctrl+Shift+B  → Copy Block Link
Ctrl+Shift+E  → Copy Block as Embed
Ctrl+Shift+U  → Copy Block as URI
```

## 执行条件

- Copy Block*：需要在 Markdown 编辑器中，且有选区或光标位于可解析的块/标题位置
- Outliner*：需要当前激活视图为 Outliner（否则命令不会生效/不会显示）
- 右键菜单项可在设置中关闭，但命令面板/快捷键仍可使用
