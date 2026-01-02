# 内嵌编辑 (Inline Edit)

在 Live Preview 中直接编辑嵌入内容，无需跳转到源文件。

## 开启

设置 → Block Link Plus → Inline Edit：
- `inlineEditEnabled`（总开关）
- `inlineEditFile` / `inlineEditHeading` / `inlineEditBlock`

## 用法

使用原生嵌入语法：

```markdown
![[笔记]]
![[笔记#标题]]
![[笔记#^blockId]]
![[笔记#^startId-endId]]
```

Reading 模式始终只读。

## 说明

- 旧版双感叹号嵌入语法已忽略（不会触发内嵌编辑）。
