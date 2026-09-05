# 内联编辑 (Inline Edit)

在 Live Preview 中直接编辑嵌入内容，无需跳转到源文件。

## 开启

设置 → Block Link Plus → Inline Edit：
- `inlineEditEnabled`（总开关）
- `inlineEditFile` / `inlineEditHeading` / `inlineEditBlock`

也可以通过命令面板执行 `Toggle Inline Edit`（`mk-flow-editor`）快速开关 `inlineEditEnabled`。

## 用法

使用原生嵌入语法：

```markdown
![[笔记]]
![[笔记#标题]]
![[笔记#^blockId]]
![[笔记#^id-id]]
```

Reading 模式始终只读。

## 在当前文件中搜索

启用 Inline Edit 后，在普通 Markdown 文件的 Live Preview 中按 `Ctrl+F`（macOS：`Cmd+F`），可以查找正文以及已挂载的内联嵌入内容，包括块、标题和文件嵌入。

- 使用查找栏的上一项/下一项浏览结果；嵌入内的匹配只滚动和高亮，不会自动进入编辑或跳转到源文件。
- 焦点保留在查找栏，便于继续输入；按 `Escape` 关闭查找并清除搜索高亮。
- 这是当前文件内查找，不是全库搜索，也不是 Outliner 专用搜索。阅读模式保持 Obsidian 原有行为。

## 说明

- 旧版 `!![[...]]` 语法已移除，请改用 `![[...]]`。
