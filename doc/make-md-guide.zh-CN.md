# Make.md（make-md）中文完整说明（基于 v1.3.3 源码 + 官方文档）

> 版本基线：Make.md 插件 `1.3.3`（`manifest.json`）。  
> 信息来源：官方文档仓库 `Make-md/makemd-docs` + 插件源码仓库 `Make-md/makemd`（官方文档里标注“Other Features/Basics/Actions/Templates 等未最终定稿”的部分，本文以源码行为为准）。

---

## 0. 先知道这几件事（对“准确使用/同步/备份”很关键）

1) **Make.md 会写入你的 Vault**（不是只读插件）：
- 会在 Vault 根目录和各个被“空间化/自定义”的文件夹里创建/维护一个数据目录（默认叫 `.space`）。
- 会创建若干 `*.mdb` 文件（例如 `views.mdb`、`context.mdb`、`commands.mdb`），用于保存视图/数据库/动作等结构化数据。
- 会在 Markdown 文件的 YAML frontmatter 写入/维护属性（例如 `sticker`、`color`、`banner`、以及 Make.md 的空间元数据键 `_links/_joins/_sort/_template/...` 等）。

2) **同步/版本控制建议**
- 如果你用 Obsidian Sync / Git / WebDAV 等同步：**务必把 `.space/` 以及其中的 `.mdb` 文件一并同步**，否则空间/视图/数据库会丢失或不一致。
- 默认 Make.md 会把 `.mdb`、`_assets`、`_blocks` 当作“隐藏扩展/目录”（见默认设置 `hiddenExtensions`），这不影响同步，但容易让你误以为“没东西”；请确认同步工具没有忽略这些文件。

3) **Make.md 的“链接/嵌入”里有很多是“虚拟路径”**
- 例如 `![![...]]`、`!![[...]]`、以及 `.../#^...`、`.../#*...`、`.../#;...` 这种片段（fragment）是 Make.md 自己的解析/渲染逻辑，不等同于 Obsidian 原生语义；离开 Make.md 这些语法可能只是普通文本或无效链接。

---

## 1. 核心概念（建议先建立这张“脑内地图”）

### 1.1 Superstate（索引与运行时引擎）
- Make.md 启动时会构建一个索引（官方文档称 *Superstate*），把 Vault 中的“路径（Path）”统一索引起来，运行时快速响应变更（重命名、移动、标签变化、属性变化等）。
- Superstate 会缓存，以便下次启动快速加载。

### 1.2 Path（路径）与 Space（空间）
- **Make.md 的一切都用“Path”表示**：文件、文件夹、标签、表、视图、块等都可以变成“可链接”的路径。
- **Space（空间）**可以理解为“某个文件夹/某个标签/整个 Vault 的可视化工作台（Workspace View）”：
  - 文件夹 Space：用文件夹路径表示（例如 `Projects/Alpha` 或 `/` 代表 Vault）。
  - 标签 Space：用 `spaces://#tag` 形式表示（例如 `spaces://#media`、`spaces://#work/project`）。

### 1.3 Context（上下文/数据库）
- Context 是 Make.md 的“数据库层”。每个 Space 都可以拥有一套属性（properties）和若干视图（views）。
- 关键点：
  - **Markdown 文件的属性最终落地在 frontmatter**（并可由 Make.md 控制同步策略）。
  - **非 Markdown 文件的属性**存储在 Context 的数据库文件中（文档称为 SQLite；实现上以 `.mdb` 文件承载）。

### 1.4 View / Frame（视图与帧）
- Make.md 有自己的“视图合成器（view compositor）”：
  - 一个 Space 的主视图由多个 *Frame* 组成（Frame 可以是：列表视图、笔记视图、图片、按钮、分组、列布局等）。
  - 你可以在 Space View 里用“块编辑器”拖拽拼装这些 Frame，从而不用写代码也能做仪表盘/看板。

### 1.5 Flow / Basics（可编辑嵌入与编辑增强）
> README 里提示：Flow Blocks/Flow Styler 目前仍属于 Make.md 的 “Basics”，未来可能拆分成独立插件；但在 `1.3.3` 里它们还在 Make.md 内。

- **Flow Block**：把一个笔记“嵌入到当前笔记里”并提供更顺滑的查看/编辑体验（类似“可编辑嵌入/hover editor”的方向）。
- **Make Menu（默认触发字符 `/`）**：编辑器里的命令菜单，用于快速插入格式、创建 Flow Block、插入 Context/表格等。
- **Inline Context**：在笔记顶部直接显示/编辑该笔记所属 Context 的属性。

---

## 2. 安装与启用（官方流程）

- 在 Obsidian：`Settings -> Community plugins`，搜索并安装 `make.md`，启用即可。
- 建议：第一次使用先在一个“测试 Vault”里试跑，确认 `.space` 与 frontmatter 写入符合你的同步/版本控制习惯。

---

## 3. 数据与文件结构（你会在 Vault 里看到什么）

### 3.1 `.space` 目录会出现在哪里？

1) **Vault 根目录**（默认）：
- `.space/waypoints.json`：Focus/Waypoints（导航聚焦点）配置等。
- `.space/templates/`：全局模板（Global Templates）。
- `.space/kits/`：Kit（渲染模板）数据（例如 `kit.mdb`）。
- `.space/actions/`：动作库（Actions）数据（例如 `commands.mdb`）。

2) **每个被使用/自定义过的文件夹 Space**（默认）：
- `<folder>/.space/def.json`：Space 定义（排序、joins、links、模板等）。
- `<folder>/.space/views.mdb`：Space 视图/Frame 数据。
- `<folder>/.space/context.mdb`：Space 的 Context（数据库）数据。
- `<folder>/.space/commands.mdb`：该 Space 下定义的 Actions（若有）。
- `<folder>/.space/templates/`：该 Space 的模板（把某个笔记/布局保存为模板供本空间快速新建）。

3) **标签 Space 的落地点**
- Make.md 会有一个“标签空间文件夹”（默认设置名通常为 `Tags`，可在设置里改 `spacesFolder`）。
- 标签 Space 的数据落在 `Tags/#tag/...` 之类的目录结构里，并同样包含 `.space/*` 数据文件与一个 `.md` 入口笔记。

### 3.2 `.space` 目录名可以改吗？
- 可以。设置项 `spaceSubFolder` 默认是 `.space`。
- 插件还提供命令 `Move Space Data Folder`（命令面板里），用于迁移/改名。

---

## 4. Organizing Files（组织与导航）

### 4.1 Navigator（导航器）
入口：左侧边栏顶部的 Navigator tab。

Navigator 里最常用的 5 件事：

1) **Focuses（聚焦）**
- 你可以在 Focus 里打开一个文件夹/标签 Space，只看当前工作相关部分。
- 操作：
  - `+ Open` 选择 folder/tag。
  - 拖拽可重排 Focus。
  - 右键 Focus 内条目 `Remove from Focus` 移除。

2) **Blink（快速搜索/快速打开）**
- 命令：`mk-blink`（默认热键 `Mod+o`）。
- 特点：可搜索并“直接编辑”笔记与 Context（取决于你的设置与打开方式）。

3) **在 Space 内拖拽排序**
- Space 里条目支持拖拽排序（rank/顺序会被写入元数据）。

4) **隐藏/取消隐藏**
- 右键任意文件/文件夹 `hide`：从 Navigator 与相关 Space 隐藏。
- 取消隐藏：主菜单 `Manage Hidden Files`（命令 `open-hidden`）里移除隐藏条目。

5) **Pinning（固定/钉住）**
- “钉住”本质上是把条目写入 Space 元数据 `_links`（Pinned Items）。
- 常见入口：
  - 在 Space View / Flow Editor 里点 Pin。
  - 右键笔记 `Pin to a space`。
  - 右键 Space `Add Pin`。
  - 按住 `Shift` 拖拽条目到 Space。
  - 命令 `Pin Active File to Space`（`mk-pin-active`）：把当前文件钉到某个 Space。

### 4.2 Overview（三栏总览）
- Overview 是一个“特殊 Space”，把工作区变成三栏：
  - 左：Space/文件夹选择
  - 中：条目列表
  - 右：笔记预览/打开
- 打开方式：Navigator 主菜单 `Open Overview`（命令 `open-ever-view`）。

### 4.3 Tags（标签空间）
- `Tags` Space 会列出你的所有标签。
- 每个标签也可以成为一个独立 Space，展示打了该标签的条目，并可在其中建立 Context（很适合做“跨文件夹的媒体库/资料库”）。
- 注意：对标签的重命名/删除会作用到全库。

### 4.4 Labels（贴纸/颜色/封面）

1) Stickers（贴纸）
- 给单个条目设贴纸：
  - 在 Navigator 里点条目旁的 sticker 图标选择；或
  - 打开笔记/文件夹，在顶部 `Add Sticker`。
- 给文件夹内所有条目设默认贴纸：
  - 右键文件夹 `Apply to Items -> Default Sticker`。

2) Colors（颜色）
- 右键条目 `Color` 选择颜色（写入 frontmatter 的 `color`，默认键名可配置）。

3) Cover / Banner（封面）
- 打开笔记/文件夹，在顶部 `Add Cover`，支持 `Reposition`。

---

## 5. Lists & Databases（Contexts：数据库与视图）

### 5.1 Context 的定位：它解决什么？
- 让“文件”具备结构化属性，并能以表格/看板/日历/列表等方式查看、过滤、排序、分组。
- 与“只靠文件夹/标签”相比，Context 更像 Notion/Logseq 的数据库体验（但底层仍是 Markdown + frontmatter + `.mdb` 数据）。

### 5.2 创建/启用 Context（基础）
- **每个 Space 默认就有一个 Context**，你可以在 Space View 里找到 Context 视图并开始添加属性。

### 5.3 属性类型（Property Types）
官方文档列出（并在源码中实现）以下常见类型：

- Text：任意文本
- Number：整数/小数
- Date：日期（可配置显示格式）
- Options：下拉选项（可单选/多选，支持 Multi）
- Yes/No：布尔（checkbox）
- Link：链接到笔记（内部链接）
- Image：图片（本地或在线）
- Advanced：Aggregate / Object / Relation / Formula（见 5.6）

提示：
- **Multi（多值）**：不少属性类型可以勾选 Multi，用于存储列表（例如多标签、多作者、多关联项）。
- “导入现有属性”：添加属性时选择 `add existing`，可以一次导入多个已有 frontmatter 字段到 Context。

### 5.4 管理属性显示与顺序
1. 打开 Context Properties
2. 勾选要显示的属性
3. 拖拽调整列/属性顺序

### 5.5 搜索/过滤/排序
- 搜索框可对名称与属性值搜索。
- Filter：不同属性类型对应不同的过滤算子（等于/包含/范围/为空等）。
- Sort：选择字段排序；Space 侧还有 `_sort`（默认按 `rank`）一类排序元数据。

### 5.6 高级属性（Advanced Properties）

#### 5.6.1 Object（对象/嵌套属性）
- Object 允许你定义“嵌套属性结构”（类似 JSON schema）。
- 每行数据都遵循同一套对象结构；也可以使用 Multi Object 表示对象列表。
- 常见用途：事件重复规则、复杂地址结构、多个字段组合等。

#### 5.6.2 Special（特殊类型）
- 目前文档明确提到 **Repeat**（用于日历重复事件）。
- Repeat 通常是一个预定义对象结构，配合 Calendar View 的 repeat 设置使用。

#### 5.6.3 Relation（关系）
- Relation 用于连接两个 Context（两个 Space 的数据库）。
- 支持“两向同步”（在两边都自动添加对应的关联字段），用于构建双向关系网络。

#### 5.6.4 Aggregate（汇总/Rollup）
- 基于 Relation，从关联项里取某个字段并做聚合（Count/Sum/Min/Max/...）。
- 官方文档的聚合函数清单见 `References/Aggregate.md`，源码还额外支持布尔相关汇总（例如完成/未完成/完成率）。
- 常见用法：项目 -> 任务（Relation）后，在项目上 rollup：
  - 任务数量（Count）
  - 已完成数量（Complete）
  - 完成率（Percentage Complete）
  - 最早/最晚截止日期（Earliest/Latest）

#### 5.6.5 Formula（公式）
- 公式基于 `mathjs`，并注入 Make.md 自定义函数（见第 14 章公式速查）。
- `prop("字段名")` 会按字段类型返回“类型化值”（例如 Date 返回 Date；Link 返回路径对象/列表），从而能直接用于日期/列表函数。

### 5.7 属性落地与 frontmatter 同步策略（建议你结合自己的同步/版本控制习惯理解）

Make.md 的 Context 可以理解为“用 UI 管理 frontmatter + 数据库索引/视图层”。一些关键点：

- **Markdown 文件**
  - 默认会把 Context 里编辑的属性写回 YAML frontmatter（设置项：`saveAllContextToFrontmatter`，默认 `true`）。
  - 公式字段的结果也可同步回 frontmatter（`syncFormulaToFrontmatter`，默认 `true`）。
  - 是否隐藏 frontmatter（`hideFrontmatter`，默认 `true`）只影响显示，不等于不写入。
- **非 Markdown 文件**
  - 属性值不会写入 frontmatter（因为没有 frontmatter），会落到该 Space 的 `context.mdb`。
- **创建条目的交互**
  - `Use Modal for Context Item Creation`（`contextCreateUseModal`）：开启后，“新建条目”会弹出表单式 modal，而不是下拉创建。

---

## 6. Context Views（表格/看板/日历/更多）

### 6.1 视图的基本操作
- 切换布局：点击 `Layout` 选择视图类型。
- 保存视图：视图选择器里点 `+`；新视图会复制当前视图配置（过滤/排序/分组）。
- 配置视图：在 configure/options 里改名、改参数。

### 6.2 Table View（表格）
典型能力：
- `+` 添加列/属性
- 拖拽列头调整顺序
- 拖拽列边缘调整宽度
- 隐藏列
- 列汇总（Aggregate）：在列底部显示统计（具体可用的统计类型与字段类型相关）

### 6.3 Board / Kanban（看板）
- 常见做法：把某个 Options/状态字段作为 `Group by`，再用 Card 样式显示。
- 适合：任务流转（Todo/Doing/Done）、内容发布流程、销售漏斗等。

### 6.4 Calendar View（日历）
源码与文档要点：
- 需要至少一个 Date 字段作为开始/结束（某些情况下可复用一个字段）。
- Day/Week 视图可设置展示的起止小时（0–24）。
- 创建事件：
  - Month 视图：双击创建；也可把一个 path 拖进日历自动创建并设置时间。
  - Day/Week：拖拽拉出时间段创建。
- 编辑事件：
  - 拖拽上下移动改变时间；拉伸改变时长。
- 重复事件：
  - 通过 Special -> Repeat 对象字段保存重复规则，并在 Calendar View 中配置该字段为 repeat。

### 6.5 其他视图类型（基于源码可见）
Make.md 内部对“列表渲染/卡片/画廊”等有多种 kit/谓词配置（例如 `cards`、`catalog`、`gallery`、`details`、`flow` 等）。它们通常表现为“List View 的不同 Item/Group 模板”，在 UI 中以不同 layout 入口呈现（具体取决于当前版本 UI 是否暴露）。

---

## 7. Spaces（空间视图：把一个文件夹/标签做成仪表盘）

### 7.1 Space View 能做什么？
Space View 是一个“可拼装的工作台”：
- 添加 Note block：把某篇笔记作为块显示
- 添加 List View：嵌入一个 Context（可跨 Space 指定数据源）
- Divider/Image/Button/Label/Sticker/Rating/Toggle/Progress 等组件
- 通过拖拽分栏/分组做布局

### 7.2 如何打开 Space View？
- 在 Navigator 里找到目标 Space（文件夹/标签），打开它即可进入 Space View。

### 7.3 常见块（Blocks）与用途示例

1) Note
- 用途：空间首页的说明、项目简介、README。

2) List View
- 用途：嵌入任务表、媒体库表、日程表；可保存不同过滤视图。

3) Button（按钮）
- 文档说“Run Command / Open Link”，源码中还额外提供一组 **API Actions**（详见第 8.4）：
  - Open Path（打开某路径）
  - Create Item in Space（在某 Space 创建条目）
  - New Item View（打开创建条目的表单/视图）
  - Set Property（打开更新条目的属性编辑视图）
  - 以及该 Space 自定义的 Actions（若有）

4) Toggle / Group / Columns
- 用途：折叠区域、分组卡片、左右栏布局。

### 7.4 布局与样式（Styling）
- 悬停块右侧 `...` 可编辑样式：
  - 尺寸/边距/内边距
  - 边框/背景色
  - 字体颜色
- 拖拽到另一个块右侧可形成多列布局。
- Shift 多选后可创建 Group，并单独设置 group 样式。

---

## 8. Smart Search / Live Search（自动把符合条件的条目“拉进来”）

> 官方文档称 Live Search；源码与 UI 中常用描述是 Smart Search，底层存储在 Space 元数据 `_joins`。

### 8.1 它是什么？
- 你可以在一个 Space 里定义若干条“Join”：
  - 从哪个 Space 拉取条目（Join items from …）
  - 是否递归包含子文件夹（including subfolders）
  - 一组过滤条件（filters）
- 结果会作为该 Space 的内容来源之一（类似“动态固定/动态集合”）。

### 8.2 过滤条件的结构（可理解为：Filter Group + Filter）
- Join 有一个 joinType：`any/all`（任一条件组满足/全部条件组满足）。
- 每个条件组也有 `any/all`。
- 每个 Filter 由以下字段构成（源码结构）：
  - `type`：file/path 等类别（对应文档里的 File Properties / File Metadata）
  - `field`：字段名（例如 folder/path/extension/tags/frontmatter/contexts/spaces/...）
  - `fn`：过滤函数（等于/包含/为空/范围等，取决于字段类型）
  - `value`：比较值（文本/数值/日期/链接/space/列表等）

### 8.3 一个可复制的“收件箱（Inbox）”思路
目标：把全库“未处理”的条目自动聚合到一个 Space。

- 建一个 Space：`/Inbox`
- 添加 Smart Search：
  - Join from：`/`（Vault）
  - Filters（示例）：
    - frontmatter `status` 为空 或 等于 `inbox`
    - folder 不在 `Archive/` 下
    - tag 包含 `#inbox`
- 好处：不用手动 pin，条目一旦满足条件就自动出现。

---

## 9. Flow（Make.md Basics）：可编辑嵌入、Make Menu、Inline Context

### 9.1 相关设置（Notes -> Flow/Flow Menu/Flow Styler）
（名称以 UI 英文回退文案为准；不同语言包可能显示不同）

- Flow：
  - `Replace Selection in Flow`（`editorFlow`）：用 Flow Block 替换选区（开关由 Basics settings 控制）
  - `Open Links in Flow`（`internalLinkClickFlow`）：内部链接用 Flow Editor 打开
  - `Show Link Stickers`（`internalLinkSticker`）：内部链接旁显示 sticker
  - `Flow Style`（`editorFlowStyle`）：`seamless` / `minimal`
- Flow Menu：
  - `Show Make Menu`（`flowMenuEnabled`）
  - `Make Character`（`menuTriggerChar`，默认 `/`）
  - `Make Menu Placeholder`（`makeMenuPlaceholder`）
- Flow Styler：
  - `Inline Styler`（`inlineStyler`）
  - `Inline Sticker Menu`（`inlineStickerMenu`）
  - `Inline Color Styling`（`inlineStylerColors`）
- Inline Context（在 Notes 设置中）：
  - `inlineContext`：是否在笔记顶部显示 Inline Context
  - `inlineContextExpanded`/`inlineContextProperties`/`inlineContextNameLayout`：显示布局控制

### 9.2 Flow Block 的语法（非常关键）

Make.md 会把以下两种模式当作“可编辑嵌入/Flow Block”来渲染（源码正则）：

```md
![![Some Note]]
!![[Some Note]]
```

说明：
- `![![...]]` 是当前代码中常用的写法（Flow Menu 插入）。
- `!![[...]]` 在源码里仍被识别（兼容旧写法/历史写法）。
- 这不是 Obsidian 原生 embed；离开 Make.md 可能只是一段文本。

### 9.3 Make Menu（默认 `/`）触发规则（源码行为）

Make Menu 会在以下两种情况下触发：
1) **当前行以触发字符开头**（默认 `/`）  
2) **当前行以 `- /` 结尾**（列表项工作流：在 bullet 里插入链接/Flow/表格等很方便）

> 小提示：如果你希望插入的是“本身带 `- ` 前缀”的内容（如 `todo` -> `- [ ]`），更建议在行首输入 `/`；  
> 而 `- /` 更适合在一个 bullet 里插入 `flow/context/table/link/image` 这类“非 list 前缀”的块。

### 9.4 Make Menu 内置条目（v1.3.3，源码列表）

以下条目来自 `basics/enactor/makemd.tsx`，基本都可以在菜单里搜索到：

- `todo` → 插入 `- [ ] `
- `list` → 插入 `- `
- `ordered-list` → 插入 `1. `
- `h1`/`h2`/`h3` → `# / ## / ###`
- `quote` → `> `
- `divider` → `---`
- `codeblock` → 插入代码块（带占位文本，插入后会把光标选中到代码内容区域）
- `callout` → `> [!NOTE] ...`
- `internal` → 选择一个笔记并插入 `[[path]]`
- `link` → `<Paste Link>`
- `image` → 选择图片并插入 `![[image]]`（这是 Obsidian 原生图片 embed）
- `flow` → 选择一个笔记并插入 Flow Block：`![![path]]`
- `context` → 选择一个 Space 并插入 Context embed（默认 schema `files`）
- `table` → 在当前文件夹创建一个 inline table，并插入对应 Context View embed
- `board` → 在当前文件夹创建一个 inline board，并插入对应 Context View embed
- `tag` → 插入 `#tag`（光标停在 `#` 后便于继续输入）

### 9.5 Inline Context（在笔记顶部编辑属性）
- Inline Context 会把“该笔记所属 Context 的属性”显示在笔记顶部。
- 你可以在这里直接编辑属性，也可以 `Add Property`：
  - 添加到“当前笔记”（frontmatter）
  - 或添加到“当前 Context”（让同一集合的笔记都拥有该字段）

### 9.6 在笔记里嵌入 Context / Context View（内联表格/看板）

两种常用做法：

1) **从 Context View 复制 Embed Link**
- 打开某个 Context（表/看板等）
- 在 View 上右键 `Copy Embed Link`
- 粘贴到笔记中

2) **用 Make Menu 直接创建**
- 在笔记里输入 `/table` 或 `/board`
- Make.md 会在当前文件夹 Space 下创建对应的 table/board，并插入一段 embed 链接

---

## 10. `#* / #^ / #;` 片段语义（理解 Make.md 的“虚拟路径”）

Make.md 用 fragment 来区分“同一个 Space 下的不同对象”：

### 10.1 `#^schema`：Context（表/数据库）
- 形式：`<spacePath>/#^<schemaId>`
- 常见：`files` 是默认 schema id（不同 space/版本可能有所差异）
- 示例（文件夹 Space）：
```md
![![Projects/Alpha/#^files]]
```

### 10.2 `#*schema`：Frame / Context View（视图帧）
- 形式：`<spacePath>/#*<frameId>`
- 示例：
```md
![![Projects/Alpha/#*MyBoardView]]
```

### 10.3 `#;schema`：Action / Command（动作）
- 形式：`<spacePath>/#;<actionId>`，常见于内部命令与按钮动作路径。
- 另有一类 API action 使用 `spaces://$api/{namespace}/#;{method}` 格式，例如：
  - `spaces://$api/path/#;open`
  - `spaces://$api/path/#;create`
  - `spaces://$api/table/#;createModal`
  - `spaces://$api/path/#;setProperty`

---

## 11. Templates（模板：快速新建条目/空间布局复用）

Make.md 里至少有两种“模板”概念：

### 11.1 Global Templates（全局模板）
- 管理入口：设置里 `Global Templates`（源码：`.space/templates`）。
- 本质：在 Vault 根 `.space/templates/` 下维护一组模板笔记（`.md`）。
- 用途：为整个系统提供可复用的模板内容（具体如何被 UI 使用取决于当前版本）。

### 11.2 Space Templates（某个 Space 的模板）
空间模板存放在：
```
<spacePath>/.space/templates/
```

可做的事（源码支持）：
- 把某个笔记/路径保存为该 Space 的模板（复制到 templates 目录）
- 将某个模板设为该 Space 的默认模板（Space 元数据 `_template`）
- 设定“用模板创建新条目时的命名公式”（Space 元数据 `_templateName`，通过公式生成新文件名）

一个实用例子：**会议纪要模板 + 自动命名**
- 在 `/Meetings` Space 里保存 `Meeting Template.md` 为模板
- 把它设为默认模板
- 设置 Template Name Formula（示例）：
```txt
formatDate(now(), "yyyy-MM-dd") + " Meeting"
```
- 之后从模板新建，就会自动生成 `2026-01-08 Meeting.md` 这类名字（如果重名则会自动去重）。

### 11.3 Default Space Template（全局默认空间布局模板）
- 设置项：`defaultSpaceTemplate`（Settings -> Space）。
- 作用：新建 Space 时的默认 Frame/布局会优先使用该模板（如果模板缓存中存在）。
- 适合：你想让所有新 Space 都自动带有相同的首页布局（标题、任务表、日历、按钮区等）。

---

## 12. Buttons & Actions（做“可操作的仪表盘”）

Space View 的 Button 可以绑定动作。源码里“动作选择菜单”包含：

### 12.1 API Actions（内置）
- Open Path：打开指定 path
- Create Item in Space：在某 Space 创建条目（可指定 name/content）
- New Item View：打开“新建条目”的视图/表单（需要 space + schema）
- Set Property：打开更新条目的属性视图（path + property + value）

### 12.2 Space Actions（某个 Space 自定义的 action）
- 如果某 Space 定义了 actions，会以 `spaces://$api/<spacePath>/#;<actionId>` 形式出现。
- 这部分对应 `.space/commands.mdb` 等数据文件，属于 Make.md 的“动作库/命令系统”。

### 12.3 一个仪表盘按钮区示例（思路）
- “新建任务”：绑定 Create Item in Space 到 `/Projects/Alpha`，并预填 `name`。
- “打开本周计划”：绑定 Open Path 到某个 weekly note。
- “将当前条目状态设为 Done”：绑定 Set Property（path=当前选中项，property=`Status`，value=`Done`）。

---

## 13. 命令与快捷键（v1.3.3 源码可见）

常用命令（命令面板里可搜到，括号内为 command id）：

- Blink（`mk-blink`，默认热键 `Mod+o`）
- Open Overview（`open-ever-view`）
- Manage Hidden Files（`open-hidden`）
- New Note（`new-note`）
- Show Warnings（`show-warnings`）
- Toggle Enhanced Logs（`logs`）
- Fix Path Characters（`path-fixer`）
- Move Space Data Folder（`move-space-folder`）
- Create Folder / New Space（`mk-new-space`）
- Expand All / Collapse All（`mk-expand-folders` / `mk-collapse-folders`）
- Reveal File（`mk-reveal-file`）
- Pin Active File to Space（`mk-pin-active`）
- Open Spaces（`mk-spaces`）
- Convert Path to Space（`mk-convert-folder-note`，需启用 Folder Note）
- Open File Context（`mk-open-file-context`，需启用 Context）
- Open Flow / Close Flow（`mk-open-flow` / `mk-close-flow`，Basics/Flow）
- Set Homepage（`mk-set-homepage`）

---

## 14. 公式（Formula）速查与例子（面向“可复制粘贴”）

### 14.1 公式引擎概览（源码要点）
- 基于 `mathjs`，支持常见数学/逻辑表达式。
- Make.md 注入了一组函数（见下表），并对 `prop()` 做了类型化返回：
  - Date → `Date` 对象
  - Link/File/Context → 返回路径对象（或列表），便于在函数里进一步处理
- 在 `filter/map/find/...` 这类列表函数里，运行时会设置变量：
  - `current`：当前遍历元素
  - `index`：当前索引

### 14.2 内置函数列表（v1.3.3 源码提取）

> 说明：官方文档 `References/Formula.md` 只列了主要函数；源码中完整集合如下（按类别粗略分组）。

**属性/变量**
- `prop(text)`：取字段值（类型化）
- `let(name, value, formula)`：定义一个变量并在后续 formula 中使用
- `lets(name1, value1, name2, value2, ..., formula)`：一次定义多个变量

**逻辑**
- `if(condition, ifTrue, ifFalse)`
- `ifs(cond1, val1, cond2, val2, ..., elseVal)`

**字符串**
- `slice(text, start, end)`
- `substring(text, start, end)`
- `startsWith(text, substring)`
- `contains(text, substring)`
- `test(text, regex)`
- `match(text, regex)`
- `replace(text, search, replace)`
- `replaceAll(text, search, replace)`
- `lower(text)` / `upper(text)`
- `repeat(text, times)`
- `format(any)`：把值转成字符串（日期/路径对象等会被规整）
- `split(text, separator)`

**数值**
- `toNumber(any)`

**日期**
- `now()`
- `minute(date)` / `hour(date)` / `day(date)` / `date(date)` / `week(date)` / `month(date)` / `year(date)`
- `formatDate(date, format?)`
- `parseDate(text)`
- `timeStamp(date)`
- `dateAdd(date, amount, type)`
- `dateSubtract(date, amount, type)`
- `dateBetween(date1, date2, unit)`：unit 示例：`days/months/years/hours/minutes/seconds/weeks/quarters`
- `dateRange(listOfDates, unit)`：计算一组日期的跨度

**列表**
- `empty(value)`
- `length(list)` / `values(list)` / `uniques(list)`
- `at(list, index)` / `first(list)` / `last(list)`
- `concat(list1, list2)` / `reverse(list)` / `flat(listOfLists)`
- `sort(list)`（源码实现偏向数值排序；对非数值不保证预期）
- `join(list, separator)`
- `includes(list, value)`
- `find(list, condition)` / `findIndex(list, condition)`
- `filter(list, condition)`
- `map(list, formula)`
- `some(list, condition)` / `every(list, condition)`

**Path/Space**
- `path(pathTextOrPathObj)`
- `spaceItems(spacePath)`：取某 Space 内条目列表
- `spaces(path)`：取某 path 所在的 spaces 列表

### 14.3 常用公式示例（可直接改字段名）

1) **显示截止日期（为空则空）**
```txt
let(d, prop("Due"), if(empty(d), "", formatDate(d, "yyyy-MM-dd")))
```

2) **距截止还有多少天（负数表示已逾期）**
```txt
dateBetween(now(), prop("Due"), "days")
```

3) **逾期标记**
```txt
let(days, dateBetween(now(), prop("Due"), "days"), if(days < 0, "OVERDUE", ""))
```

4) **将“距到期天数”分桶（ifs 示例）**
```txt
lets(
  d, prop("Due"),
  days, dateBetween(now(), d, "days"),
  if(empty(d), "",
    ifs(
      days < 0, "Overdue",
      days <= 3, "Next 3 days",
      days <= 7, "This week",
      "Later"
    )
  )
)
```

5) **计算“7 天后”的日期文本（dateAdd 示例）**
```txt
formatDate(dateAdd(now(), 7, "days"), "yyyy-MM-dd")
```

6) **多选字段拼接为文本**
```txt
join(prop("Tags"), ", ")
```

7) **判断某标签是否存在**
```txt
includes(prop("Tags"), "#important")
```

---

## 15. “从 0 到 1”的工作流示例（尽量贴近真实使用）

### 15.1 项目空间（Project Space）+ 任务表 + 看板 + 日历

目标：在 `/Projects/Alpha` 做一个项目空间，兼顾任务列表、看板流转与截止日历。

1) 建文件夹：`/Projects/Alpha`
2) 打开 `Alpha` Space（Space View）
3) 在 Context 里新增字段（建议）：
- `Status`（Options）：`Todo/Doing/Done`
- `Due`（Date）
- `Priority`（Number）
- `Assignee`（Link）
- `Tags`（Options, Multi）
- `Estimate`（Number）
- `Overdue`（Formula）：用 14.3 的逾期示例
4) 新建视图：
- Table：默认视图，按 Priority 排序
- Board：按 `Status` 分组
- Calendar：使用 `Due` 字段
5) Space View 里拼装首页：
- 上方放 Label/说明 Note
- 中间放 Board（当前进行中）
- 下方放 Table（全量任务）与 Calendar（本周）
- 增加按钮：
  - Create Item in Space → `/Projects/Alpha`（快速新建任务）

### 15.2 标签媒体库（Tag Space）= “跨文件夹数据库”

目标：用 `#media` 做一个全库媒体库（读书/电影/课程都能统一管理）。

1) 给相关笔记打标签：`#media`
2) 在 Tags Space 找到 `#media` 并打开其 Space
3) 在该 tag Space 的 Context 里定义字段：
- `Type`（Options）：Book/Movie/Course
- `Status`（Options）：Plan/Doing/Done
- `Rating`（Number）
- `Start`/`Finish`（Date）
- `Cover`（Image）
- `Source`（Link）
4) 创建视图：
- Gallery/卡片（用于封面墙）
- Board（按 Status）
- Table（用于筛选/排序）

### 15.3 “收件箱 Inbox”= Smart Search 自动聚合

目标：把全库满足条件的条目自动汇总到 `/Inbox`，减少手动 pin。

- 参考第 8.3，核心在于 `_joins`（Smart Search）：
  - Join from `/`
  - 条件：tag/frontmatter/path 等组合

### 15.4 用 Flow Block 做“类 Logseq 的逐层钻取/嵌入”

目标：在一篇“项目周报”里嵌入多个相关笔记并直接编辑，减少频繁跳转。

在周报笔记中：
- 输入 `/flow` 选择一篇子笔记 → 插入：
```md
![![Projects/Alpha/Meeting Notes]]
```
- 继续插入多个 Flow Block，把上下文集中在一页里处理。

### 15.5 联系人/CRM（Relation + Rollup 的典型场景）

目标：维护联系人，并在“公司/项目”上汇总联系人状态。

1) 建两个 Space：
- `/CRM/People`（联系人）
- `/CRM/Companies`（公司）
2) `People` Context 字段示例：
- `Company`（Relation → Companies，建议双向）
- `Role`（Text）
- `Last Contact`（Date）
- `Next Follow-up`（Date）
- `Channels`（Options, Multi）：WeChat/Email/Phone…
3) `Companies` Context 字段示例：
- `People`（由双向 Relation 自动生成）
- `People Count`（Aggregate：Relation=People，Fn=Count）
- `Next Follow-up`（Aggregate：Relation=People，Field=Next Follow-up，Fn=Earliest）
4) 视图：
- Companies Table：按 Next Follow-up 排序，快速知道下一批要跟进的公司

### 15.6 学习系统（课程/章节/练习：用 Board 跟踪进度）

目标：把课程拆成章节条目，用看板推进。

1) Space：`/Learning/Course-XYZ`
2) 字段示例：
- `Status`（Options）：Plan/Doing/Done
- `Type`（Options）：Lecture/Exercise/Reading
- `Spent`（Number，分钟）
- `Date`（Date）
3) 视图：
- Board：按 Status
- Calendar：按 Date
- Table：按 Spent 汇总（也可以在列底部做 Sum/Avg）

### 15.7 写作/发布流水线（模板 + 自动命名 + 看板）

目标：从 idea 到发布的一条龙。

1) Space：`/Writing`
2) 字段示例：
- `Stage`（Options）：Idea/Draft/Review/Publish
- `Publish Date`（Date）
- `Channel`（Options, Multi）：Blog/公众号/Newsletter
3) 模板：
- 保存 `Article Template` 为 Space Template，并设为默认
- Template Name Formula 示例：
```txt
formatDate(now(), "yyyy-MM-dd") + " - " + "New Article"
```
4) 视图：
- Board：按 Stage
- Calendar：按 Publish Date

### 15.8 习惯/健康追踪（Calendar + 简单公式）

目标：用日历展示记录（打卡/训练/体重）。

1) Space：`/Health/Logs`
2) 字段示例：
- `Date`（Date）
- `Type`（Options）：Run/Gym/Sleep/Weight
- `Value`（Number）
- `Unit`（Options）：km/min/kg…
- `Note`（Text）
3) 视图：
- Calendar：用 Date 展示每日日志
- Table：按 Type 过滤、按 Date 排序

### 15.9 旅行计划（Board + Calendar + Checklist）

目标：把行程/准备事项/预算放在一个 Space。

1) Space：`/Trips/Japan-2026`
2) 三类数据建议拆成 3 张表（或 3 个 view）：
- Itinerary：Date/City/Place/Time/Cost
- Packing：Item（Text）+ Done（Yes/No）
- Budget：Category（Options）+ Amount（Number）
3) 视图：
- Calendar（Itinerary）
- Board（Packing 按 Done 分组）
- Table（Budget，列底部 Sum）

### 15.10 主页 Dashboard（Homepage + Pins + Smart Search）

目标：打开 Vault 就看到“今天该做什么”。

1) 选一个 Space 作为主页（例如 `/Home`），执行命令：`mk-set-homepage`
2) `/Home` 里放：
- Pinned Items：固定最常用 Space（Projects/Health/Writing）
- Smart Search：自动汇总本周到期任务（按 Due 过滤）
- Buttons：快速新建任务/打开周计划

---

## 16. 常见问题（FAQ / 排查方向）

1) **我看到很多 `.mdb` / `.space`，可以删吗？**
- 不建议。它们承载了 Context/Views/Templates/Actions 等数据。删除等同于重置/丢失空间数据。

2) **为什么同样的链接在别的设备上打不开 Space/表格？**
- 多数是同步没带上 `.space` 或 `.mdb`，或被同步工具忽略了“隐藏文件/扩展名”。

3) **`![![...]]` 在预览里只是文字/不渲染**
- 需要确认：
  - Make.md 已启用
  - Basics/Flow 功能相关开关未关闭
  - 当前主题/其它插件没有把该段落的渲染结构改掉（Make.md 会在 postprocessor 里扫描 `p` 标签文本并替换）

---

## 17. 进一步阅读（官方与源码入口）

- 官方文档 Vault（MD）：`Make-md/makemd-docs`
- 插件源码（TS）：`Make-md/makemd`
- 关键源码文件（用于核对行为）：
  - Flow Menu：`src/basics/menus/MakeMenu/MakeMenu.tsx`
  - Flow 菜单条目：`src/basics/enactor/makemd.tsx`
  - Flow embed 识别：`src/basics/flow/markdownPost.tsx`
  - 片段/嵌入：`src/shared/utils/makemd/embed.ts`
  - Smart Search（joins）：`src/core/react/components/SpaceEditor/SpaceJoins.tsx` + `SpaceQuery.tsx`
  - 模板：`src/core/react/components/System/GlobalTemplateEditor.tsx` + `src/core/superstate/utils/spaces.ts`
  - 公式：`src/core/utils/formula/formulas.ts`
