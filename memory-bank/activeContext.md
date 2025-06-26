# σ₄: Active Context
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-20*
*Π: DEVELOPMENT | Ω: EXECUTE*

## 🔮 Current Focus
当前焦点是完成 `blp-timeline` 功能的**章节级时间线渲染**实现。经过深入分析，发现当前实现仅支持文件级别的查询，但实际需求是**章节级别的时间线聚合**，类似于 `viewUtils.js` 中的 `renderTimeline` 函数。

## 📎 Context References
- 📄 Active Files: 
  - `src/features/dataview-timeline/index.ts` (主入口，需要重构渲染部分)
  - `src/features/dataview-timeline/query-builder.ts` (需要添加章节级查询逻辑)
  - `src/features/dataview-timeline/region-parser.ts` (完整，支持哈希机制)
  - `src/features/dataview-timeline/filter-resolver.ts` (完整，过滤器解析)
  - `c:\Users\ZY\Git\Note\Scripts\viewUtils.js` (参考实现)
- 💻 Active Code: 
  - `handleTimeline` (需要从 JSON 调试输出改为章节级渲染)
  - `executeTimelineQuery` (需要扩展为章节级查询)
  - `renderTimeline` (参考实现，章节级时间线渲染)
- 📚 Active Docs: `progress.md`, `projectbrief.md`
- 📁 Active Folders: `src/features/dataview-timeline`, `memory-bank`
- 🔄 Git References: N/A
- 📏 Active Rules: CursorRIPER♦Σ Lite 1.0.0

## 📡 Context Status
- 🟢 **Active**: 
  - `blp-timeline` 章节级时间线功能开发
  - Memory Bank 文档全面更新
  - 基础架构（配置解析、过滤器、动态区域解析）
- 🟡 **Partially Relevant**: 
  - 当前的文件级查询逻辑（需要扩展为章节级）
- 🟣 **Essential**: 
  - 实现章节级内容解析和匹配
  - 生成正确的 `!![[文件名#章节标题]]` 格式
  - 添加嵌入格式配置项（`!![[]]` vs `![[]]`）
  - 实现防抖和哈希比较机制
- 🔴 **Deprecated**:
  - 文件级别的简单链接生成思路
  - 当前的 JSON 调试输出（将被章节级渲染替代）

## 🎯 Immediate Next Steps

### 短期目标
1. ➡️ **扩展 `TimelineConfig` 接口**: 添加章节级配置选项（标题级别、嵌入格式等）
2. ➡️ **重构 `query-builder.ts`**: 添加章节级查询和内容匹配逻辑
3. ➡️ **实现章节级渲染**: 在 `index.ts` 中生成正确的嵌入格式
4. ➡️ **添加文件写入逻辑**: 实现动态区域更新和哈希比较

### 中期目标
1. 🔄 **完善配置选项**: 支持标题级别、嵌入格式、时间格式等自定义
2. 🔄 **性能优化**: 实现 300ms 防抖机制
3. 🔄 **错误处理**: 完善章节解析的异常处理
4. 🔄 **测试覆盖**: 为章节级功能编写测试用例

## 🚨 Critical Insights
- **需求误解纠正**: 之前理解为文件级链接，实际需求是章节级时间线聚合
- **参考实现发现**: `viewUtils.js` 的 `renderTimeline` 提供了完整的章节级实现模式
- **技术架构验证**: 现有的基础设施（配置解析、过滤器、动态区域）完全适用
- **实现复杂度**: 章节级实现比文件级复杂，需要内容解析和章节匹配逻辑