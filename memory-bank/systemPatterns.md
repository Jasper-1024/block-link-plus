# σ₂: System Patterns
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-20*
*Π: DEVELOPMENT | Ω: RESEARCH*

## 🏛️ Architecture Overview

Block Link Plus has transitioned to a highly modular architecture centered around an **Orchestrator Pattern**. The `src/main.ts` file acts as the central orchestrator, delegating tasks to specialized, independent feature and UI modules. This design significantly improves maintainability, scalability, and testability.

### Core Architecture
- **Orchestrator (`src/main.ts`)**: Manages the plugin lifecycle and settings. It coordinates actions by delegating all business logic to specialized managers and modules, acting as a lightweight central hub.
- **`FlowEditorManager` (`src/features/flow-editor/`)**: A dedicated manager that encapsulates all logic related to the "Flow Editor" and "Basics" functionalities, including command creation, workspace patching, and editor lifecycle management.
- **Core Feature Modules (`src/features/`)**: Self-contained modules that encapsulate specific business logic.
  - **`heading-analysis.ts`**: Provides functions for analyzing document headings.
  - **`clipboard-handler.ts`**: Manages clipboard operations like copying links and generating aliases.
  - **`command-handler.ts`**: Contains the core logic for all registered plugin commands.
- **UI Modules (`src/ui/`)**: Components responsible for rendering and managing all user interface elements.
  - **`EditorMenu.ts`**: Manages the logic and event handling for the editor's right-click context menu.
  - **`SettingsTab.ts`**: Renders the plugin's settings panel.
- **Shared Code (`src/utils.ts`, `src/types.ts`)**: Common utilities and type definitions used across the application.

### 架构演进
The architecture has successfully evolved from a monolithic structure. `src/main.ts` has been significantly streamlined and no longer acts as a "God Object." A major refactoring was completed to extract all "Flow Editor" logic into a dedicated `FlowEditorManager`, further purifying `src/main.ts`'s role as an orchestrator. The most recent improvement moved the main entry point from the root directory to the `src` directory, aligning with modern TypeScript project structures.

## 🧩 System Components

### 核心组件
1. **`BlockLinkPlus` (Orchestrator)**: The main plugin class in `src/main.ts`.
2. **`FlowEditorManager`**: Manages the entire "Flow Editor" feature set.
3. **Core Feature Modules**:
   - `heading-analysis`, `clipboard-handler`, `command-handler`
4. **UI Modules**:
   - `EditorMenu`, `SettingsTab`, `ViewPlugin`

### 组件关系
```mermaid
graph TD
    subgraph Orchestrator
        A[src/main.ts]
    end

    subgraph Feature Managers
        G[FlowEditorManager]
    end

    subgraph Core Features
        B[command-handler]
        C[heading-analysis]
        D[clipboard-handler]
    end
    
    subgraph UI Layer
        E[EditorMenu]
        F[SettingsTab]
    end

    A -- instantiates and initializes --> G
    A -- registers commands via --> B
    A -- listens for menu events via --> E
    B -- uses --> C
    B -- uses --> D
```

## 🔀 Control Flow

### 主要流程
1. **插件初始化**:
   ```
   src/main.ts: onload() → loadSettings() → new FlowEditorManager().initialize() → setupUI() → registerCommands()
   ```

2. **命令执行 (Delegated)**:
   ```
   User Action → src/main.ts (Command Trigger) → delegates to command-handler.handle() → uses other modules (heading-analysis, clipboard-handler)
   ```
   
3. **右键菜单处理 (Delegated)**:
   ```
   Right-click Event → src/main.ts (Event Listener) → delegates to EditorMenu.handleEditorMenu() → delegates to command-handler
   ```

## 🧩 New System Pattern: `blp-timeline` Dynamic Region

A new system pattern is introduced to support dynamic, in-note content generation. This pattern leverages a "control block" to manage a specific region within the same Markdown file.

### 概念
- **Control Block (`blp-timeline`)**: A YAML-based code block where users declaratively define a query.
- **Dynamic Region**: A region in the note bounded by HTML comments (`<!-- OBP-TIMELINE-START -->` and `<!-- OBP-TIMELINE-END -->`).
- **Trigger**: The update process is triggered when the note is rendered (e.g., switching from source mode to reading mode).
- **Engine**: The feature relies on the Dataview plugin's API for all indexing, caching, and querying operations.
- **Safety**: A two-layer defense mechanism prevents infinite loops: **Debouncing** manages event frequency, and **Content Hashing** ensures idempotent writes.

### 工作流程
1. **渲染触发 (Render Trigger)**: The `MarkdownPostProcessor` detects a `blp-timeline` code block.
2. **防抖处理 (Debounce)**: The call to the update logic is wrapped in a "debouncer" function. This ensures that even if multiple render events fire rapidly, the core logic only executes once after a short period of stability (e.g., 300ms).
3. **解析配置 (Parse Config)**: The plugin parses the YAML configuration within the block.
4. **查询执行 (Execute Query)**: It uses the Dataview API to build and execute a query based on the parsed configuration.
5. **结果生成与哈希 (Generate & Hash Results)**: The query results are formatted into a list of `!![[...]]` links. A hash of this new content is computed.
6. **内容哈希比对 (Content Hash Diffing)**: The new content's hash is compared against the hash stored in the region's end marker (`<!-- OBP-TIMELINE-END hash:a1b2c3... -->`). This is the primary loop prevention mechanism.
7. **条件写入 (Conditional Write)**: **Only if the hashes do not match**, the plugin uses `app.vault.modify()` to update the content and the new hash value in the end marker. If the hashes match, no write operation occurs, and the process terminates safely.

### 控制块设计
````yaml
```blp-timeline
# blp-timeline: An integrated, dynamic timeline generator
# v1.0

# 1. Define the search scope
source_folders:
  - "DailyNotes"
  - "Projects/Active"

# 2. & 3. Define the core filter
filter_by:
  link: "[[ProjectA MOC]]"
  tags:
    - "#meeting"
    - "#important"
  tags_from_frontmatter: "area_tags"

# 4. Define the timespan
within_days: 90

# 5. Define the sort order
sort_order: "desc" # 'asc' or 'desc'

# 6. Define the daily note format
daily_note_format: "yyyy-MM-dd"
```
````

## 🧩 Architectural Refactoring Plan (Updated)

### 当前架构状态
The architecture is now highly modular. The extraction of the "Flow Editor" logic into its own manager (`FlowEditorManager`) and the relocation of the main entry point to the `src` directory represent significant steps towards the target architecture.

### 目标架构
A fully modular system with low coupling and high cohesion. `src/main.ts` should only be responsible for wiring together the different components of the plugin.

### 下一步重构策略
The most critical architectural refactoring is complete. Future work will focus on consolidation and quality improvement rather than major restructuring.

1.  **`src/main.ts` 遗留逻辑清理 (基本完成)**:
    -   **Status**: Mostly Complete.
    -   **Action Taken**: All "Flow Editor" logic and related utilities have been successfully extracted into `FlowEditorManager`. Additionally, dead legacy code related to menu handling was identified and removed. The main entry point has been moved to the `src` directory for better organization.
    -   **Remaining**: Minor opportunities for cleanup may exist, such as extracting settings management, but this is now low priority.

2.  **测试体系建设 (Phase 4.3)**:
    -   **Priority**: High. This is the most critical next step.
    -   **Action**: Create dedicated unit and integration tests for the new modules (`FlowEditorManager`, `command-handler`, `EditorMenu`, etc.).
    -   **Goal**: Increase test coverage to ensure stability and prevent regressions, especially after the recent refactoring.

3.  **文档更新 (Phase 4.5)**:
    -   **Priority**: Medium.
    -   **Action**: Update this document (`systemPatterns.md`) and `techContext.md` to reflect the final architecture.
    -   **Goal**: Provide a clear and precise guide for future development and maintenance. 

## 🔄 Build System Integration

### 构建系统更新
The build system has been updated to reflect the new project structure:

1. **ESBuild Configuration**:
   - The entry point in `esbuild.config.mjs` has been updated from `main.ts` to `src/main.ts`.
   - This ensures that the bundler correctly processes the new file location.

2. **TypeScript Configuration**:
   - The `tsconfig.json` file has been adjusted to accommodate the new file structure.
   - Path mappings and include patterns now properly reference files in the `src` directory.

### 文件结构优化
The relocation of `main.ts` to `src/main.ts` brings several benefits:

1. **Consistency**: All source code is now contained within the `src` directory, following modern TypeScript project conventions.
2. **Clarity**: Clear separation between source code and configuration files in the root directory.
3. **Scalability**: Easier to add new modules and components within the established directory structure.
4. **Build Process**: Simplified build configuration with a standard entry point location. 