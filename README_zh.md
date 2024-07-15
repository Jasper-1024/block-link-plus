# Obsidian Block Link Plus

[copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link/tree/main) 是我使用频率最高的插件, 但是它始终没有支持多行文本块的创建, 于是我尝试编写了 block-link-plus. block-link-plus 支持了多行文本块的创建, 并对 block ID 更多的自定义.

## 使用

使用上与 [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link/tree/main) 完全相同, 

## 功能

### 多行文本块

多行文本这里专指: 选中文本中没有任何标题的多行内容.

Obsidian 的块引用尚未支持多行文本块的创建, block-link-plus 使用了两种方式变通.

第一种是使用 heading: 将选中文本添加到一个新的 heading 中, 并拷贝指向 heading 的链接.
- 使用 `˅id` 和正常 heading 区分
- 修改 阅读模式 和 实时预览下 `## ˅id` 的渲染,使其更加类似普通的块引用.

```bash
## ˅id
abc
def
## ^id

[[file#˅id]]
```

第二种创建多个块引用: 批量创建多组块引用并拷贝到剪贴板.
- 此功能来自 @[Text Transporter](https://github.com/TfTHacker/obsidian42-text-transporter)

```bash
abc ^id1

def ^id2

gh ^id3

[[file#^id1]]
[[file#^id2]]
[[file#^id3]]
```

### 自定义 Block ID

Block ID = 前缀-随机字符
- 自定义 block ID 的前缀 和 随机字符的长度(3-7)

现在这个功能尚未有更多的实际用途, 或许可以通过 block ID 的前缀进行更多的聚合操作.

## License

Block Link Plus is released under GNU GPLv3 (License).

## Thanks

Block Link Plus 是我第一个 obsidian 插件,开发过程中参考了大量已有的插件,感谢这些开源项目.
- [copy-block-link](https://github.com/mgmeyers/obsidian-copy-block-link/tree/main)
- [Text Transporter](https://tfthacker.com/transporter)
- [rendered-block-link-suggestions](https://github.com/RyotaUshio/obsidian-rendered-block-link-suggestions)
- [linkify](https://github.com/matthewhchan/linkify)