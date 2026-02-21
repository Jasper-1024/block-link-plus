# 2026-02-21 Outliner Embed (![[...]]) 渲染缩进/行距差异调查记录

## 背景 / 目标
- 现象：在 BLP File Outliner v2 的“预览/展示态”(display) 下，`![[file#heading]]` / `![[file#^id]]` 等 internal embed 渲染出来的缩进 + 行间距，与：
  - 原生 Obsidian 的 Reading mode / Preview
  - 以及同一个 embed 点击进入 BLP inline editor(CM6) 后的呈现
  明显不一致。
- 约束：必须用 Obsidian remote debugging (CDP) 端口 `9222` 做可重复验证 + 截图对比；最终修复需要尽量“像原生”，且避免写死 magic number。

## 用户复现文件
- Vault basePath（CDP 读取）：`C:\Users\stati\Git\temp\temp`
- 你反馈一直不生效的真实文件：`C:\Users\stati\Git\temp\temp\3\sample.md`

## 典型症状（截图描述）
- 同一个 block 引用（同一个 `src` 的 `![[...]]`），在 outliner 里会出现两个视觉上差异很大的版本：
  - 未点击：走 outliner display 的 markdown preview 子树
  - 点击后：embed 进入 `.blp-inline-edit-active`，挂载 inline editor，呈现更接近“正常”
- 差异主要集中在：list 的 indent、段落/标题/列表之间的行距(gap)、以及整体 embed 内边距。
## 已定位的关键差异（9222 / CDP 证据）

> 下面的“数值证据”和截图来自 `.tmp` 目录下的 CDP 脚本测量与截图（见文末脚本/截图清单）。

### 1) embed 预览态 list 缩进异常（最直观）
- Outliner display (未点击、纯 preview 子树)：
  - `ul` 的 `padding-left` 被算成了 **40px**（接近 UA 默认值）
  - 导致列表整体缩进非常夸张，看起来像你截图里的“更往右 + 更松散”。
- Native preview（Obsidian 原生 Preview）：
  - `ul.padding-left` 为 **0px**
  - 列表缩进主要由 Obsidian 的 list DOM 装饰（如 `.list-bullet` / `ul.has-list-bullet`）与主题 CSS 决定。

### 2) 点击进入 inline editor 后“看起来正常”的原因
- 点击同一个 embed 后，会进入 `.blp-inline-edit-active`：
  - preview 子树会被隐藏/替换
  - 渲染转为 CM6 inline editor 的列表缩进模型
- 所以同一个 `src` 的 embed，在“预览态 vs inline edit 态”会出现显著视觉差异。

## 当时确认的根因（旧版输出 CSS 上）
- 旧版输出的 `styles.css`（Obsidian 实际加载的那份）里，对 outliner embed preview 子树存在 reset：
  - `.blp-file-outliner-view .blp-file-outliner-display .internal-embed.markdown-embed .markdown-preview-view ul/ol { padding-left: revert !important; }`
- 在这个上下文里 `revert` 回退到了 UA 默认 `40px`，而不是 Obsidian 主题想要的 list 表现。

## 方案 A（最小影响范围）
- 核心思路：只在 outliner 的 embed preview 子树里，把 `ul/ol` 的 `padding-left` 固定回 `0`，让缩进表现回到和 native preview 更一致。
- 代码落点（当前工作区，未 commit）：
  - `C:\Users\stati\Git\blp\block-link-plus\src\css\custom-styles.css`
  - 规则：
    - `.blp-file-outliner-view .blp-file-outliner-display .internal-embed.markdown-embed .markdown-preview-view ul, ol { padding-left: 0 !important; }`

## 当前状态（重要）
- 我在 `_blp_tmp` 的“可控复现文件”里，用 9222 测量确认过：embed preview 子树内 `ul.paddingLeft = "0px"`。
- 但你反馈：`C:\Users\stati\Git\temp\temp\3\sample.md` 这个真实文件在 outliner 打开后仍“看起来完全没变化”。
  - 这说明我们还缺一段 **针对 sample.md 的 9222 实测数据** 来确认：
    - 新 CSS 是否真的被加载到了运行中的 Obsidian
    - 真实文件的 embed DOM 是否和 `_blp_tmp` 场景不同
    - 是否还有其它 CSS 覆盖/冲突
## 环境核对（非常关键：是否改对目录）
- Obsidian 实际加载的插件目录（CDP `manifest.dir` + vault basePath）：
  - `C:\Users\stati\Git\temp\temp\.obsidian\plugins\block-link-plus`
- 该目录在本机上是 **符号链接**：
  - `C:\Users\stati\Git\temp\temp\.obsidian\plugins\block-link-plus` -> `C:\Users\stati\Git\blp\block-link-plus`
- 结论：你在 `C:\Users\stati\Git\blp\block-link-plus` 里改的代码/产物，Obsidian 会直接加载到（前提是改的是它真正用到的文件，比如 `styles.css`）。

## 构建相关问题（你贴的 npm run build 报错）
### 报错
- `EPERM: operation not permitted, rename '...\main.css' -> '...\styles.css'`
- 触发点：`esbuild.config.mjs` 里的 `rename-styles` 插件在 `onEnd` 里执行 `fs.renameSync(outcss, fixcss)`。

### 已做的修复（当前工作区，未 commit）
- 文件：`C:\Users\stati\Git\blp\block-link-plus\esbuild.config.mjs`
- 处理：rename 失败时 fallback 为 copy + unlink（Windows 下目标文件已存在/被占用时更稳）
  - `fs.renameSync(outcss, fixcss)`
  - `catch => fs.copyFileSync(outcss, fixcss); fs.unlinkSync(outcss)`

### 仍可能遇到的情况
- 如果 Obsidian 正在占用/锁定 `styles.css`（Windows 有时会 deny-write），即使 copy 也可能失败。
  - 这种情况下需要：关闭 Obsidian 或禁用插件后再 build。

## 如何确认“修复真的加载到了运行中的 Obsidian”
- 方式 1（文件级）：检查插件目录下 `styles.css` 是否包含 outliner embed 的新规则。
  - `C:\Users\stati\Git\temp\temp\.obsidian\plugins\block-link-plus\styles.css`
- 方式 2（运行时级，推荐）：用 9222/CDP 直接测 `getComputedStyle(ul).paddingLeft`。
  - 对你的真实文件 `sample.md` 最靠谱。
## 9222 / CDP 调试工作流（可复现）

### 前置条件
- Obsidian 已使用 remote debugging 启动：`--remote-debugging-port=9222`
- 调试脚本入口：`C:\Users\stati\Git\blp\block-link-plus\scripts\obsidian-cdp.js`
- 临时脚本与截图目录：`C:\Users\stati\Git\blp\block-link-plus\.tmp`

### 常用命令
```bat
:: 列出 CDP targets
node scripts\obsidian-cdp.js list

:: 在 Obsidian 内执行 JS（返回 JSON）
node scripts\obsidian-cdp.js eval "(async()=>app.workspace.getActiveFile()?.path)()"

:: 执行一个 .js 脚本文件（推荐，避免命令行转义）
node scripts\obsidian-cdp.js eval-file ".tmp\cdp-realistic-outliner-embeds-setup.js"

:: 截图（保存到 repo 的 .tmp 下）
node scripts\obsidian-cdp.js screenshot ".tmp\shot.png"
```

## 关键 CDP 脚本清单（绝对路径）

### A) 构建可控复现场景（_blp_tmp）
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-realistic-outliner-embeds-setup.js`
  - 创建：`_blp_tmp/real-src.md` / `_blp_tmp/real-outliner.md` / `_blp_tmp/real-native-host.md`
  - 重载插件并打开 outliner view
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-realistic-open-outliner.js`
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-realistic-open-native-preview.js`

### B) 测量/对比（数值化定位）
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-realistic-outliner-embeds-measure.js`
  - 输出各 embed（heading/block/range/file）的 preview padding / ul padding / gaps 等
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-realistic-compare-inline-vs-preview.js`
  - 同一 `src` 的 embed：未点击 vs 点击进入 inline edit 的 computed style 对比
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-embed-preview-compare.js`
  - Outliner preview vs Native preview 的 embed DOM + computed style 对比（更通用）

### C) 运行时补丁验证（当时的 A/B/C runtime patch）
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-apply-outliner-embed-real-patch-A.js`
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-apply-outliner-embed-real-patch-B.js`
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-apply-outliner-embed-real-patch-C-native.js`
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-remove-outliner-embed-real-patches.js`

### D) 其它诊断脚本（历史排查用）
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-outliner-preview-vs-inline-edit.js`
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-diagnose-outliner-embed-gaps.js`
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-diagnose-outliner-display-spacing.js`
## 关键截图清单（绝对路径）

### 1) 当时 runtime patch 的对比图
- Baseline（未打补丁，缩进异常更明显）：
  - `C:\Users\stati\Git\blp\block-link-plus\.tmp\baseline-outliner-preview.png`
- Patch A：
  - `C:\Users\stati\Git\blp\block-link-plus\.tmp\patchA-outliner-preview.png`
- Patch B：
  - `C:\Users\stati\Git\blp\block-link-plus\.tmp\patchB-outliner-preview.png`
- Patch C：
  - `C:\Users\stati\Git\blp\block-link-plus\.tmp\patchC-outliner-preview.png`

### 2) 诊断截图（preview / inline edit / native）
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\diag-outliner-preview2.png`
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\diag-outliner-inline-edit2.png`
- `C:\Users\stati\Git\blp\block-link-plus\.tmp\diag-native-preview.png`

### 3) 当前“代码版方案 A”验证截图（_blp_tmp 场景）
- Outliner 预览态：`C:\Users\stati\Git\blp\block-link-plus\.tmp\A-code-outliner-preview.png`
- Outliner inline edit：`C:\Users\stati\Git\blp\block-link-plus\.tmp\A-code-outliner-inline-edit.png`
- Native preview：`C:\Users\stati\Git\blp\block-link-plus\.tmp\A-code-native-preview.png`
## 当前工作区改动（未 commit / 未 push）
- CSS（方案 A）：
  - `C:\Users\stati\Git\blp\block-link-plus\src\css\custom-styles.css`
- 版本号：
  - `C:\Users\stati\Git\blp\block-link-plus\manifest.json`（2.0.5 -> 2.0.6）
  - `C:\Users\stati\Git\blp\block-link-plus\package.json`（2.0.5 -> 2.0.6）
  - `C:\Users\stati\Git\blp\block-link-plus\versions.json`（新增 2.0.6 映射）
- 构建脚本（Windows rename EPERM 修复）：
  - `C:\Users\stati\Git\blp\block-link-plus\esbuild.config.mjs`

## 仍需补齐的关键信息（针对 sample.md）
- 必须在你真实文件 `C:\Users\stati\Git\temp\temp\3\sample.md` 打开 outliner 后，用 9222/CDP：
  - 定位对应 embed 的 DOM（找到 `.internal-embed.markdown-embed[src="..."]`）
  - 直接测：embed preview 子树里 `ul/ol` 的 `paddingLeft`、以及 preview 的 `paddingLeft` / block gaps
- 如果测出来 `ul.paddingLeft` 仍是 40px 或其它异常：说明新 CSS 没被加载 / 或被覆盖（再沿 CSS specificity 继续追）。
- 如果 `ul.paddingLeft` 已是 0px 但视觉仍异常：说明问题不止 list padding（需要继续测 white-space / margin / embed padding / list DOM 装饰差异）。
## 补充：更多相关脚本（绝对路径）
- realistic 场景清理/还原设置：
  - `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-realistic-outliner-embeds-cleanup.js`
- 变量/空白/间距诊断：
  - `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-diagnose-embed-padding-vars.js`
  - `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-diagnose-native-preview-white-space.js`
  - `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-diagnose-outliner-embed-gaps.js`
  - `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-diagnose-outliner-embed-gaps-domcleanup.js`
- 旧的“选项汇总/评估”脚本（会输出 summary JSON）：
  - `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-eval-outliner-embed-fix-options.js`
  - `C:\Users\stati\Git\blp\block-link-plus\.tmp\cdp-eval-outliner-embed-fix-options-summary.js`

> `.tmp` 目录下还有更多一次性脚本；如果要完整清单，可以直接查看：`C:\Users\stati\Git\blp\block-link-plus\.tmp`。

## 2026-02-21 最终结论（修复落地）

本问题最终确认是 **多因素叠加**，核心都发生在 outliner 的 display 模式里，embed 走的是 `.markdown-preview-view` 的预览子树，而 inline editor 则是 CM6 的行模型，所以“看起来像同一个 embed 的两种版本”。

### 根因与修复点（CSS-only）

1) **异常大空白（最早那个“横向/竖向都多出大量空间”）**
- 根因：`.blp-file-outliner-display p { white-space: pre-wrap; }` 会把 embed preview DOM 里的 `\\n` 文本节点也渲染出来。
- 修复：仅在 outliner display 的 embed preview 容器内，把 `white-space` 改回 `normal`。

2) **列表 marker 丢失 / 被裁切（`- bb` 那个子项不见）**
- 根因：embed preview 容器存在 `overflow: auto`，而 list marker 是 `outside`，如果顶层 `ul/ol` 左侧 padding 过小，会把 marker 绘制到盒子外导致被裁掉。
- 修复：给 embed preview 的顶层 `ul/ol` 保留最小左侧空间（当前取 `1em`）。

3) **`aa` 与 `- bb` 之间竖向间距偏大（最后只差一点的那个 gap）**
- 根因：为了“恢复原生段落/列表 spacing”使用了 `margin: revert`，导致 `p` 与 `ul/ol` 回退到 UA 默认 1em margin，并触发 margin collapse，形成明显空隙；而 inline editor 是 line-based，几乎没有这个 gap。
- 修复：只针对 `p -> (ul/ol)` 相邻边界收紧 margin（`p + ul/ol { margin-top: 0 }` + `p:has(+ ul/ol) { margin-bottom: 0 }`，并用 `@supports` 包起来），避免影响其它块级元素间距。

### 架构/维护取舍（记录）
- `margin: revert` 的副作用：它回退到 UA 默认 margin，可能与某些主题对 preview 的精调不一致（视觉一致性风险）。但它能保留“空行/段落”在预览态的自然表现，所以目前选择保留，并只在必要边界做微调。
- 选择器较长：是刻意把影响范围锁死在 outliner display 的 embed preview 内，避免污染原生阅读视图/普通 embeds；代价是后续排查 CSS 覆盖关系会更费一点。
- `:has()`：用于“选中前一个段落元素”这类场景；已用 `@supports selector(p:has(+ ul))` 做保护。在 Obsidian 当前的 Chromium 环境里可用；若未来环境不支持，则该项会退化为只压 list 的 `margin-top`，仍不会破坏其它布局。

### 相关代码位置
- CSS：`src/css/custom-styles.css`（Outliner embeds 样式段）
