# 块链接

将文本转换为可引用的块，支持四种链接格式。

## 使用方式

### 右键菜单
1. 选中文本
2. 右键选择链接类型

### 命令面板
- `Copy Block Link` - 常规链接
- `Copy Block as Embed` - 嵌入链接
- `Copy Block as Editable Embed` - 可编辑嵌入
- `Copy Block as Obsidian URI` - URI链接

## 链接格式

| 类型 | 格式 | 用途 |
|------|------|------|
| 常规链接 | `[[文件#^abc123]]` | 普通引用 |
| 嵌入链接 | `![[文件#^abc123]]` | 显示内容 |
| 可编辑嵌入 | `!![[文件#^abc123]]` | 可编辑显示 |
| URI链接 | `obsidian://open?vault=...` | 外部访问 |

## 别名类型

在设置中配置别名生成方式：

- **无别名** - `[[文件#^abc123]]`
- **前X个字符** - `[[文件#^abc123|内容开头...]]`
- **父标题** - `[[文件#^abc123|## 会议记录]]`
- **选中文本** - `[[文件#^abc123|重要段落]]`

## 块ID设置

- **前缀** - 自定义ID前缀如 `meeting-abc123`
- **长度** - 3-7个字符（默认4个）
- **通知** - 复制时显示确认消息

## 标题块

选中标题行时：
- 自动使用标题内容作为链接目标
- 可选择将ID放在新行（实验性功能）