# σ₂: System Patterns
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-19*
*Π: DEVELOPMENT | Ω: RESEARCH*

## 🏛️ Architecture Overview

Block Link Plus 插件采用模块化架构，基于 Obsidian Plugin API 构建，主要分为以下几个核心模块：

### Core Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Block Link Plus Plugin                   │
├─────────────────────────────────────────────────────────────┤
│  Main Entry (main.ts)                                      │
│  ├── Plugin Lifecycle Management                           │
│  ├── Settings Management                                    │
│  └── Command & Menu Registration                           │
├─────────────────────────────────────────────────────────────┤
│  Core Modules                                              │
│  ├── Block Link Generator                                  │
│  ├── Multi-line Block Handler                              │
│  ├── Time Section Manager                                  │
│  └── ID Generator & Customization                          │
├─────────────────────────────────────────────────────────────┤
│  UI Components                                             │
│  ├── Context Menus                                         │
│  ├── Settings Panel                                        │
│  └── CSS Styling (for ˅id rendering)                      │
├─────────────────────────────────────────────────────────────┤
│  Enactor Layer                                             │
│  ├── Editor Interaction                                    │
│  ├── Clipboard Operations                                  │
│  └── Document Analysis                                     │
└─────────────────────────────────────────────────────────────┘
```

## 🧩 Component Design Patterns

### 1. Plugin Pattern
- **Main Class**: `BlockLinkPlusPlugin extends Plugin`
- **Lifecycle**: onload() → settings → commands → unload()
- **State Management**: Centralized settings with reactive updates

### 2. Command Pattern
- **Command Registration**: Centralized in main.ts
- **Command Types**:
  - Block link creation (regular, embed, URI)
  - Multi-line block handling
  - Time section insertion
- **Context-aware**: Commands adapt based on selection/cursor position

### 3. Strategy Pattern (Block Link Types)
```typescript
interface LinkStrategy {
  generateLink(blockId: string, filePath: string, alias?: string): string;
}

// Implementations:
// - RegularLinkStrategy: [[file#^id|alias]]
// - EmbedLinkStrategy: ![[file#^id]]
// - URILinkStrategy: obsidian://open?vault=...&file=...#^id
```

### 4. Factory Pattern (Block ID Generation)
```typescript
interface BlockIdGenerator {
  generate(prefix: string, length: number): string;
}

// Supports customizable prefix and random string length (3-7)
```

### 5. Observer Pattern (Settings)
- Settings changes trigger UI updates
- Menu visibility controlled by settings
- CSS rendering affected by experimental options

## 🔧 Data Flow Architecture

### Block Link Creation Flow
```
User Action (Right-click/Command)
    ↓
Selection Analysis
    ↓
Block Type Detection
    ├── Single Line → Direct Block ID
    ├── Multi-line → Heading/Batch Strategy
    └── Title → Title Block Handling
    ↓
ID Generation (Custom Prefix + Random)
    ↓
Link Generation (Based on Type & Alias)
    ↓
Clipboard Copy + Optional Notification
```

### Multi-line Block Handling
```
Multi-line Selection
    ↓
Strategy Decision
    ├── Heading Strategy
    │   ├── Insert ## ˅id heading
    │   ├── Apply custom CSS rendering
    │   └── Generate [[file#˅id]] link
    └── Batch Strategy
        ├── Add ^id to each line
        ├── Generate multiple [[file#^id]] links
        └── Copy all links to clipboard
```

## 🎨 Styling Architecture

### CSS Module Pattern
- **Base Styles**: styles.css (minimal)
- **Dynamic Styles**: Injected via plugin for ˅id rendering
- **Mode-specific**: Different rendering for reading/live preview

### CSS Selectors for ˅id
```css
/* Hide ˅ symbol in reading mode */
.markdown-reading-view .markdown-rendered h1, 
.markdown-reading-view .markdown-rendered h2,
.markdown-reading-view .markdown-rendered h3 {
  /* Custom rendering logic */
}
```

## 🔌 Integration Patterns

### Obsidian API Integration
- **Editor API**: For text manipulation and cursor positioning
- **Vault API**: For file operations and metadata
- **Workspace API**: For menu and command integration
- **MetadataCache**: For heading analysis and document structure

### Plugin Interoperability
- **Non-conflicting**: Designed to work alongside other block plugins
- **Standard Compliance**: Uses Obsidian's standard block reference format
- **Extensible**: Architecture supports future feature additions

## 📊 Performance Considerations

### Optimization Patterns
- **Lazy Loading**: UI components loaded on demand
- **Caching**: Document structure analysis cached per file
- **Batch Operations**: Multi-line blocks processed efficiently
- **Memory Management**: Proper cleanup in onunload()

## 🧪 Testing Architecture

### Test Structure (test.ts)
- **Unit Tests**: Individual function testing
- **Integration Tests**: End-to-end workflows
- **Mock Objects**: Obsidian API mocking for isolated testing
- **Edge Cases**: Boundary condition handling

## 🔮 Extensibility Design

### Future-Ready Patterns
- **Plugin System**: Modular design allows feature additions
- **Configuration Schema**: Settings system supports new options
- **Hook Points**: Strategic extension points for customization
- **API Abstraction**: Internal APIs prepared for external access 