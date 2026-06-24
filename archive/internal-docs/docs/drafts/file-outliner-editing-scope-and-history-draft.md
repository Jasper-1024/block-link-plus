# File Outliner 编辑作用域与历史模型草案

> 状态：工作草案。
>
> - 这份文档只用于 `docs/` 下的设计讨论。
> - 它本身不是 OpenSpec change；当前对应的 change 已创建：`update-file-outliner-view-structural-history-v1`。
> - 目标是把 `undo/redo` 放到一个更大的 Outliner 编辑一致性问题里讨论。

## 为什么要写这份草案

最近对 `Ctrl+Z` 的调查说明，File Outliner 现在同时像三种东西：

1. 一个普通的单实例 CodeMirror 文本编辑器；
2. 一个以 block 为核心的 outliner；
3. 一个带树结构与视图状态的界面。

这三层内部实现本身都合理，但用户感知到的只有**一个编辑器**。
当常用操作跨越“单个 block 内部”和“多个 block 之间”时，行为就开始不一致。

`undo/redo` 是目前最明显的例子，但它绝不是唯一的问题。
剪贴板、选择、导航、快捷键的作用域提升，其实都暴露了同一个底层问题。

## 核心观察

Outliner 目前实际上存在多个编辑作用域：

- **文本作用域**：光标或文本选区位于单个 block 的编辑器内部；
- **Block 作用域**：一个完整 block 作为内容单元；
- **Block Range 作用域**：多个可见 block 以整块方式被选中；
- **视图作用域**：Outliner 的 zoom / collapse / focus 等状态。

现在这些作用域之间，并没有共享一套统一的行为模型。
有些交互只在文本作用域成立，有些只在 block 作用域成立，还有些只能靠鼠标或右键菜单成立。

## 设计原则

最重要的一条原则应该是：

**Outliner 必须对用户暴露一套统一的编辑模型，即使内部实现使用了不同机制。**

这意味着至少要做到：

- 只有一套用户可感知的历史模型；
- 只有一套明确的选择模型；
- 只有一套明确的作用域提升规则；
- 只有一套一致的剪贴板语义；
- 只有一套一致的“什么算一次原子编辑”定义。

## 已确认的当前缺口

### 1）结构性编辑没有进入用户可见的撤销历史

这是已经确认的问题。
单个 block 内部的普通文本输入，只要仍然停留在 CodeMirror 自带历史里，就还能撤销。
但一旦进入结构性操作，用户可见的撤销链就断了。

当前已确认会触发该问题的操作包括：

- `Enter` 创建新 block；
- 多行粘贴生成多个 block；
- 其他会重建 Outliner 状态的树结构编辑。

### 2）多 block 选区已经存在，但键盘剪贴板操作不会跟随它

运行时调查已经确认，block-range selection 这个状态本身是存在的，而且界面也会反映出来；
但：

- `Ctrl/Cmd+C` 不会复制当前选中的 block range；
- `Ctrl/Cmd+X` 不会剪切当前选中的 block range。

所以当前的多 block 选区，更像是一个“鼠标/右键菜单能力”，而不是一个真正的一等键盘编辑状态。

### 3）`Ctrl/Cmd+A` 仍然只停留在单 block 文本范围

运行时调查同样确认：`Ctrl/Cmd+A` 目前只会选中当前 block 编辑器里的文本。
它不会继续提升为：

- 当前 block 的整体选中；
- 或当前可见 Outliner 范围的整体选中。

这也是一个很典型的作用域断层。

## 很可能还存在的其他缺口

下面这些问题并不是都做了完整自动化验证，但从代码结构和现有行为模式看，概率很高。

### A. 键盘扩选在跨 block 场景下并不完整

普通 `ArrowUp` / `ArrowDown` 已经实现了跨 block 导航。
但同一家族的“扩选版导航”目前并没有表现出同样明确的跨 block 语义，例如：

- `Shift+ArrowUp`
- `Shift+ArrowDown`
- 其他带“扩展选择”语义的边界导航

这说明“光标移动”和“扩展选择”目前还不是同一个统一模型。

### B. 多 block 选区缺少成体系的键盘语义

从当前实现看，block-range selection 很可能还缺少下列键盘语义定义：

- copy
- cut
- delete
- backspace
- paste
- escape 清除或降级选区

结果就是：用户可以创建一个多 block 选区，但无法把它当成普通“当前活动选区”来操作。

### C. 选区提升规则还没有被明确定义

Outliner 当前并没有一条正式的“作用域提升梯子”，例如：

- 先是单个 block 内部的文本选区；
- 再提升为当前 block 整体；
- 再提升为多个 block；
- 再提升为当前可见 Outliner 范围。

没有这条梯子，很多常见快捷键都会变得难以推理，也难以形成稳定直觉。

### D. 鼠标选择与键盘选择是两套系统

鼠标拖拽已经可以产生 block-range selection。
但键盘驱动的选择，目前并没有明显进入同一套状态模型。
这往往会导致两套逻辑长期并行、越补越碎。

## 实用矩阵（先覆盖 80% 高频场景）

这张矩阵有意不追求穷尽。
它只覆盖最常见、最能代表真实使用场景的一组编辑操作。

这张矩阵的依据包括：

- 通过 `9222` 对运行中的 Obsidian 做实时调试；
- 当前 File Outliner 代码实现；
- 官方 Obsidian 编辑快捷键的常见用户预期；
- Workflowy 一类 outliner 工具的常见用户预期。

支持程度说明：

- **良好**：主要作用域下可用，而且语义比较连贯；
- **部分支持**：在某个作用域可用，但一跨作用域就断；
- **缺失**：常见预期当前没有成立；
- **需要设计**：表面上有行为，但语义还不够明确或不够稳。

| 操作 | 常见用户预期 | 当前 BLP 状态 | 说明 | 更好的方向 |
| --- | --- | --- | --- | --- |
| `ArrowUp` / `ArrowDown` | 先在 block 内移动光标，到边界后再跨 block 移动 | **良好** | `9222` 已确认两个方向都能跨 block：`ArrowDown` 可从普通块尾部进入下一块，`ArrowUp` 可从下一块起点回到上一块。 | 继续保留，并把它作为导航家族的基线。 |
| `Shift+ArrowUp` / `Shift+ArrowDown` | 按与普通导航一致的心智模型扩展选择 | **部分支持** | `9222` 已确认：两个方向在 block 边界都不会跨到相邻 block，也不会提升成 block-range selection。它们仍停留在单 block 文本作用域。 | 让扩选导航沿用普通导航的边界规则，必要时显式提升为 block-range。 |
| `Enter` | 在当前位置拆分当前 block，并创建新的 sibling block | **部分支持** | 结构行为本身成立，但 `Ctrl+Z` 不会撤回这次 split。 | 保留 split 语义，但让它成为一条原子 Outliner history entry。 |
| `Shift+Enter` | 普通 block 内换行；task block 保持单行任务语义 | **良好** | `9222` 已确认：普通 block 会插入换行；task block 会走结构 split，而不是生成块内换行。 | 保持这种 block-type-aware 规则，但把历史语义补齐。 |
| `Tab` / `Shift+Tab` | 调整当前 block 层级 | **部分支持** | `9222` 已确认：`Tab` 缩进、`Shift+Tab` 反缩进都成立；但两者之后 `Ctrl+Z` 都不会恢复原层级。 | 作为原子 block-scope 历史操作统一管理。 |
| `Ctrl/Cmd+A` | 选中“当前作用域”的全部内容，并有清晰提升规则 | **部分支持** | 当前只会选中活动 block 内的文本，连按两次也不会提升到 block 或可见 Outliner 范围。 | 明确定义它是一段式还是多段式提升。 |
| `Ctrl/Cmd+C` | 文本选区复制文本；block-range selection 复制选中的 block | **部分支持** | 文本复制成立；多 block 选区下的键盘复制不会跟随 block-range 状态。 | 建立统一剪贴板模型：文本选区复制文本，block-range 复制序列化 block。 |
| `Ctrl/Cmd+X` | 文本选区剪切文本；block-range selection 剪切选中的 block | **部分支持** | 文本剪切成立；多 block 选区下的键盘剪切不会执行对应 block-range 动作。 | 与 copy 完全对称，再在同一作用域内执行 delete。 |
| `Delete` / `Backspace`（文本边界） | 在 block 边界执行 merge prev / merge next | **部分支持** | `9222` 已确认：`Backspace` 在块首会 merge prev，`Delete` 在块尾会 merge next；但两者都不会被 `Ctrl+Z` 撤回。 | 把边界 merge 明确归类为结构编辑，并接入统一历史。 |
| `Delete` / `Backspace`（block-range） | 对当前 block-range selection 执行删除或结构性删改 | **缺失** | `9222` 已确认：在 block-range selection 下按 `Delete` / `Backspace` 没有明确动作，选区和内容都不变。 | 明确定义 block-range 下的删除语义，并决定是否纳入结构历史。 |
| `Ctrl/Cmd+V` | 文本作用域下粘贴文本；需要时把多行粘贴提升为多个 block | **部分支持** | `9222` 已确认：普通 block / task block 的多行粘贴都会进入结构编辑；但它仍未进入统一撤销链。另一个独立 bug 也已定位：结构编辑后若焦点切到新 block，旧 editor 的 stale text 会回写覆盖新结构结果。 | 先用最小补丁修复 stale commit 覆盖，再把 split-paste 作为原子结构编辑接入统一历史。 |
| `Ctrl/Cmd+Shift+V` | 强制按纯文本方式粘贴到当前文本作用域 | **部分支持** | `9222` 已确认：普通 block 会留在单 block 文本范围内；但 task block 仍会拆成结构编辑，因为它要保持单行任务语义。 | 把这条“task block 例外”写成显式规则，而不是隐含行为。 |
| `Home` / `End` | 在当前文本作用域内移动到行首/行尾，不跨 block 提升作用域 | **良好** | `9222` 已确认：在多行 block 内，它们仍保持在当前 block 文本范围，不会误触发跨 block 行为。 | 继续保持文本局部语义，不要把它们并入结构导航。 |
| `Escape` | 降级或清空当前选择状态 | **部分支持** | 已独立小修：`9222` 已确认，编辑态按 `Escape` 会退出当前 block 编辑并把焦点落回 outliner root；block-range selection 下按 `Escape` 会清空当前整段选区。 | 暂不把它继续扩成更大的“作用域降级梯子”；先保持这条最小、直接的退出/清空语义。 |
| `block-range 右键菜单` | 对当前整段范围提供 range-aware 菜单语义 | **部分支持** | `9222` 已确认：range 状态下右键可以打开菜单，但菜单仍以“被点击的那个 block”为锚点；甚至点“删除”时，也只删除该 block。 | 如果 V1 不做 range-aware 菜单，也至少要把这件事写成明确限制。 |
| `drag/drop` | 移动当前 block 或 subtree，并可由撤销恢复 | **部分支持** | `9222` 已确认：reorder sibling 与 append child 都成立；但拖拽后直接按 `Ctrl+Z`，顺序不会恢复。 | 把 drag/drop move 纳入与 split / merge / indent 同一条结构历史链。 |
| `Ctrl/Cmd+Z` / redo | 撤销/重做最近一次用户可见编辑，不关心它是文本还是结构 | **部分支持** | `9222` 已确认：单块文本 `Ctrl+Z` 正常；在当前 Windows 探针里，`Ctrl+Y` 可以重做单块文本，但 `Ctrl+Shift+Z` 没有恢复；所有结构编辑都没有进入统一历史。 | 引入单一 Outliner-level history model，并明确平台相关的 redo 入口。 |

## 对当前实现的简短评价

### 现在做得比较好的部分

- Outliner 已经把“文本编辑”和“树结构编辑”做了明确分层；
- 普通跨 block 箭头导航不是依赖默认行为，而是经过专门设计；
- 多行粘贴已经有 Outliner-aware 语义，不是假装自己只是一个普通文本框；
- block-range selection 已经作为真实视图状态存在，这是很重要的基础；
- 鼠标路径上，从 block-range 回到文本作用域或 zoom 作用域其实已经比较顺：单击 display 会进入编辑并清空 range，单击 bullet 也会在 zoom 前清空 range。

### 现在比较脆弱的部分

- 键盘路由在嵌入式编辑器内部很强，但在 Outliner 根级别较弱；
- 文本选区与 block-range selection 是两套系统，缺少明确的提升规则；
- block-range 动作目前更容易通过鼠标或右键菜单触达，而不是键盘；
- 右键菜单虽然能在 range 状态下弹出，但菜单动作仍按“单块”执行，和可见的 range 状态并不一致；
- 剪贴板语义被拆成了“文本编辑器行为”和“block 菜单行为”；
- 历史模型被拆成了“CodeMirror 本地历史”和“Outliner 结构编辑”。

### 从代码结构看，这确实是一簇同源问题

- `src/features/file-outliner-view/editor-state.ts` 已经把 `ArrowUp/Down`、`Enter`、`Tab`、`Backspace`、`Delete` 等键位统一收进嵌入式 CM 路由，这其实提供了一条很好的统一入口；
- `src/features/file-outliner-view/view.ts` 里的结构编辑最终大多都会落到 `applyEngineResult()`，这解释了为什么 `split`、`merge`、`indent/outdent`、`drag/drop` 会一起暴露历史断层；
- `src/features/file-outliner-view/editor-suggest-bridge.ts` 里的 `undo()` / `redo()` 目前还是空实现，这说明现在并不存在一条 bridge-level 的统一历史兜底；
- 另一方面，`enterEditMode()`、`zoomInto()`、`toggleCollapsed()` 这些现有入口已经会清理 block-range，说明“状态切换骨架”其实已经在了；
- 所以这件事不需要走“先重写架构”的路线，也不需要先发明一个更大的模式协调器；V1 更合理的做法是：先把结构编辑接入一条统一历史链，再决定哪些快捷键要继续统一提升。

### 为什么这件事值得先抽象再实现

当前实现并不是“错的”。
实际上，它已经包含不少很用心的局部设计。
问题在于，这些能力是按单个问题逐步补进来的。

所以接下来的重点不应该是“继续补几个快捷键”，
而应该是“先定义一套作用域模型，再让快捷键从这套模型里自然继承语义”。

## 创建 change 前的 9222 验证清单

这一轮已经把和本议题最相关、覆盖 80% 高频使用场景的 `9222` 验证跑完。
下面这些结论现在可以直接作为后续 change 讨论的事实基线。

### 已经完成的高频验证

- `ArrowUp` / `ArrowDown` 跨 block 成立；`Shift+ArrowUp` / `Shift+ArrowDown` 都不会跨 block，也不会提升成 block-range；
- 普通 block：`Enter` split、`Shift+Enter` 换行；task block：`Enter` split、`Shift+Enter` 也走 split；
- `Tab` / `Shift+Tab`、`Backspace` merge prev、`Delete` merge next、`drag/drop` move 都已通过 `9222` 验证；
- `Ctrl/Cmd+Z` 对单块文本成立；当前 Windows 探针里 `Ctrl+Y` 可以重做文本，`Ctrl+Shift+Z` 不会恢复；
- 所有已验证结构编辑：`Enter`、多行 `Ctrl/Cmd+V`、`Tab`、`Shift+Tab`、`Backspace` merge、`Delete` merge、`drag/drop` move，目前都没有进入统一撤销链；
- block-range selection 已是真实状态，但键盘上的 `Ctrl/Cmd+C` / `X`、`Delete` / `Backspace`、`Paste` 仍不会承接它；`Escape` 现在已经可以清空当前 range；
- 但 block-range 并不是“出不来”：单击某个 block display 可以直接回到文本编辑，单击 bullet 也能清掉 range 并进入 zoom；
- block-range 上右键目前仍以“被点击的单个 block”为锚点打开 bullet menu；进一步验证表明，点菜单里的“删除”也只会删除该 block，而不是整段 range；
- `Ctrl/Cmd+A` 连按两次仍只停留在当前 block 文本范围；`Home` / `End` 则保持在文本局部语义，不会跨 block；
- 普通 block 下 `Ctrl/Cmd+Shift+V` 保持单 block 文本作用域；task block 下仍会 split；
- 多行 paste 的“首行丢失”现象已经定位：不是 engine 分裂错误，而是结构编辑后 `exitEditMode()` 会把旧 editor 的 stale text 回写覆盖新结果；同类覆盖也会影响中间位置 `Enter` split；
- `Escape` 已独立先行修复：编辑态会退出当前 block 编辑，block-range selection 下会清空当前选区；但它暂时还不承担更大的“多级作用域降级”职责。

### 本轮刻意不继续扩展的边角项

下面这些不是做不到，而是它们已经超出这份“80% 高频场景矩阵”的边界：

- Mac 侧的 redo 绑定（例如 `Cmd+Shift+Z`）不适合在当前 Windows 调试环境下代替验证；
- `Home` / `End` / `PageUp` / `PageDown` 这类非核心边界键，这轮先不纳入主矩阵；
- 右键菜单里每个具体菜单项在 block-range 场景下的执行语义，这轮只抽查了代表性的 `删除`，没有逐项点完全部菜单项；
- 更深层的 zoom / collapse / drag/drop 组合场景，这轮只保留了最常见的 subtree move 基线验证。

### 现在可以放心进入下一步的原因

因为这轮已经不再是“猜哪里有 bug”，而是看到了非常稳定的一条模式：

- 文本编辑主要走 CodeMirror 本地历史；
- 结构编辑主要走 `applyEngineResult()` 并脱离历史；
- block-range selection 是真实状态，但还没有被键盘语义正式承认。

这三条已经足够支撑下一轮 change 讨论，而且不会把范围无限做大。

所以这里的原则应该是：

**先围绕“结构编辑接入统一历史链”定义最小闭环，再决定哪些快捷键要继续统一提升。**

## 参考方向

下面这些参考不是产品必须严格对齐的目标，
但它们适合用来校准用户对常见编辑器 / outliner 行为的预期：

- Obsidian editing shortcuts: <https://help.obsidian.md/editing-shortcuts>
- Obsidian hotkeys: <https://help.obsidian.md/hotkeys>
- Workflowy keyboard shortcuts: <https://workflowy.com/learn/keyboard-shortcuts>

## 建议的设计方向

### 1）先定义清晰的 Outliner 作用域梯子

建议的概念梯子：

1. **文本作用域**：单个 block 内部的光标或文本选区；
2. **Block 作用域**：一个完整 block 作为内容单元；
3. **Block Range 作用域**：多个 block 按可见顺序形成的范围；
4. **可见 Outliner 作用域**：当前 zoom / collapse 上下文下的全部可见 block。

这条梯子并不意味着每个命令都必须支持每一层。
它的意义是：每一个命令家族，都必须明确回答“它在哪一层工作、如何提升、如何降级”。

### 2）把 `undo/redo` 视为同一套作用域模型的一部分

长期方向当然仍然是：用户感知上只有一套 history。
但对 V1 来说，不必一上来就把底层完全做成单一 history 引擎。

更现实也更稳的路线是：

- 文本历史继续主要由 CodeMirror 承担；
- 结构历史由 Outliner 层显式记录；
- `Mod-Z` / `Mod-Y` 通过一层很薄的 history 路由，先保留 CodeMirror 原生文本 undo/redo；只有当前文本 history 不可消费时，才回退到结构 history。

这里更关键的原则不是“底层必须完全统一”，而是：

- 历史记录应该按用户感知到的编辑作用域来定义；
- 而不是按底层恰好使用了哪个 API 来定义。

也就是说，真正决定历史语义的应该是“用户以为自己编辑了什么”，
而不是“底层先改了 CodeMirror 还是先改了树结构”。

### 3）按“操作家族”设计，而不是按单个快捷键打补丁

不要把 `Ctrl+Z`、`Ctrl+C`、`Shift+ArrowDown` 一个个孤立地修。
更好的做法是把常用行为分成几个家族：

- **导航**
- **选择**
- **剪贴板**
- **结构编辑**
- **格式化 / editor commands**
- **历史**

然后让每个家族都回答同一个问题：

> 在文本作用域、Block 作用域、Block Range 作用域、可见 Outliner 作用域下，这个家族分别怎么工作？

## 对各家族的建议语义

### 导航

- 普通箭头导航继续保持“先光标、后跨 block”；
- 一旦到达 block 边界，下一次导航允许跨 block；
- 扩选版导航应沿用同一套边界逻辑，而不是形成另一套规则。

### 选择

建议的长期规则：

- 第一层是文本选区；
- 再进一步可以提升成当前 block；
- 再进一步可以进入 block-range selection；
- `Esc` 应该负责清晰地降级或清空当前选择状态。

### 剪贴板

建议统一为：

- 文本选区复制纯文本；
- block-range selection 复制序列化后的 Outliner blocks；
- cut 与 copy 保持完全对称；
- paste 需要显式区分文本作用域和 block-range 作用域下的目标语义。

### 结构编辑

结构编辑应该对用户表现为原子操作，例如：

- split block；
- merge blocks；
- indent / outdent；
- 多行粘贴生成多个 block；
- drag/drop 移动 subtree。

### 格式化 / Editor Commands

通过 editor-command bridge 进入的格式化命令，
应当稳定地工作在文本作用域。
如果 V1 不支持 block-range 作用域，那也应当作为明确的非目标，而不是灰色地带。

### 历史

历史必须同时覆盖文本编辑与结构编辑。
用户不应该需要知道：

- 这次编辑是不是只发生在 CodeMirror 内部；
- 还是 Outliner 另外做了一次树结构重建。

## V1 可审版（供评审）

这一节只服务一个目的：

**把下一轮 change 压缩成一个可以直接审、可以直接否决、也可以直接放行的最小闭环。**

### 一句话目标

让 File Outliner 中最常见的结构编辑，第一次具备用户可感知的一致撤销 / 重做体验。

### 为什么是这一版

因为从 `9222` 验证结果看，当前最大断层不是“某个快捷键不够完整”，
而是：

- 文本编辑可以撤销；
- 结构编辑大多不能撤销；
- 用户不会把这两类编辑当成两套系统。

所以 V1 不追求把所有作用域模型一次做完，
只先补上这条最痛、最高频、最符合直觉的能力链。

### V1 范围（只做这些）

纳入 V1 的结构编辑只有这 6 类：

1. `Enter` split block；
2. 多行 `Ctrl/Cmd+V` 生成多个 block；
3. `Tab` / `Shift+Tab`；
4. 块首 `Backspace` merge prev；
5. 块尾 `Delete` merge next；
6. `drag/drop` move subtree / reorder。

V1 的验收目标只有一个：

- 这些操作之后，`Ctrl/Cmd+Z` 可以撤回；
- 撤回之后，`Ctrl/Cmd+Y` 可以重做；
- 不破坏现有文本编辑 `undo/redo`；
- 不改变现有鼠标进入编辑、zoom、range 清理这些已成立行为。

### V1 明确非目标

下面这些都先不做，避免范围膨胀：

- 不统一 `block-range` 的键盘 `copy/cut/delete/paste`；
- 不定义 `Ctrl/Cmd+A` 的一段式 / 多段式提升；
- 不让 `Shift+ArrowUp/Down` 进入跨 block 扩选；
- 不把右键菜单改成完整的 range-aware menu；
- 不把 collapse / zoom / 视图状态纳入完整 history；
- 不解决所有平台的 redo 差异；V1 先以 Windows 下的 `Ctrl+Y` 为主验收入口；
- 不把多行 paste / `Enter` split 的正确性修复混进结构 history change；这类恢复预期行为的 bug 先独立处理。

### 我建议的最小实现思路

原则：**只加一层很薄的结构 history 路由，不重写现有编辑架构。**

建议做法：

1. **文本历史继续交给 CodeMirror**
   - 普通输入、删除、文本格式化，仍然主要走 CM 本地 history；
   - V1 不尝试把文本 transaction 全部收编到 Outliner history。

2. **结构编辑统一进入一个 view-level helper**
   - 把 split / merge / indent / outdent / drag-drop / multiline paste 这些结构操作，统一通过一个薄封装提交；
   - 这个 helper 负责记录 `before` / `after` 快照，再调用现有的 `applyEngineResult()`。

3. **V1 直接存快照，不做 diff journal**
   - 为了简单和稳，V1 建议直接保存结构编辑前后的 `ParsedOutlinerFile` 快照，以及对应 selection / focus 信息；
   - 不做增量补丁、不做操作日志回放、不做事务合并器。

4. **`Mod-Z` / `Mod-Y` 只增加一层很薄的回退路由**
   - 编辑态先让 CodeMirror 自己消费文本 `undo/redo`；
   - 只有当当前编辑器没有可用的文本 history 时，才回退到结构 history；
   - 非编辑态（例如 drag/drop 之后）再由 outliner root 承接结构 `undo/redo`；
   - 这样做不完美，但已经足够覆盖最常见场景：用户刚 split / paste / tab / merge / drag 完就按撤销。

5. **恢复时只保证内容、焦点、选区稳定**
   - V1 不追求恢复所有临时 UI 细节；
   - 只保证 block 树、焦点 block、光标 / 选区位置、必要滚动定位是稳定的。

### 为什么这个方案不算过度设计

- 它不要求先发明一个新的总 history engine；
- 它不要求先统一所有作用域；
- 它不要求先决定 `Ctrl/Cmd+A`、`Shift+Arrow`、range 菜单这些更大的设计题；
- 它只是在现有结构编辑已经共享的入口上，补一条缺失的历史链。

换句话说，V1 修的是“断层”，不是“重构世界”。

### V1 验收矩阵

建议只用下面这组场景验收：

- 普通 block：`Enter` 后可 undo / redo；
- 普通 block：多行 `Ctrl/Cmd+V` 后可 undo / redo；
- 普通 block：`Tab` / `Shift+Tab` 后可 undo / redo；
- 普通 block：块首 `Backspace` merge 后可 undo / redo；
- 普通 block：块尾 `Delete` merge 后可 undo / redo；
- 普通 block：`drag/drop` move 后可 undo / redo；
- task block：至少覆盖 `Enter` 和多行 paste 两项 undo / redo；
- 对照项：普通文本输入的 `undo/redo` 不退化；
- 对照项：`ArrowUp/Down`、鼠标进编辑、range -> click display、range -> bullet zoom 不退化。

当前这一版实现已经通过 `9222` 做过一轮高频回归：

- `Enter` split、多行 paste split、`Tab` / `Shift+Tab`、块首 `Backspace`、块尾 `Delete`、drag/drop move 都已经验证可 undo / redo；
- 普通文本输入的 `Ctrl+Z` 仍优先走 CodeMirror 文本 history，没有被结构 history 抢走；
- Windows 下 `Ctrl+Y` 作为主要 redo 验收入口已经通过；
- `Ctrl+Shift+Z` 在合成事件探针里不稳定，因此这轮仍不把它作为 Windows 主验收口径。

### 风险与回退策略

V1 需要重点盯住的风险只有这几类：

- **历史串线**：结构 undo 抢走了本应属于文本 undo 的场景；
- **焦点漂移**：undo/redo 后编辑器焦点丢失或落到错误 block；
- **保存时机抖动**：undo/redo 导致额外保存或 dirty 标记异常；
- **快照引用污染**：历史项保存的是可变对象，回放时状态被后续编辑污染。

对应策略也保持最小化：

- 结构 history 只记录明确的结构操作；
- 快照必须是深拷贝，不复用可变引用；
- 如果某一类结构操作回放不稳定，可以单独从 V1 暂时移出，而不是拖垮整版；
- 实现时优先保证 undo 正确，再补 redo。

### 当前执行顺序决定

在正式进入 V1 结构 history 实现前，先处理一个独立 bug：

- **多行 `Ctrl/Cmd+V` 粘贴首行丢失 / `Enter` split 结果被旧编辑器回写覆盖**。

这样安排的原因很简单：

- `9222` 已确认：`pasteSplitLines()` / `splitAtSelection()` 的 engine 结果本身是对的；
- 真正根因在 view 层：结构编辑后若焦点切到新 block，`exitEditMode()` 会把旧 editor 的 stale text 无条件回写到新结构结果；
- 这本身就是当前真实存在、影响日常使用的 bug；
- 它属于恢复预期行为的问题，可以不先建 OpenSpec change 直接修；
- 如果不先修它，后面的 V1 history 验收会被 paste / split 本身的错误结果污染。

所以当前建议顺序明确为：

1. 先修这类“结构编辑后 stale commit 覆盖结果”的独立 bug；
2. 再实现 V1 的结构编辑 `undo/redo`；
3. `Esc` 不再绑进 V1 history change；它已经作为独立小修先行处理。

### 与 V2 / V3 的关系

V1 做完之后，文档里其他计划仍然保留，但都只作为后续路线：

- `block-range` 键盘语义进 V2；
- `Ctrl/Cmd+A` / `Shift+Arrow` 的作用域提升进 V2 或 V3；
- range-aware 菜单是否值得做，继续放在 TBD design。

## 建议的版本规划

这里按 28 原则来排，不追求一次把模型做完，
而是先把最常用、最痛、最容易形成稳定直觉的那部分闭环做好。

### V1：最小闭环，先只解决结构编辑历史

V1 的具体目标、非目标、实现思路、验收矩阵和风险控制，以上一节 **《V1 可审版（供评审）》** 为准。

这里不再重复展开，只保留一句话概括：

**先把最常见的结构编辑接入统一撤销 / 重做链，其余设计题全部后移。**

### V2：补高频键盘语义，但仍然只做高价值项

V2 再处理那些同样常用、但不如 undo/history 迫切的问题：

1. block-range selection 下的键盘 `copy/cut/delete`；
2. `Esc` 的统一清理 / 降级语义；
3. `Ctrl/Cmd+A` 的明确规则（至少先定一段式还是多段式）；
4. block-range 与文本编辑态之间的键盘承接规则。

V2 的目标不是“全统一”，而是让用户在多 block 选区上，
至少能做最基本、最常见的键盘编辑动作。

### V3：再讨论更完整的作用域提升与统一模型

V3 再进入那些更容易扩大设计面的议题：

1. `Shift+ArrowUp/Down` 是否应进入 block-range selection；
2. `Ctrl/Cmd+A` 是否采用多段式提升；
3. range-aware 右键菜单是否值得做；
4. 键盘选择和鼠标选择如何完全对齐；
5. collapse / zoom / 视图状态是否要进入 history。

这些问题都是真问题，
但它们更适合作为 `TBD design`，而不是压进 V1。 

## 留给 V2 / V3 的 TBD Design

下面这些问题仍然要写下来，但它们不应该阻塞 V1：

- `Ctrl/Cmd+A` 应该是一段式还是多段式？
- block-range selection 下的 `paste` 应该替换、插入，还是必须要求光标目标？
- collapse / zoom 状态是否要进入 undo history，还是只做 best-effort 恢复？
- 多 block 操作默认应该基于 visible order、tree order，还是 subtree 语义？
- 输入法（IME / 中文组合输入）的 history grouping 规则是什么？
- range-aware 右键菜单到底值不值得做，还是明确保持单块语义即可？

## 我建议下一份文档怎么写

下一份更正式的文档，不要再试图把所有问题一次写完。
更好的写法是：

- **正文只写 V1**：结构编辑 history 的目标、非目标、实现边界、验收矩阵；
- **附录列出 V2 / V3**：只写方向和 TBD 问题，不写过深实现；
- **把多行 paste 首行疑似丢失单独拆成 bug**，不要混进 history change；
- **明确平台差异**：Windows 以 `Ctrl+Y` 为主要 redo 验收入口，`Ctrl+Shift+Z` 暂不作为 V1 主验收。

等这份 V1 文档成熟后，再把它抽成 OpenSpec change，会更稳，也更不容易返工。
