# 🔣 Symbol Reference Guide
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-20*

> Status (2026-02 / v2.0.0): This guide includes symbols for historical modules (Timeline / Time Section) that were removed in v2.0.0. Keep for archive/reference; for current features, prioritize Outliner + `blp-view` + Inline Edit.

## 📁 File & Directory Symbols

### Core Directories
- 📂 = `/memory-bank/` - 项目文档存储目录
- 📦 = `/memory-bank/backups/` - 文档备份目录
- 🏠 = `/` - 项目根目录
- 📁 = `/src/` - 源代码目录
- ⚙️ = `/src/features/` - 功能模块目录
- 🧠 = `/src/core/` - 核心功能目录
- 🎨 = `/src/ui/` - 用户界面目录
- 🔧 = `/src/basics/` - Basics 插件集成目录

### Feature-Specific Directories
- ⏰ = `/src/features/dataview-timeline/` - 时间线功能目录
- 🌊 = `/src/features/flow-editor/` - Flow Editor 功能目录
- 📊 = `/src/features/dataview-timeline/query-builder.ts` - 查询构建器
- 🔍 = `/src/features/dataview-timeline/filter-resolver.ts` - 过滤器解析器
- 📝 = `/src/features/dataview-timeline/region-parser.ts` - 区域解析器
- 🎯 = `/src/features/dataview-timeline/index.ts` - 时间线主入口

## 📄 Memory Bank Files (𝕄)

### Core Documentation Files
- 📋 = `📂projectbrief.md` (𝕄[0]) - 项目概述和需求
- 🏛️ = `📂systemPatterns.md` (𝕄[1]) - 系统架构和模式
- 💻 = `📂techContext.md` (𝕄[2]) - 技术栈和环境
- 🔮 = `📂activeContext.md` (𝕄[3]) - 当前活动上下文
- 📊 = `📂progress.md` (𝕄[4]) - 进度跟踪
- 🔣 = `📂symbols.md` - 符号参考指南（本文件）

### Memory Bank Operations
- σ₁ = 📋𝕄[0] ⟶ requirements ∧ scope ∧ criteria
- σ₂ = 🏛️𝕄[1] ⟶ architecture ∧ components ∧ decisions  
- σ₃ = 💻𝕄[2] ⟶ stack ∧ environment ∧ dependencies
- σ₄ = 🔮𝕄[3] ⟶ focus ∧ changes ∧ next_steps ∧ context_references
- σ₅ = 📊𝕄[4] ⟶ status ∧ milestones ∧ issues

## 🔄 RIPER Framework Symbols

### Mode Symbols (Ω)
- Ω₁ = 🔍R ⟶ RESEARCH Mode - 研究和信息收集
- Ω₂ = 💡I ⟶ INNOVATE Mode - 创新和方案设计
- Ω₃ = 📝P ⟶ PLAN Mode - 计划和规划
- Ω₄ = ⚙️E ⟶ EXECUTE Mode - 执行和实现
- Ω₅ = 🔎RV ⟶ REVIEW Mode - 审查和验证

### Phase Symbols (Π)
- Π₁ = 🌱UNINITIATED ⟶ 框架未初始化
- Π₂ = 🚧INITIALIZING ⟶ 初始化阶段
- Π₃ = 🏗️DEVELOPMENT ⟶ 开发阶段
- Π₄ = 🔧MAINTENANCE ⟶ 维护阶段

### Task Set Symbols (𝕋)
- 𝕋[0:3] = [read_files, ask_questions, observe_code, document_findings]
- 𝕋[4:6] = [suggest_ideas, explore_options, evaluate_approaches]
- 𝕋[7:9] = [create_plan, detail_specifications, sequence_steps]
- 𝕋[10:12] = [implement_code, follow_plan, test_implementation]
- 𝕋[13:15] = [validate_output, verify_against_plan, report_deviations]

## 🎯 Timeline Feature Symbols

### Configuration Symbols
- ⚙️📊 = `TimelineConfig` - 时间线配置接口
- 🔍📊 = `FilterConfig` - 过滤器配置
- 🏷️📊 = `TagFilter` - 标签过滤器
- 🔗📊 = `LinkFilter` - 链接过滤器
- 📅📊 = `DateFilter` - 日期过滤器

### Processing Symbols
- 🔄📊 = `TimelineProcessor` - 时间线处理器
- 📝📊 = `SectionExtractor` - 章节提取器
- 🔍📊 = `ContentMatcher` - 内容匹配器
- 🔗📊 = `LinkGenerator` - 链接生成器
- 💾📊 = `FileWriter` - 文件写入器

### Data Structure Symbols
- 📄📊 = `TimeSection` - 时间章节数据结构
- 📋📊 = `DataviewPage` - Dataview 页面接口
- 🎯📊 = `TimelineContext` - 时间线上下文
- 🏷️📊 = `DynamicRegion` - 动态区域标记

## 🔧 Technical Implementation Symbols

### File Operations
- 📖 = File Read Operation - 文件读取操作
- ✏️ = File Write Operation - 文件写入操作
- 🔄 = File Modify Operation - 文件修改操作
- 🗑️ = File Delete Operation - 文件删除操作
- 📁 = Directory Operation - 目录操作

### Processing States
- ⏳ = Processing - 处理中
- ✅ = Completed - 已完成
- ❌ = Failed - 失败
- ⚠️ = Warning - 警告
- 🔄 = In Progress - 进行中
- ⏸️ = Paused - 暂停
- 🚫 = Blocked - 阻塞

### Performance Symbols
- ⚡ = Fast Operation - 快速操作
- 🐌 = Slow Operation - 慢速操作
- 💾 = Memory Usage - 内存使用
- 🔥 = CPU Intensive - CPU 密集
- 🌊 = I/O Intensive - I/O 密集
- 📊 = Performance Metric - 性能指标

## 🧩 Architecture Component Symbols

### Core Components
- 🎛️ = Main Controller - 主控制器 (`src/main.ts`)
- 🎪 = Feature Manager - 功能管理器
- 🔌 = Plugin Integration - 插件集成
- 🎨 = UI Component - UI 组件
- 🧠 = Core Logic - 核心逻辑

### Integration Symbols
- 🔗 = API Integration - API 集成
- 📡 = Event Communication - 事件通信
- 🚌 = Message Bus - 消息总线
- 🔄 = Data Flow - 数据流
- 🎯 = Dependency Injection - 依赖注入

### Security Symbols
- 🔒 = Secure Operation - 安全操作
- 🛡️ = Protection Layer - 保护层
- 🔑 = Authentication - 认证
- 🚪 = Access Control - 访问控制
- 🔍 = Validation - 验证

## 📊 Status & Progress Symbols

### Project Status
- 🟢 = Active/Healthy - 活跃/健康
- 🟡 = Warning/Attention - 警告/需注意
- 🔴 = Error/Critical - 错误/严重
- 🟣 = Important/Priority - 重要/优先
- ⚪ = Inactive/Disabled - 非活跃/禁用
- 🔵 = Information - 信息

### Development Phases
- 🌱 = Planning - 规划阶段
- 🚧 = Development - 开发阶段
- 🧪 = Testing - 测试阶段
- 🚀 = Deployment - 部署阶段
- 🔧 = Maintenance - 维护阶段
- 📚 = Documentation - 文档阶段

### Task Priorities
- 🔥 = Critical/Urgent - 严重/紧急
- ⭐ = High Priority - 高优先级
- 📝 = Medium Priority - 中优先级
- 📋 = Low Priority - 低优先级
- 💡 = Enhancement - 增强功能
- 🐛 = Bug Fix - 错误修复

## 🔄 Workflow Symbols

### Git Operations
- 📥 = Pull/Fetch - 拉取
- 📤 = Push - 推送
- 🔀 = Merge - 合并
- 🌿 = Branch - 分支
- 🏷️ = Tag - 标签
- 📋 = Commit - 提交

### Build & Deploy
- 🔨 = Build - 构建
- 📦 = Package - 打包
- 🚀 = Deploy - 部署
- 🧪 = Test - 测试
- 📊 = Analyze - 分析
- 🔍 = Lint - 代码检查

## 💻 Code Quality Symbols

### Code Health
- ✨ = Clean Code - 整洁代码
- 🧹 = Refactored - 已重构
- 📏 = Formatted - 已格式化
- 🔍 = Reviewed - 已审查
- 📚 = Documented - 已文档化
- 🧪 = Tested - 已测试

### Technical Debt
- 💸 = Technical Debt - 技术债务
- 🏗️ = Architecture Debt - 架构债务
- 📝 = Documentation Debt - 文档债务
- 🧪 = Testing Debt - 测试债务
- 🔧 = Maintenance Debt - 维护债务

## 🎯 Feature-Specific Symbols

### Timeline Feature (blp-timeline)
- ⏰📊 = Timeline Feature - 时间线功能
- 📅📊 = Daily Notes - 日记笔记
- 🕐📊 = Time Sections - 时间章节
- 🔗📊 = Section Links - 章节链接
- 📝📊 = Dynamic Content - 动态内容
- 🏷️📊 = Content Tags - 内容标签

### Flow Editor Feature
- 🌊📝 = Flow Editor - 流编辑器
- ✏️📝 = Inline Editing - 内联编辑
- 🎨📝 = UI Components - UI 组件
- ⚡📝 = Live Updates - 实时更新

## 🔤 Cross-Reference Symbols

### Standard References
- ↗️ = Cross Reference - 交叉引用
- 📎 = Link/Connection - 链接/连接
- 🔄 = Bidirectional - 双向
- ➡️ = Forward Reference - 前向引用
- ⬅️ = Backward Reference - 后向引用

### Reference Types
- χ_refs = Cross-reference system - 交叉引用系统
- [↗️σ₁:R₁] = Reference to requirement R₁ in project brief
- [↗️σ₂:P₁] = Reference to pattern P₁ in system patterns
- [↗️σ₃:T₁] = Reference to technology T₁ in tech context
- [↗️σ₄:C₁] = Reference to context C₁ in active context
- [↗️σ₅:M₁] = Reference to milestone M₁ in progress

## 🔧 Operational Symbols

### System Operations
- Φ_file = File system operations - 文件系统操作
- Φ_mode_transition = Mode transition operations - 模式转换操作
- Σ_memory = Memory system operations - 内存系统操作
- Σ_backup = Backup system operations - 备份系统操作
- Δ₁₋₄ = Safety protocols - 安全协议

### Backup Operations
- 📦⏰ = Timestamp backup - 时间戳备份
- 📦🚨 = Emergency backup - 紧急备份
- 📦🔄 = Routine backup - 常规备份
- 📦📋 = Manual backup - 手动备份

## 📚 Documentation Symbols

### Document Types
- 📖 = User Guide - 用户指南
- 📋 = API Reference - API 参考
- 🎯 = Tutorial - 教程
- 🔧 = Technical Spec - 技术规范
- 📊 = Report - 报告
- 📝 = Notes - 笔记

### Documentation Status
- ✅📚 = Complete Documentation - 完整文档
- 🚧📚 = In Progress Documentation - 进行中文档
- ⚠️📚 = Outdated Documentation - 过时文档
- ❌📚 = Missing Documentation - 缺失文档
- 🔄📚 = Under Review Documentation - 审查中文档

## 🎨 UI/UX Symbols

### Interface Elements
- 🎛️ = Control Panel - 控制面板
- 📱 = Mobile Interface - 移动界面
- 🖥️ = Desktop Interface - 桌面界面
- 🎨 = Theme/Style - 主题/样式
- 🔘 = Button - 按钮
- 📋 = Form - 表单

### User Experience
- 😊 = Good UX - 良好用户体验
- 😐 = Average UX - 一般用户体验
- 😞 = Poor UX - 糟糕用户体验
- ⚡ = Fast Response - 快速响应
- 🐌 = Slow Response - 慢速响应
- 🎯 = Intuitive - 直观

## 🔍 Search & Discovery Symbols

### Search Types
- 🔍📄 = Text Search - 文本搜索
- 🔍🧠 = Semantic Search - 语义搜索
- 🔍📁 = File Search - 文件搜索
- 🔍🔗 = Link Search - 链接搜索
- 🔍🏷️ = Tag Search - 标签搜索

### Discovery Methods
- 🎯 = Targeted Discovery - 定向发现
- 🌐 = Broad Discovery - 广泛发现
- 🔄 = Iterative Discovery - 迭代发现
- 📊 = Data-Driven Discovery - 数据驱动发现

---

## 📖 Usage Examples

### Basic Reference Format
```markdown
[↗️σ₁:R₁] - References requirement R₁ in project brief
🔍📊 TimelineConfig - Timeline configuration interface
⚙️📊 Processing pipeline - Data processing workflow
```

### Status Combinations
```markdown
🟢✅ Feature complete and tested
🟡🚧 Feature in development with warnings  
🔴❌ Feature failed and needs attention
🟣⭐ High priority feature
```

### Progress Indicators
```markdown
📊 Progress: 🟢🟢🟢🟡⚪ (60% complete)
Status: 🚧 Development → 🧪 Testing → 🚀 Deploy
Priority: 🔥 Critical, ⭐ High, 📝 Medium, 📋 Low
```

---

*This symbol reference guide provides a comprehensive mapping of all symbols used throughout the Block Link Plus project documentation and codebase. Use these symbols consistently to maintain clear and intuitive project communication.*
