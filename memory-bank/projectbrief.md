# σ₁: Project Brief
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-20*
*Π: DEVELOPMENT | Ω: EXECUTE*

> Status (2026-02 / v2.0.0): This project brief is historical. Timeline / Time Section were removed in v2.0.0; the current mainline is Outliner + `blp-view` + Inline Edit + Block Links. Treat the `blp-timeline` sections below as archive/reference only.

## 🏆 Overview
Block Link Plus 是一个功能强大的 Obsidian 插件，专注于增强块级链接和内容聚合功能。当前正在开发 `blp-timeline` 功能，这是一个**章节级时间线聚合器**，能够从多个文件中提取符合条件的时间章节，并以嵌入链接的形式动态生成时间线视图。

## 📋 Requirements

### 🎯 Core Requirements (已完成)
- **[R₁] 基础块链接**: 支持创建和管理块级别的链接 ✅
- **[R₂] 多行块支持**: 处理跨多行的内容块 ✅  
- **[R₃] 别名类型**: 支持多种链接别名格式 ✅
- **[R₄] URI 链接**: 支持外部链接访问 ✅
- **[R₅] 时间章节**: 集成日记和时间相关功能 ✅
- **[R₆] 内联编辑**: 通过 Basics 插件集成提供内联编辑功能 ✅

### 🚀 New Requirements (开发中)
- **[R₇] blp-timeline 章节级聚合**: 
  - **[R₇.1] 章节级查询**: 能够从文件中提取特定级别的标题章节
  - **[R₇.2] 内容匹配**: 支持基于链接和标签的章节内容过滤
  - **[R₇.3] 时间线渲染**: 生成按日期分组的章节嵌入链接
  - **[R₇.4] 动态更新**: 支持文件内容的动态写入和哈希比较
  - **[R₇.5] 防抖机制**: 实现 300ms 延迟避免频繁更新

### 📊 Technical Requirements
- **[T₁] 模块化架构**: 清晰的功能模块分离 ✅
- **[T₂] TypeScript 支持**: 完整的类型定义 ✅
- **[T₃] Dataview 集成**: 依赖 Dataview 插件进行查询 ✅
- **[T₄] 性能优化**: 支持大量文件的高效处理 🔄
- **[T₅] 错误处理**: 完善的异常处理和用户反馈 🔄

## 🎨 Feature Specifications

### `blp-timeline` 功能详细规格

#### 📝 配置格式
```yaml
source_folders: ["Review/Daily"]
within_days: 30
heading_level: 4
embed_format: "!!"  # "!!" or "!"
sort_order: "desc"
filters:
  relation: "AND"
  links:
    relation: "AND"
    link_to_current_file: false
    items:
      - "[[改进clixon的配置输出形式增加便利性]]"
  tags:
    relation: "OR"
    items: ["project", "task"]
    from_frontmatter:
      key: "tags"
      exclude: ["archived"]
```

#### 🎯 渲染输出格式
```markdown
[[2025-6-18]]
!![[2025-6-18#16:19]]

---

[[2025-6-19]]
!![[2025-6-19#16:19]]
!![[2025-6-19#20:19]]
```

#### 🔧 技术实现特点
- **章节级解析**: 解析文件中的标题结构，提取目标级别的章节
- **内容匹配**: 检查每个章节的内容是否包含指定的链接或标签
- **动态区域管理**: 使用 HTML 注释标记管理动态内容区域
- **哈希比较**: 通过内容哈希避免不必要的文件修改
- **防抖优化**: 300ms 延迟机制防止频繁触发

## 🏗️ Architecture Overview

### 模块结构
```
src/features/dataview-timeline/
├── index.ts              # 主入口，协调整个流程
├── region-parser.ts      # 动态区域解析和哈希管理
├── filter-resolver.ts    # 过滤器解析（标签、链接）
└── query-builder.ts      # 查询构建和章节级处理
```

### 数据流
1. **配置解析** → YAML 配置转换为 `TimelineConfig`
2. **过滤器解析** → 解析标签和链接过滤条件
3. **文件查询** → 基于 Dataview 查询符合条件的文件
4. **章节提取** → 从文件中提取目标级别的章节
5. **内容匹配** → 检查章节内容是否符合过滤条件
6. **渲染生成** → 生成嵌入链接格式的时间线
7. **文件写入** → 更新动态区域内容（带哈希比较）

## 🎯 Success Criteria

### Phase 6.2 完成标准
- ✅ **配置扩展**: `TimelineConfig` 支持章节级配置选项
- ✅ **章节解析**: 能够正确提取和匹配时间章节
- ✅ **渲染输出**: 生成正确的 `!![[文件名#章节标题]]` 格式
- ✅ **文件写入**: 实现动态区域更新和哈希比较
- ✅ **性能优化**: 300ms 防抖机制正常工作

### 用户体验标准
- **直观配置**: YAML 配置简单明了，易于理解
- **快速响应**: 大多数查询在 2 秒内完成
- **准确匹配**: 章节匹配准确率 > 95%
- **稳定运行**: 无循环更新或性能问题

## 🔗 Dependencies & Integration

### 核心依赖
- **Obsidian API**: 文件操作和渲染
- **Dataview Plugin**: 查询引擎和数据访问
- **js-yaml**: YAML 配置解析
- **luxon**: 日期时间处理

### 集成模块
- **Region Parser**: 动态区域管理
- **Filter Resolver**: 过滤条件处理  
- **Query Builder**: 查询构建和执行

## 📈 Future Roadmap

### 短期计划 (1-2 周)
- 完成章节级功能实现
- 添加基础测试覆盖
- 性能优化和错误处理

### 中期计划 (1-2 月)
- 扩展配置选项（自定义时间格式、标题模式等）
- 添加可视化时间线视图
- 完善用户文档和示例

### 长期愿景 (3-6 月)
- 支持更多内容类型的聚合
- 集成其他插件生态
- 社区贡献和插件市场发布
