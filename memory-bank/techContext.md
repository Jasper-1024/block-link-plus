# σ₃: Technical Context
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-20*
*Π: DEVELOPMENT | Ω: EXECUTE*

## 🛠️ Technology Stack

### Frontend/Plugin
- **🖥️ Framework**: Obsidian Plugin API (1.4.16+)
- **⚡ Language**: TypeScript 4.7.4
- **🔧 Build Tool**: esbuild 0.17.3
- **📦 Package Manager**: npm
- **🎨 UI Framework**: Obsidian 原生 UI 组件

### Core Dependencies
- **📊 Data Query**: obsidian-dataview (0.5.64+) - 核心查询引擎
- **📝 YAML Parsing**: js-yaml (4.1.0) - 配置解析
- **⏰ Date/Time**: luxon (via Dataview) - 日期时间处理
- **🔗 File Links**: Obsidian Link API - 文件链接管理

### Development Tools
- **🔍 Linting**: ESLint with TypeScript rules
- **📏 Formatting**: Prettier (if configured)
- **🧪 Testing**: Jest (planned for Phase 5.2)
- **📚 Documentation**: TypeDoc (planned)

## 🏗️ Architecture Overview

### 项目结构 (Updated)
```
block-link-plus/
├── src/                          # 所有源代码
│   ├── main.ts                   # 主插件入口 (~385 lines)
│   ├── features/                 # 功能模块
│   │   ├── flow-editor/          # Flow Editor 管理器
│   │   │   └── index.ts          # FlowEditorManager
│   │   └── dataview-timeline/    # 时间线聚合功能 🆕
│   │       ├── index.ts          # 主入口和协调逻辑
│   │       ├── region-parser.ts  # 动态区域解析
│   │       ├── filter-resolver.ts # 过滤器解析
│   │       └── query-builder.ts  # 查询构建和章节处理
│   ├── core/                     # 核心功能模块
│   │   ├── heading-analysis.ts   # 标题分析
│   │   ├── clipboard-handler.ts  # 剪贴板处理
│   │   ├── command-handler.ts    # 命令处理
│   │   ├── link-creation.ts      # 链接创建
│   │   └── time-section.ts       # 时间章节
│   ├── ui/                       # UI 组件
│   │   └── EditorMenu.ts         # 编辑器菜单
│   └── basics/                   # Basics 插件集成
│       ├── enactor/              # 执行器
│       ├── commands/             # 命令
│       ├── extensions/           # 扩展
│       └── ui/                   # UI 组件
├── styles.css                    # 样式文件
├── manifest.json                 # 插件清单
├── esbuild.config.mjs           # 构建配置
└── memory-bank/                 # 项目文档
    ├── projectbrief.md          # 项目概述
    ├── systemPatterns.md        # 系统模式
    ├── techContext.md           # 技术上下文
    ├── activeContext.md         # 活动上下文
    ├── progress.md              # 进度跟踪
    └── symbols.md               # 符号参考
```

## 🔧 Core Technologies Deep Dive

### Obsidian Plugin API Integration
- **MarkdownPostProcessor**: 处理代码块渲染
- **TFile & Vault API**: 文件读写操作
- **MetadataCache**: 文件元数据和链接解析
- **App.plugins**: 插件间通信（Dataview 集成）

### Dataview Integration Architecture
```typescript
// 核心集成模式
interface TimelineContext {
    config: TimelineConfig;
    dataviewApi: DataviewApi;
    currentFile: TFile;
}

// 查询执行流程
DataviewApi → Pages Query → Section Extraction → Content Matching → Link Generation
```

### 文件修改机制 (New)
```typescript
// 动态区域标记格式
<!-- OBP-TIMELINE-START -->
// 动态生成的内容
<!-- OBP-TIMELINE-END hash:abc123def -->

// 防抖和哈希比较流程
Content Generation → Hash Calculation → Hash Comparison → File Modification (if needed)
```

## 🎯 `blp-timeline` 技术实现详解

### 配置系统
```typescript
interface TimelineConfig {
    source_folders?: string[];
    within_days?: number;
    heading_level?: number;      // 🆕 目标标题级别
    embed_format?: '!!' | '!';   // 🆕 嵌入格式选择
    sort_order?: 'asc' | 'desc';
    filters?: {
        relation: 'AND' | 'OR';
        links?: LinkFilter;
        tags?: TagFilter;
    };
}
```

### 章节级处理流程
1. **文件查询**: 使用 Dataview 查询符合条件的文件
2. **内容解析**: 读取文件内容，解析标题结构
3. **章节提取**: 提取指定级别的标题章节
4. **内容匹配**: 检查章节内容是否包含目标链接/标签
5. **链接生成**: 生成 `!![[文件名#章节标题]]` 格式
6. **动态渲染**: 更新文件中的动态区域

### 性能优化策略
- **防抖机制**: 300ms 延迟避免频繁触发
- **哈希比较**: 只在内容实际变化时才修改文件
- **增量解析**: 只处理符合条件的文件
- **缓存机制**: 缓存解析结果（计划中）

## 🔄 Data Flow Architecture

### 主要数据流
```
YAML Config → TimelineConfig → Filter Resolution → File Query → 
Section Extraction → Content Matching → Link Generation → 
Hash Calculation → File Modification
```

### 错误处理流程
```
Validation → Query Execution → Content Processing → 
Error Capture → User Feedback → Graceful Degradation
```

## 🛡️ Security & Safety

### 文件操作安全
- **读取权限**: 仅读取 Vault 内文件
- **写入限制**: 仅修改动态区域标记内容
- **备份机制**: 通过哈希比较避免意外覆盖
- **循环检测**: 防抖机制防止无限循环更新

### 插件依赖管理
- **可选依赖**: Dataview 插件检测和优雅降级
- **版本兼容**: 支持 Dataview 0.5.64+ 版本
- **API 稳定性**: 使用稳定的 Obsidian API

## 📊 Performance Considerations

### 当前性能指标
- **启动时间**: < 100ms (插件加载)
- **查询响应**: < 2s (1000+ 文件)
- **内存占用**: < 50MB (正常使用)
- **文件修改**: < 300ms (防抖延迟)

### 性能优化计划
- **懒加载**: 按需加载功能模块
- **Worker 线程**: 大量文件处理异步化
- **索引缓存**: 文件内容解析结果缓存
- **增量更新**: 只处理变更的文件

## 🔧 Build & Deployment

### 构建配置
```javascript
// esbuild.config.mjs
export default {
    entryPoints: ['src/main.ts'],  // 更新后的入口点
    bundle: true,
    external: ['obsidian', 'electron', '@codemirror/*'],
    format: 'cjs',
    target: 'es2020',
    logLevel: 'info',
    sourcemap: 'external',
    treeShaking: true,
    outfile: 'main.js',
};
```

### 依赖管理
```json
{
    "dependencies": {
        "js-yaml": "^4.1.0"
    },
    "devDependencies": {
        "@types/node": "^16.11.6",
        "@typescript-eslint/eslint-plugin": "5.29.0",
        "@typescript-eslint/parser": "5.29.0",
        "builtin-modules": "3.3.0",
        "esbuild": "0.17.3",
        "obsidian": "latest",
        "tslib": "2.4.0",
        "typescript": "4.7.4"
    }
}
```

## 🧪 Testing Strategy (Planned)

### 测试框架选择
- **Unit Testing**: Jest + TypeScript
- **Integration Testing**: Obsidian Test Utils
- **E2E Testing**: Playwright (for complex scenarios)

### 测试覆盖计划
- **配置解析**: YAML 配置验证和错误处理
- **过滤器逻辑**: 标签和链接过滤准确性
- **章节提取**: 标题解析和内容匹配
- **文件操作**: 动态区域更新和哈希比较
- **性能测试**: 大文件量处理性能

## 🔄 Integration Patterns

### Dataview 插件集成
```typescript
// 插件检测和 API 获取
const dataviewApi = this.app.plugins.plugins.dataview?.api;
if (!dataviewApi) {
    // 优雅降级处理
}

// 查询执行
const pages = dataviewApi.pages(query);
const filteredPages = pages.where(condition);
```

### 文件系统集成
```typescript
// 文件读取
const content = await this.app.vault.read(file);

// 文件修改
await this.app.vault.modify(file, newContent);

// 元数据访问
const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
```

## 📝 Development Workflow

### 当前开发阶段
- **Phase 6.2**: 章节级功能实现中
- **重点任务**: 
  1. 扩展 `TimelineConfig` 接口
  2. 实现章节级查询逻辑
  3. 添加文件写入功能
  4. 完善错误处理

### 代码质量标准
- **TypeScript Strict Mode**: 启用严格类型检查
- **ESLint Rules**: 遵循 TypeScript 最佳实践
- **Code Coverage**: 目标 80%+ 测试覆盖率
- **Documentation**: JSDoc 注释覆盖所有公共 API

## 🔮 Future Technical Roadmap

### 短期技术目标 (1-2 周)
- 完成章节级处理逻辑
- 实现防抖和哈希机制
- 添加完善的错误处理

### 中期技术目标 (1-2 月)
- 建立完整的测试体系
- 性能优化和监控
- 代码文档完善

### 长期技术愿景 (3-6 月)
- 插件生态集成
- 可视化界面开发
- 社区贡献框架

## 🚨 Technical Risks & Mitigation

### 高风险项目
- **章节解析复杂度**: 通过参考 `viewUtils.js` 实现降低风险
- **性能影响**: 通过防抖和缓存机制优化
- **文件安全性**: 通过哈希比较和区域限制确保安全

### 缓解策略
- **分阶段实现**: 将复杂功能分解为小步骤
- **持续测试**: 每个阶段都进行充分测试
- **用户反馈**: 及时收集和响应用户反馈

## 📚 Technical Documentation

### API 文档结构
```
docs/
├── api/
│   ├── timeline-config.md        # 配置接口文档
│   ├── query-builder.md          # 查询构建器文档
│   └── region-parser.md          # 区域解析器文档
├── guides/
│   ├── getting-started.md        # 快速开始指南
│   ├── advanced-usage.md         # 高级用法
│   └── troubleshooting.md        # 故障排除
└── examples/
    ├── basic-timeline.md          # 基础时间线示例
    └── complex-filters.md         # 复杂过滤器示例
```

### 代码注释标准
- **模块级**: 每个模块的用途和主要功能
- **函数级**: 参数、返回值和副作用说明
- **复杂逻辑**: 算法思路和实现细节注释
- **类型定义**: 接口和类型的用途和约束 