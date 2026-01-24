# 多行Block优化方案

## 方案一：统一状态管理器（推荐）

### 核心思路
创建一个专门的 `MultilineBlockStateManager` 来统一管理所有多行block的状态，避免多个渲染系统之间的冲突。

### 实现要点
```typescript
// 新建 src/basics/state/MultilineBlockStateManager.ts
class MultilineBlockStateManager {
  private static instance: MultilineBlockStateManager;
  private blockStates = new Map<string, BlockState>();
  private listeners = new Map<string, Set<StateListener>>();
  
  interface BlockState {
    id: string;
    mode: 'live' | 'reading';
    isEditing: boolean;
    content: string;
    container: HTMLElement | null;
    reactRoot: Root | null;
  }
  
  // 注册block
  registerBlock(blockId: string, container: HTMLElement) {
    const state = {
      id: blockId,
      mode: this.getCurrentMode(),
      isEditing: false,
      content: '',
      container,
      reactRoot: null
    };
    this.blockStates.set(blockId, state);
  }
  
  // 模式切换时批量更新
  handleModeSwitch(newMode: 'live' | 'reading') {
    this.blockStates.forEach((state, blockId) => {
      state.mode = newMode;
      this.notifyListeners(blockId, state);
    });
  }
  
  // 清理机制
  cleanup(blockId: string) {
    const state = this.blockStates.get(blockId);
    if (state?.reactRoot) {
      state.reactRoot.unmount();
    }
    this.blockStates.delete(blockId);
    this.listeners.delete(blockId);
  }
}
```

### 优点
- 单一数据源，避免状态不一致
- 集中管理生命周期
- 易于调试和维护
- 改动相对较小

### 缺点
- 需要修改现有组件以使用状态管理器
- 增加了一个新的依赖

## 方案二：事件总线架构

### 核心思路
使用事件总线来协调不同渲染系统，而不是让它们直接操作DOM。

### 实现要点
```typescript
// 新建 src/basics/events/MultilineBlockEvents.ts
class MultilineBlockEventBus extends EventTarget {
  static Events = {
    BLOCK_CREATED: 'block-created',
    BLOCK_MODE_CHANGED: 'block-mode-changed',
    BLOCK_EDIT_TOGGLED: 'block-edit-toggled',
    BLOCK_DESTROYED: 'block-destroyed'
  };
  
  emitBlockCreated(blockId: string, container: HTMLElement) {
    this.dispatchEvent(new CustomEvent(Events.BLOCK_CREATED, {
      detail: { blockId, container }
    }));
  }
  
  emitModeChanged(mode: string) {
    this.dispatchEvent(new CustomEvent(Events.BLOCK_MODE_CHANGED, {
      detail: { mode }
    }));
  }
}

// 修改 markdownPost.tsx
function processMultilineEmbed() {
  // 不直接创建React组件，而是发送事件
  eventBus.emitBlockCreated(blockId, dom);
}

// 修改 FlowEditorManager
class FlowEditorManager {
  constructor() {
    eventBus.addEventListener(Events.BLOCK_MODE_CHANGED, (e) => {
      // 统一处理模式切换
      this.handleAllBlocksUpdate(e.detail.mode);
    });
  }
}
```

### 优点
- 解耦各个模块
- 易于扩展
- 便于测试
- 符合观察者模式

### 缺点
- 需要重新组织现有的事件处理逻辑
- 可能有轻微的性能开销

## 方案三：DOM标记与延迟渲染

### 核心思路
使用DOM属性标记block状态，通过MutationObserver统一处理渲染。

### 实现要点
```typescript
// 修改 markdownPost.tsx
function processMultilineEmbed(dom: HTMLElement) {
  // 只标记，不渲染
  dom.setAttribute('data-multiline-block', 'true');
  dom.setAttribute('data-block-ref', props.blockRef);
  dom.setAttribute('data-render-mode', getCurrentMode());
  dom.setAttribute('data-render-status', 'pending');
}

// 新建统一的渲染处理器
class MultilineBlockRenderer {
  private observer: MutationObserver;
  
  constructor() {
    this.observer = new MutationObserver(this.handleMutations);
    this.observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-render-status']
    });
  }
  
  private handleMutations = (mutations: MutationRecord[]) => {
    const pendingBlocks = new Set<HTMLElement>();
    
    mutations.forEach(mutation => {
      if (mutation.target instanceof HTMLElement && 
          mutation.target.getAttribute('data-render-status') === 'pending') {
        pendingBlocks.add(mutation.target);
      }
    });
    
    // 批量渲染
    this.renderBlocks(pendingBlocks);
  }
  
  private renderBlocks(blocks: Set<HTMLElement>) {
    blocks.forEach(block => {
      const mode = block.getAttribute('data-render-mode');
      const ref = block.getAttribute('data-block-ref');
      
      // 根据模式创建合适的渲染
      if (mode === 'live') {
        this.renderLiveMode(block, ref);
      } else {
        this.renderReadingMode(block, ref);
      }
      
      block.setAttribute('data-render-status', 'rendered');
    });
  }
}
```

### 优点
- 利用浏览器原生API
- 自动处理DOM生命周期
- 批量处理提高性能
- 无需手动清理

### 缺点
- 依赖DOM属性可能有兼容性考虑
- MutationObserver有一定性能开销

## 方案四：渲染队列机制

### 核心思路
使用渲染队列来控制渲染时机，避免竞态条件。

### 实现要点
```typescript
class MultilineBlockRenderQueue {
  private queue: RenderTask[] = [];
  private isProcessing = false;
  
  interface RenderTask {
    id: string;
    type: 'create' | 'update' | 'destroy';
    element: HTMLElement;
    config: RenderConfig;
    priority: number;
  }
  
  enqueue(task: RenderTask) {
    // 去重：如果已有相同元素的任务，更新而不是添加
    const existingIndex = this.queue.findIndex(t => t.element === task.element);
    if (existingIndex >= 0) {
      this.queue[existingIndex] = task;
    } else {
      this.queue.push(task);
    }
    
    this.processQueue();
  }
  
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    // 按优先级排序
    this.queue.sort((a, b) => b.priority - a.priority);
    
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await this.processTask(task);
    }
    
    this.isProcessing = false;
  }
  
  private async processTask(task: RenderTask) {
    switch (task.type) {
      case 'create':
        await this.createBlock(task);
        break;
      case 'update':
        await this.updateBlock(task);
        break;
      case 'destroy':
        await this.destroyBlock(task);
        break;
    }
  }
}
```

### 优点
- 避免并发渲染问题
- 可以优化渲染顺序
- 支持任务去重
- 便于添加渲染优化

### 缺点
- 可能有轻微的渲染延迟
- 需要管理队列状态

## 推荐方案

建议采用**方案一（统一状态管理器）**，原因如下：

1. **改动最小**：只需要添加一个新的管理器类，然后逐步迁移现有代码
2. **易于理解**：状态管理是成熟的模式，团队容易接受
3. **便于调试**：所有状态集中管理，容易追踪问题
4. **可逐步实施**：可以先实现核心功能，再逐步完善

## 实施建议

1. **第一阶段**：实现 MultilineBlockStateManager 基础功能
2. **第二阶段**：修改 UIMultilineBlock 使用状态管理器
3. **第三阶段**：统一 markdownPost.tsx 和 FlowEditorManager 的处理逻辑
4. **第四阶段**：添加性能优化和错误处理

这样可以在保证功能的同时，逐步改进代码质量。