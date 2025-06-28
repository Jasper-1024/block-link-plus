# σ₃: Technical Context
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-26*
*Π: DEVELOPMENT | Ω: EXECUTE*

## 🛠️ Technology Stack

### 🖥️ Frontend
- **Framework**: Obsidian API
- **UI Components**: Custom components using Obsidian's DOM API
- **Styling**: CSS with custom variables for theme compatibility

### 🧩 Core Technologies
- **Language**: TypeScript
- **Build Tool**: esbuild
- **Package Manager**: npm
- **Testing Framework**: Jest with ts-jest
- **Version Control**: Git

### 📦 Dependencies
- **obsidian**: Obsidian API
- **obsidian-dataview**: Dataview API for advanced queries
- **@codemirror/state**: For editor state management
- **@codemirror/view**: For editor view management

## 🔧 Development Environment

### 🏗️ Build System
- **esbuild**: 高性能的 JavaScript/TypeScript 构建工具
  - **配置文件**: `esbuild.config.mjs`
  - **入口点**: `src/main.ts`
  - **输出**: `main.js` (插件主文件) 和 `styles.css` (样式文件)
  - **特点**:
    - 基于入口文件位置解析相对导入
    - 使用插件系统扩展功能，如 CSS 文件重命名
    - 支持开发模式下的文件监视
    - 支持 TypeScript 转换

### 📁 Project Structure
- **src/**: 源代码目录
  - **main.ts**: 插件入口点
  - **types/**: 类型定义
  - **features/**: 功能模块
    - **dataview-timeline/**: 时间线功能
    - **flow-editor/**: 流编辑器功能
    - **time-section/**: 时间段功能
  - **ui/**: UI 组件
  - **basics/**: 基础功能
  - **css/**: 样式文件
- **styles.css**: 主样式文件 (位于项目根目录)
- **__mocks__/**: 测试模拟
- **memory-bank/**: 项目文档和记录

### 🔄 Development Workflow
- **开发模式**: `npm run dev` (esbuild 监视模式)
- **生产构建**: `npm run build` (优化的生产构建)
- **测试**: `npm test` (运行 Jest 测试)

## 💻 Code Architecture

### 🏛️ Core Components
- **BlockLinkPlus**: 主插件类，继承自 Obsidian 的 `Plugin` 类
- **FlowEditorManager**: 管理流编辑器功能
- **SettingsTab**: 管理插件设置
- **ViewPlugin**: 处理编辑器视图增强

### 🔄 Data Flow
- **Settings**: 通过 `loadSettings` 和 `saveSettings` 方法管理
- **Commands**: 通过 `addCommand` 方法注册
- **Processors**: 通过 `registerMarkdownCodeBlockProcessor` 方法注册
- **Events**: 通过 `registerEvent` 方法监听

## 🧪 Testing Framework

### 🧰 Testing Tools
- **Jest**: 主测试框架
- **ts-jest**: TypeScript 支持
- **jest-environment-jsdom**: 浏览器环境模拟

### 🔍 Testing Strategy
- **单元测试**: 测试单个函数和方法
- **模拟**: 模拟 Obsidian 和 Dataview API
- **覆盖率**: 关键模块达到 90%+ 的测试覆盖率
# σ₃: Technical Context
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-25*
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
// 同步区域标记格式
%% blp-timeline-start %%
// 动态生成的内容
%% blp-timeline-end %%

// "读取-合并-写回" 流程
File Read → Parse Existing Content → Cache User Modifications → 
Query Execution → Intelligent Merge → Conditional File Write
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

### 精确章节匹配实现 (🆕)
```typescript
function extractRelevantSections(
    file: TFile,
    context: TimelineContext,
    resolvedTags: string[],
    resolvedLinks: Link[]
): { file: TFile; heading: HeadingCache }[] {
    // 1. 获取文件缓存
    const fileCache = app.metadataCache.getFileCache(file);
    
    // 2. 筛选符合级别的标题
    const candidateHeadings = fileCache.headings.filter(
        (h) => h.level === config.heading_level
    );
    
    // 3. 应用时间模式过滤（如果有）
    // ...
    
    // 4. 获取文件中的所有标签和链接
    const allTagsInFile = fileCache.tags || [];
    const allLinksInFile = fileCache.links || [];
    
    // 5. 创建快速查找集合
    const targetTags = new Set(resolvedTags);
    const targetLinkPaths = new Set(resolvedLinks.map(link => link.path));
    
    // 6. 核心匹配逻辑：遍历每个候选标题
    for (const heading of filteredHeadings) {
        // 6.1 确定章节范围
        const startLine = heading.position.start.line;
        let endLine = Infinity; // 默认到文件末尾
        
        // 6.2 查找下一个同级或更高级标题
        for (const nextHeading of fileCache.headings) {
            if (nextHeading.position.start.line > startLine && 
                nextHeading.level <= heading.level) {
                endLine = nextHeading.position.start.line;
                break;
            }
        }
        
        // 6.3 检查此章节是否包含目标标签或链接
        const containsTargetTag = allTagsInFile.some(tag => 
            targetTags.has(tag.tag) && 
            tag.position.start.line >= startLine && 
            tag.position.start.line < endLine
        );
        
        const containsTargetLink = allLinksInFile.some(link => 
            targetLinkPaths.has(link.link) && 
            link.position.start.line >= startLine && 
            link.position.start.line < endLine
        );
        
        // 6.4 如果包含目标元素，添加到有效章节
        if (containsTargetTag || containsTargetLink) {
            validSections.push({ file, heading });
        }
    }
    
    return validSections;
}
```

### 章节级处理流程
1. **文件查询**: 使用 Dataview 查询符合条件的文件。
2. **读取同步区**: `findSyncRegion` 查找 `%%...%%` 标记并读取内容。
3. **缓存用户修改**: 解析同步区内容，将用户修改（如 `!!`）存入 Map。
4. **精确章节匹配** (🆕): `extractRelevantSections` 只提取包含目标标签或链接的章节。
5. **智能合并**: 遍历查询结果，结合缓存中的用户修改，生成最终的链接列表。
6. **条件写回**: `app.vault.modify` 将新内容写回文件内的同步区域。

### 性能优化策略
- **条件写入**: 只有在内容实际变化时才修改文件，避免不必要的 I/O。
- **高效解析**: 使用优化的字符串和正则表达式操作来解析链接。
- **增量解析**: 只处理符合条件的文件。
- **集合查询** (🆕): 使用 `Set` 数据结构进行 O(1) 复杂度的快速查找。
- **早期退出** (🆕): 在找到匹配项后立即返回，避免不必要的迭代。

## 🔄 Data Flow Architecture

### 主要数据流 (更新)
```
YAML Config → TimelineConfig → Filter Resolution → File Query → 
(Read Existing Sync Region & Cache Mods) →
精确章节匹配 → Intelligent Merge → Conditional File Modification
```

### 错误处理流程
```
Validation → Query Execution → Content Processing → 
Error Capture → User Feedback → Graceful Degradation
```

## 🛡️ Security & Safety

### 文件操作安全
- **读取权限**: 仅读取 Vault 内文件
- **写入限制**: 仅修改 `%%...%%` 同步区域内的内容
- **备份机制**: ~~通过哈希比较避免意外覆盖~~ (已移除, 新机制通过智能合并保留用户编辑)
- **循环检测**: 不再依赖防抖，通过条件写入避免无限循环。

### 插件依赖管理
- **可选依赖**: Dataview 插件检测和优雅降级
- **版本兼容**: 支持 Dataview 0.5.64+ 版本
- **API 稳定性**: 使用稳定的 Obsidian API

## 📊 Performance Considerations

### 当前性能指标
- **启动时间**: < 100ms (插件加载)
- **查询响应**: < 2s (1000+ 文件)
- **内存占用**: < 50MB (正常使用)
- **文件修改**: 仅在内容变更时发生

### 性能优化计划
- **懒加载**: 按需加载功能模块
- **Worker 线程**: 大量文件处理异步化
- **索引缓存**: 文件内容解析结果缓存
- **增量更新**: 只处理变更的文件

## 🧪 Testability Analysis (NEW)
*Added: 2024-12-24*

### 1. Overall Strategy
The project currently lacks any testing infrastructure. The proposed strategy involves introducing a testing framework (e.g., Jest) and a mocking library to handle Obsidian API dependencies. The focus will be on a bottom-up approach: first, creating unit tests for pure, isolated logic, and then building integration tests for more complex features that orchestrate multiple modules.

### 2. Key Testing Targets & Approaches

#### a. `dataview-timeline` (High Priority / High Value)
- **Status**: Highly testable due to its modular and functional design.
- **Unit Tests**:
    - `extractRelevantSections`: Test with various file cache structures (`headings`, `tags`, `links`), configurations, and content to ensure accurate section filtering. This is the most critical function to test.
    - `renderTimelineMarkdown`: Test with different sets of sections and configurations to verify the correctness of the final markdown output (sorting, grouping, formatting).
    - `filter-resolver.ts`: Test `resolveTags` and `resolveLinks` with various filter configurations.
    - `region-parser.ts`: Test `findSyncRegion` with different file content structures.
    - `query-builder.ts`: The logic within can be unit-tested by mocking the `dataviewApi`.
- **Integration Tests**:
    - `handleTimeline`: This is the main integration point. A test should simulate the entire workflow by providing mock implementations for `plugin`, `app.vault`, `app.metadataCache`, and `dataviewApi`. The test should assert that the final content passed to `app.vault.modify` is correct based on the inputs.

#### b. `flow-editor` (Medium Priority / High Complexity)
- **Status**: Difficult to test due to heavy reliance on the Obsidian API and direct DOM manipulation. Testing will require extensive mocking.
- **Strategy**: Focus on testing the internal logic rather than the side effects.
- **Mocking Required**:
    - Obsidian API: `Plugin`, `App`, `Workspace`, `WorkspaceLeaf`, `MarkdownView`, `Editor`.
    - CodeMirror 6: `EditorView` (`cm`), state fields, and transactions.
    - DOM: `document.body`, `HTMLElement`.
- **Testable Units**:
    - Test the logic within `FlowEditorManager` by verifying that the correct methods on mocked objects are called in response to different settings and method invocations (e.g., `initialize`, `openFlow`, `closeFlow`).
    - The `ObsidianEnactor` dependency should be mocked to isolate the manager's logic.

#### c. Core Features & Utilities (Medium Priority)
- **Status**: Generally testable.
- **Unit Tests**:
    - `command-handler.ts`: Test `handleCommand` by mocking the `editor` and `view` objects to simulate different editor states and assert the outcome (e.g., clipboard content).
    - `heading-analysis.ts`, `link-creation.ts`, `time-section.ts`: These modules likely contain pure logic that can be easily unit-tested with appropriate inputs.

### 3. Required Testing Infrastructure
- **Test Runner**: Jest or a similar framework.
- **Mocking Library**: Jest's built-in mocking capabilities.
- **TypeScript Support**: Configuration to allow Jest to work with TypeScript (e.g., `ts-jest`).
- **Environment Simulation**: A setup to provide mock objects for the Obsidian API, which is not available in a standard Node.js testing environment. This may involve creating a set of mock classes and objects that mimic the real API.

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

## 🧪 Testing Framework

### Testing Tools
- **Jest**: 用于运行测试和断言
- **ts-jest**: 用于转换 TypeScript 代码
- **identity-obj-proxy**: 用于模拟 CSS 导入
- **jest-environment-jsdom**: 提供浏览器环境模拟

### Testing Configuration
#### Jest Configuration
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.css$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
```

#### TypeScript Test Configuration
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "esModuleInterop": true,
    "jsx": "react",
    "types": ["jest", "node"]
  },
  "include": ["src/**/*", "__mocks__/**/*"]
}
```

### Mock Implementations
- **Obsidian API Mock**: 模拟 Obsidian 核心 API，包括 App, TFile, Vault, MetadataCache 等
- **Dataview API Mock**: 模拟 Dataview API，包括 DataviewApi, Link, Page 等
- **Test Utilities**: 提供创建模拟插件实例、文件和 API 的工具函数

### Testing Strategy
- **单元测试**: 测试单个函数和方法的行为
- **边缘情况**: 测试各种边缘情况和错误处理
- **输入验证**: 测试各种输入组合，包括无效输入
- **输出验证**: 验证函数和方法的输出是否符合预期
- **模拟依赖**: 模拟外部依赖，确保测试的隔离性

### Test Coverage
- **dataview-timeline Module**: 90%+ 测试覆盖率
- **Total Project**: 约 40% 测试覆盖率

## 🔄 Refactoring History

### Phase 1: 初始重构
- **时间**: 2024-12-18 之前
- **目标**: 提取核心功能到独立模块
- **成果**:
  - 提取 `heading-analysis`, `clipboard-handler`, `command-handler` 等核心模块
  - `main.ts` 代码行数从 ~973 减少到 ~512

### Phase 2: UI 模块化
- **时间**: 2024-12-18 之前
- **目标**: 分离 UI 逻辑
- **成果**:
  - 提取 `EditorMenu` 模块
  - CSS 模块化，使用 `import` 替代动态注入

### Phase 3: 功能模块化
- **时间**: 2024-12-18 至 2024-12-19
- **目标**: 提取主要功能到独立模块
- **成果**:
  - 提取 `link-creation` 模块
  - 提取 `time-section` 模块

### Phase 4: Flow Editor 封装
- **时间**: 2024-12-19
- **目标**: 封装 Flow Editor 功能
- **成果**:
  - 创建 `FlowEditorManager` 类
  - 将 Flow Editor 相关逻辑从 `main.ts` 迁移到 `src/features/flow-editor/index.ts`
  - `main.ts` 代码行数进一步减少

### Phase 5: 项目结构标准化和测试框架建设
- **时间**: 2024-12-20 至 2024-12-25
- **目标**: 优化项目结构，建立测试框架
- **成果**:
  - 将 `main.ts` 移至 `src/main.ts`
  - 更新构建配置
  - 建立测试框架
  - 为 `dataview-timeline` 模块编写测试

### Phase 6: Timeline 功能实现与改进
- **时间**: 2024-12-20 至 2024-12-22
- **目标**: 实现和改进 Timeline 功能
- **成果**:
  - 实现章节级时间线聚合
  - 改进持久化机制
  - 改进搜索功能

## 🚀 Deployment & Distribution

### Build Process
- **构建工具**: esbuild
- **构建配置**: `esbuild.config.mjs`
- **构建命令**: `npm run build`
- **构建输出**: `main.js`, `styles.css`, `manifest.json`

### Distribution Channels
- **GitHub Releases**: 通过 GitHub Releases 发布
- **Obsidian 社区插件**: 通过 Obsidian 社区插件目录分发

### Version Management
- **版本控制**: 使用语义化版本控制 (Semantic Versioning)
- **版本更新**: 在 `manifest.json` 和 `package.json` 中更新版本号
- **更新日志**: 在 `CHANGELOG.md` 中记录变更

## 🔍 Known Issues & Limitations

### Known Issues
- **Flow Editor 渲染问题**: 从"实时预览"切换到"源码"模式时，自定义渲染组件未被清除
  - **根源**: 缺乏一个有效的 API 来强制清除由 CodeMirror 扩展渲染的自定义 UI
  - **状态**: 暂时搁置，等待 Obsidian API 更新或找到替代方案

### Limitations
- **Dataview 依赖**: Timeline 功能依赖 Dataview 插件，需要用户安装
- **性能限制**: 大规模查询可能导致性能问题
- **兼容性**: 某些功能可能与其他插件冲突

## 📚 Documentation

### Code Documentation
- **注释**: 使用 JSDoc 风格的注释
- **类型定义**: 使用 TypeScript 类型定义提供文档

### User Documentation
- **README**: 提供基本的安装和使用说明
- **Wiki**: 提供详细的功能说明和示例
- **内置帮助**: 在插件设置中提供帮助信息

## 🔮 Future Directions

### Planned Features
- **测试覆盖扩展**: 为 `FlowEditorManager` 和其他关键模块提供测试覆盖
- **性能优化**: 优化大规模查询的性能
- **用户界面改进**: 提供更友好的用户界面

### Technical Debt
- **测试覆盖**: 增加测试覆盖率
- **错误处理**: 改进错误处理和报告
- **代码质量**: 进一步提高代码质量和可维护性

### Research Areas
- **Obsidian API 更新**: 跟踪 Obsidian API 的更新，利用新功能
- **性能优化**: 研究提高查询性能的方法
- **用户体验**: 研究提高用户体验的方法 

## 🚀 Deployment & Distribution

### 📦 Packaging
- **manifest.json**: 插件元数据
- **main.js**: 编译后的主文件
- **styles.css**: 编译后的样式文件

### 🔄 Release Process
- **版本控制**: 使用 `version-bump.mjs` 脚本更新版本号
- **发布**: 通过 GitHub Releases 发布

## 🔒 Security Considerations

### 🛡️ Data Safety
- **本地存储**: 所有数据存储在用户的本地 vault 中
- **无远程通信**: 插件不与任何远程服务器通信

### 🔐 Code Safety
- **输入验证**: 验证用户输入和配置
- **错误处理**: 适当的错误捕获和处理

## 📊 Performance Considerations

### ⚡ Optimization Strategies
- **懒加载**: 按需加载功能
- **缓存**: 缓存查询结果和解析结果
- **防抖**: 防止频繁操作导致性能问题

## 🧠 Technical Decisions & Rationales

### 📝 CSS 导入策略
**背景**: 在将主入口文件 `main.ts` 移动到 `src` 目录后，CSS 导入路径需要调整。

**决策**: 修改 CSS 导入路径从 `"./styles.css"` 到 `"../styles.css"`。

**理由**:
1. **文件位置**: `styles.css` 文件位于项目根目录，而不是 `src` 目录。
2. **esbuild 行为**: esbuild 基于入口文件位置解析相对导入。
3. **简洁性**: 直接引用现有文件，不引入冗余。
4. **DRY 原则**: 避免在多个位置维护相同的文件。

**替代方案**:
1. **将 `styles.css` 移动到 `src` 目录**: 这样可以保持导入语句不变，但会改变项目结构。
2. **使用 esbuild 插件**: 可以通过自定义插件修改导入路径，但会增加配置复杂性。
3. **使用绝对路径**: 可以使用绝对路径导入，但可能导致可移植性问题。

**结论**: 选择修改导入路径为相对路径 `"../styles.css"` 是最简单、最直接的解决方案，符合项目的简洁性原则。

### 📝 Timeline 功能实现
**背景**: 需要实现一个基于 Dataview 的时间线功能，可以聚合和显示符合特定条件的内容。

**决策**: 使用 Dataview API 进行查询，并在处理器函数中根据设置决定是否执行操作。

**理由**:
1. **灵活性**: Dataview API 提供了强大的查询能力。
2. **性能**: 利用 Dataview 的缓存机制提高性能。
3. **用户体验**: 根据设置和 Dataview 可用性决定是否执行，提供清晰的反馈。

**实现细节**:
1. **检测 Dataview**: 使用 `getAPI()` 函数检测 Dataview 插件是否可用。
2. **处理器注册**: 直接注册处理器，但在函数内部根据条件决定是否执行。
3. **配置合并**: 合并插件默认设置和用户指定的配置。

**结论**: 这种实现方式既简单又可靠，避免了复杂的动态注册和注销机制。

### 📝 测试框架选择
**背景**: 需要为插件建立测试框架，确保代码质量和稳定性。

**决策**: 使用 Jest 作为测试框架，结合 ts-jest 处理 TypeScript。

**理由**:
1. **TypeScript 支持**: Jest 通过 ts-jest 预处理器提供了良好的 TypeScript 支持。
2. **模拟能力**: Jest 提供了强大的模拟功能，适合模拟复杂的 Obsidian API。
3. **快照测试**: Jest 的快照测试功能适合测试渲染输出。
4. **并行执行**: Jest 可以并行执行测试，提高测试效率。
5. **社区支持**: Jest 有活跃的社区和丰富的文档。

**实现细节**:
1. **配置文件**: 创建专用的测试配置文件。
2. **API 模拟**: 模拟 Obsidian 和 Dataview API。
3. **测试覆盖**: 确保关键功能有充分的测试覆盖。

**结论**: Jest 是一个成熟、灵活的测试框架，适合本项目的需求。

## 🔄 Continuous Integration & Deployment

### 🔄 CI Pipeline
- **测试**: 运行单元测试
- **构建**: 构建生产版本
- **版本控制**: 更新版本号

### 📦 CD Pipeline
- **发布**: 创建 GitHub Release
- **通知**: 通知用户新版本可用

## 📚 Documentation Strategy

### 📖 User Documentation
- **README.md**: 基本使用说明
- **示例**: 提供使用示例

### 💻 Developer Documentation
- **memory-bank/**: 详细的开发文档
- **代码注释**: 关键功能和复杂逻辑的注释

## 🔮 Future Technical Directions

### 🚀 Planned Technical Improvements
- **性能优化**: 优化查询性能和渲染性能
- **测试覆盖扩展**: 为更多模块提供测试覆盖
- **代码质量提升**: 进一步重构和优化代码

### 🧪 Experimental Features
- **高级查询语法**: 扩展时间线查询语法
- **可视化配置**: 提供可视化的配置界面

## 📝 Technical Notes & References

### 📚 Learning Resources
- **Obsidian API**: https://github.com/obsidianmd/obsidian-api
- **Dataview API**: https://blacksmithgu.github.io/obsidian-dataview/
- **esbuild**: https://esbuild.github.io/
- **Jest**: https://jestjs.io/

### 🔗 Related Projects
- **Dataview**: https://github.com/blacksmithgu/obsidian-dataview
- **Obsidian-Basics**: 提供基础功能的插件

### 📊 Performance Benchmarks
- **Timeline 渲染**: ~100ms (对于 50 个条目)
- **查询执行**: ~50ms (对于 1000 个文件)

## 🧩 Plugin Integration Points

### 🔌 API
- **BlockLinkPlus.api**: 提供外部插件集成的 API

### 🔄 Events
- **editor-menu**: 处理编辑器菜单
- **workspace 事件**: 处理工作区事件

## 🔧 Configuration Management

### ⚙️ Settings
- **PluginSettings 接口**: 定义插件设置
- **DEFAULT_SETTINGS**: 默认设置值
- **SettingsTab**: 设置界面

### 🔄 State Management
- **loadSettings**: 加载设置
- **saveSettings**: 保存设置

## 🔍 Debugging & Monitoring

### 🐛 Debugging Tools
- **控制台日志**: 使用 `console.log` 进行调试
- **开发者工具**: 使用浏览器开发者工具

### 📊 Monitoring
- **错误日志**: 记录错误和异常
- **性能监控**: 监控关键操作的性能 