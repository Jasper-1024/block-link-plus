# 命令参考

所有可用命令及其用途。

## 块链接命令

### Copy Block Link
- **ID**: `copy-link-to-block`
- **功能**: 复制常规块链接 `[[文件#^id]]`
- **快捷键**: 可在设置中自定义

### Copy Block as Embed
- **ID**: `copy-embed-to-block`
- **功能**: 复制嵌入链接 `![[文件#^id]]`
- **快捷键**: 可在设置中自定义

### Copy Block as Editable Embed
- **ID**: `copy-editable-embed-to-block`
- **功能**: 复制可编辑嵌入 `!![[文件#^id]]`
- **快捷键**: 可在设置中自定义

### Copy Block as Obsidian URI
- **ID**: `copy-url-to-block`
- **功能**: 复制URI链接用于外部访问
- **快捷键**: 可在设置中自定义

## 时间命令

### Insert Time Section
- **ID**: `insert-time-section`
- **功能**: 插入当前时间作为标题
- **快捷键**: 建议设置为 `Ctrl+T`

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
Ctrl+T        → Insert Time Section
```

## 执行条件

所有命令需要：
- 当前处于编辑模式
- 有文本选中或光标在有效位置
- 对应功能在设置中已启用