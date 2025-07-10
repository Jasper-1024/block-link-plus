# Multiline Block 功能一步一验证实施计划

*创建时间: 2024-12-28*
*状态: 规划阶段*

## 🎯 项目概述

### 背景
- **现有问题**: block 分支的 multiline block 实现设计太 lan，导致无限循环修改 bug
- **解决方案**: 完全重构，基于现有 `!![[]]` 流程扩展，使用 `^![[]]` 语法避免冲突
- **核心挑战**: Live Preview 和 Reading Mode 下的各种细节处理，模式切换时的状态管理

### 设计原则
- **复用而非重建**: 基于成熟的 `!![[]]` 处理流程扩展
- **最小改动原则**: 尽可能少地修改现有代码  
- **统一处理流程**: Live Preview 和 Reading Mode 保持一致
- **一小步一验证**: 每个步骤都有明确的验证标准

### 语法设计
```markdown
!![[file#^blockid]]     # 可编辑嵌入（支持单行/多行）
^![[file#^xyz-xyz]]     # 只读多行块嵌入（新增）
```

## 🚀 10步渐进式实现计划

### 步骤1: 基础检测 (0.5天)
**目标**: 能识别 `^![[]]` 语法，console.log 输出，不做任何渲染

**实现内容**:
```typescript
// 扩展 src/basics/codemirror/flowEditor.tsx
export const flowEditorInfo = StateField.define<FlowEditorInfo[]>({
  update(value, tr) {
    // 现有：处理 !![[]]
    for (const match of str.matchAll(/!!\[\[([^\]]+)\]\]/g)) {
      // ... 现有逻辑
    }
    
    // 新增：处理 ^![[]]
    for (const match of str.matchAll(/\^!\[\[([^\]]+)\]\]/g)) {
      if (match.index === undefined) continue;
      
      const link = match[1];
      console.log('发现多行块引用:', link);
      
      // 验证是否为多行块引用
      if (!link.match(/#\^([a-z0-9]+)-\1$/)) {
        console.log('不是有效的多行块引用:', link);
        continue;
      }
      
      console.log('有效的多行块引用:', link);
      // 暂时不创建 FlowEditorInfo，只是识别
    }
  }
});
```

**验证标准**:
- ✅ 在编辑器中输入 `^![[test#^abc-abc]]`
- ✅ 控制台能看到 "发现多行块引用: test#^abc-abc"
- ✅ 控制台能看到 "有效的多行块引用: test#^abc-abc"
- ✅ 不影响现有的 `!![[]]` 功能
- ✅ 输入无效格式如 `^![[test#invalid]]` 应该有相应提示

---

### 步骤2: Live Preview 固定内容 (1天)
**目标**: 在 Live Preview 下用固定文本替换 `^![[]]` 显示

**实现内容**:
```typescript
// 1. 扩展 FlowEditorLinkType 枚举
// src/types/index.ts
export enum FlowEditorLinkType {
  Link = 0,
  Embed = 1,              // !![[]] 嵌入
  EmbedClosed = 2,
  ReadOnlyEmbed = 3,      // 新增：^![[]] 多行只读
}

// 2. 修改 flowEditorInfo 创建 FlowEditorInfo
const info: FlowEditorInfo = {
  id: genId(),
  link: link,
  from: match.index + 3,  // 跳过 "^![["
  to: match.index + 3 + link.length,
  type: FlowEditorLinkType.ReadOnlyEmbed,
  height: -1,
  expandedState: FlowEditorState.Open  // 默认展开
};
newValues.push(info);

// 3. 扩展装饰器应用逻辑
// src/basics/enactor/obsidian.tsx
const flowEditorRangeset = (state: EditorState, plugin: BlockLinkPlus) => {
  for (const info of infoFields) {
    const { from, to, type, expandedState } = info;
    
    // 新增：处理多行只读类型
    if (type === FlowEditorLinkType.ReadOnlyEmbed && 
        expandedState === FlowEditorState.Open) {
      
      // 避免与 Obsidian 原生渲染冲突
      const shouldSkip = checkSelectionConflict(state, from - 2, to + 2);
      
      if (!shouldSkip) {
        values.push({
          start: from - 2,
          end: to + 2,
          decoration: flowEditorWidgetDecoration(info, plugin)
        });
      }
    }
  }
};

// 4. 创建固定内容的 Widget
class MultilineBlockWidget extends WidgetType {
  toDOM() {
    const div = document.createElement("div");
    div.className = "mk-multiline-block-test";
    div.innerHTML = `
      <div style="border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">
        <strong>多行块测试内容 (Live Preview)</strong><br>
        这是第一行<br>
        这是第二行<br>
        这是第三行<br>
        <small>引用: ${this.info.link}</small>
      </div>
    `;
    return div;
  }
}
```

**验证标准**:
- ✅ 输入 `^![[test#^abc-abc]]` 后看到固定的测试内容
- ✅ 样式正确显示（边框、背景色）
- ✅ 显示正确的引用信息 "引用: test#^abc-abc"
- ✅ 不与现有 `!![[]]` 功能冲突
- ✅ 选中 `^![[]]` 文本时不显示 Widget（避免冲突）

---

### 步骤3: Reading Mode 固定内容 (1天)
**目标**: 在 Reading Mode 下也能显示相同的固定内容

**实现内容**:
```typescript
// 扩展 src/basics/flow/markdownPost.tsx
export const replaceAllTables = (
  plugin: BlockLinkPlus,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext
) => {
  // 现有：处理 !![[]]
  el.querySelectorAll("p").forEach((element) => {
    if (!element.textContent || !element.parentElement) return;
    
    // 处理 !![[]]
    for (const match of element.textContent.matchAll(/!!\[\[([^\]]+)\]\]/g)) {
      // ... 现有逻辑
    }
    
    // 新增：处理 ^![[]]
    for (const match of element.textContent.matchAll(/\^!\[\[([^\]]+)\]\]/g)) {
      const link = match[1];
      
      // 验证是否为多行块引用
      if (!link.match(/#\^([a-z0-9]+)-\1$/)) continue;
      
      element.style.display = "none";
      const reactEl = createRoot(element.parentElement);
      
      reactEl.render(
        <div className="mk-multiline-block-test" style={{
          border: '1px solid #ccc',
          padding: '10px',
          background: '#f9f9f9'
        }}>
          <strong>多行块测试内容 (Reading Mode)</strong><br />
          这是第一行<br />
          这是第二行<br />
          这是第三行<br />
          <small>引用: {link}</small>
        </div>
      );
    }
  });
};
```

**验证标准**:
- ✅ 在 Reading Mode 下看到固定内容
- ✅ 样式与 Live Preview 保持一致
- ✅ 显示正确的引用信息
- ✅ 不影响现有的 `!![[]]` 处理

---

### 步骤4: 模式切换测试 (1天)
**目标**: Live ↔ Reading 切换时固定内容保持正确

**实现内容**:
```typescript
// 确保模式切换时正确处理
// 可能需要在 src/features/flow-editor/index.ts 中添加处理逻辑
private handleModeSwitch(view: MarkdownView, switchType: string): void {
  const container = view.contentEl;
  
  // 扩展选择器以包含 ^![[]]
  const embeds = container.querySelectorAll(
    '.internal-embed.markdown-embed, .mk-multiline-block-test'
  );
  
  embeds.forEach((embed) => {
    const isMultilineTest = embed.classList.contains('mk-multiline-block-test');
    
    if (isMultilineTest) {
      // 处理多行块测试内容的模式切换
      console.log('模式切换 - 处理多行块测试内容');
    }
  });
}
```

**验证标准**:
- ✅ Live → Reading：内容正确切换，样式保持一致
- ✅ Reading → Live：内容正确切换，样式保持一致
- ✅ 连续切换多次不出错
- ✅ 切换时不影响其他内容（如现有的 `!![[]]`）
- ✅ 切换速度正常，无明显延迟

---

### 步骤5: Live Preview 跳转链接 (1天)
**目标**: 在固定内容上添加跳转按钮，点击能正确跳转

**实现内容**:
```typescript
// 修改 MultilineBlockWidget
class MultilineBlockWidget extends WidgetType {
  toDOM() {
    const div = document.createElement("div");
    div.innerHTML = `
      <div class="mk-multiline-block-test">
        <div style="position: relative; border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">
          <button class="mk-jump-btn" style="position: absolute; top: 5px; right: 5px; background: none; border: none; cursor: pointer; font-size: 16px;">🔗</button>
          <strong>多行块测试内容 (Live Preview)</strong><br>
          这是第一行<br>
          这是第二行<br>
          这是第三行<br>
          <small>引用: ${this.info.link}</small>
        </div>
      </div>
    `;
    
    // 添加跳转事件
    const jumpBtn = div.querySelector('.mk-jump-btn');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        console.log('跳转到:', this.info.link);
        
        // 解析链接
        const [filePath, blockRef] = this.info.link.split('#');
        const blockId = blockRef.replace('^', '');
        
        try {
          // 使用 Obsidian API 跳转
          await this.plugin.app.workspace.openLinkText(
            this.info.link,
            '', // 当前文件路径
            false // 不在新标签页打开
          );
          
          console.log('跳转成功');
        } catch (error) {
          console.error('跳转失败:', error);
        }
      });
    }
    
    return div;
  }
}
```

**验证标准**:
- ✅ 显示跳转按钮（🔗）
- ✅ 按钮位置正确（右上角）
- ✅ 点击按钮能跳转到目标文件
- ✅ 跳转后能正确定位到块位置（如果存在）
- ✅ 同文件跳转和跨文件跳转都正常
- ✅ 跳转失败时有适当的错误提示

---

### 步骤6: Reading Mode 跳转链接 (1天)
**目标**: Reading Mode 下也有跳转功能

**实现内容**:
```typescript
// 扩展 Reading Mode 的渲染
reactEl.render(
  <div className="mk-multiline-block-test" style={{
    position: 'relative',
    border: '1px solid #ccc',
    padding: '10px',
    background: '#f9f9f9'
  }}>
    <button 
      className="mk-jump-btn"
      style={{
        position: 'absolute',
        top: '5px',
        right: '5px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px'
      }}
      onClick={async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        console.log('Reading Mode 跳转到:', link);
        
        try {
          await plugin.app.workspace.openLinkText(link, ctx.sourcePath, false);
          console.log('Reading Mode 跳转成功');
        } catch (error) {
          console.error('Reading Mode 跳转失败:', error);
        }
      }}
    >
      🔗
    </button>
    <strong>多行块测试内容 (Reading Mode)</strong><br />
    这是第一行<br />
    这是第二行<br />
    这是第三行<br />
    <small>引用: {link}</small>
  </div>
);
```

**验证标准**:
- ✅ Reading Mode 下显示跳转按钮
- ✅ 跳转功能与 Live Preview 一致
- ✅ 跳转后正确定位
- ✅ 错误处理正常

---

### 步骤7: Live Preview 编辑图标 (1天)
**目标**: 添加编辑图标，悬浮显示

**实现内容**:
```typescript
// 复用 block 分支的外部图标机制
class MultilineBlockWidget extends WidgetType {
  private externalIconRoot: Root | null = null;
  private externalIconContainer: HTMLElement | null = null;
  
  toDOM(view: EditorView) {
    const div = document.createElement("div");
    // ... 现有内容
    
    // 为多行只读块创建外部编辑图标
    if (this.info.type === FlowEditorLinkType.ReadOnlyEmbed) {
      setTimeout(() => {
        this.createExternalEditIcon(view, div);
      }, 0);
    }
    
    return div;
  }
  
  private createExternalEditIcon(view: EditorView, widgetDiv: HTMLElement) {
    const cmRoot = view.dom.closest('.cm-editor') as HTMLElement;
    if (!cmRoot) return;
    
    this.cleanupExternalIcon();
    
    // 创建外部图标容器
    this.externalIconContainer = document.createElement('div');
    this.externalIconContainer.className = 'mk-floweditor-selector mk-external-icon';
    this.externalIconContainer.style.position = 'absolute';
    this.externalIconContainer.style.zIndex = 'var(--layer-popover)';
    this.externalIconContainer.style.visibility = 'hidden';
    this.externalIconContainer.style.background = 'var(--background-primary)';
    this.externalIconContainer.style.border = '1px solid var(--background-modifier-border)';
    this.externalIconContainer.style.borderRadius = '4px';
    this.externalIconContainer.style.padding = '4px';
    this.externalIconContainer.style.cursor = 'pointer';
    this.externalIconContainer.innerHTML = '✏️';
    
    // 计算位置
    const updatePosition = () => {
      if (!this.externalIconContainer || !widgetDiv) return;
      
      const widgetRect = widgetDiv.getBoundingClientRect();
      const cmRect = cmRoot.getBoundingClientRect();
      
      const left = widgetRect.right - cmRect.left - 40;
      const top = widgetRect.top - cmRect.top - 34;
      
      this.externalIconContainer.style.left = left + 'px';
      this.externalIconContainer.style.top = top + 'px';
    };
    
    updatePosition();
    cmRoot.appendChild(this.externalIconContainer);
    
    // 悬浮显示逻辑
    const showIcon = () => {
      if (this.externalIconContainer) {
        this.externalIconContainer.style.visibility = 'visible';
      }
    };
    
    const hideIcon = () => {
      if (this.externalIconContainer) {
        this.externalIconContainer.style.visibility = 'hidden';
      }
    };
    
    widgetDiv.addEventListener('mouseenter', showIcon);
    widgetDiv.addEventListener('mouseleave', hideIcon);
    this.externalIconContainer.addEventListener('mouseenter', showIcon);
    this.externalIconContainer.addEventListener('mouseleave', hideIcon);
    
    // 监听滚动和窗口变化
    const updatePositionThrottled = this.throttle(updatePosition, 16);
    window.addEventListener('scroll', updatePositionThrottled, true);
    window.addEventListener('resize', updatePositionThrottled);
    
    // 编辑功能
    this.externalIconContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log('编辑多行块:', this.info.link);
      // 暂时只是日志，后续可以扩展为实际编辑功能
    });
  }
  
  destroy(dom: HTMLElement): void {
    this.cleanupExternalIcon();
    // ... 现有逻辑
  }
  
  private cleanupExternalIcon() {
    if (this.externalIconRoot) {
      this.externalIconRoot.unmount();
      this.externalIconRoot = null;
    }
    if (this.externalIconContainer) {
      this.externalIconContainer.remove();
      this.externalIconContainer = null;
    }
  }
  
  private throttle(func: Function, limit: number) {
    let inThrottle: boolean;
    return function(this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }
}
```

**验证标准**:
- ✅ 鼠标悬浮时显示编辑图标（✏️）
- ✅ 鼠标离开时隐藏编辑图标
- ✅ 图标位置正确（相对于内容块）
- ✅ 图标样式正确（背景、边框、圆角）
- ✅ 点击编辑图标有反应（控制台日志）
- ✅ 窗口滚动和缩放时图标位置正确更新

---

### 步骤8: Reading Mode 编辑图标 (1天)
**目标**: Reading Mode 下也有编辑图标

**实现内容**:
```typescript
// 为 Reading Mode 添加编辑图标
// 需要在 DOM 渲染完成后添加图标
useEffect(() => {
  const container = document.querySelector('.mk-multiline-block-test');
  if (!container) return;
  
  // 创建编辑图标
  const editIcon = document.createElement('div');
  editIcon.className = 'mk-multiline-edit-icon';
  editIcon.innerHTML = '✏️';
  editIcon.style.cssText = `
    position: absolute;
    top: 5px;
    right: 30px;
    opacity: 0;
    transition: opacity 0.2s;
    cursor: pointer;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    padding: 4px;
    z-index: 10;
  `;
  
  container.appendChild(editIcon);
  
  // 悬浮显示逻辑
  const showIcon = () => editIcon.style.opacity = '1';
  const hideIcon = () => editIcon.style.opacity = '0';
  
  container.addEventListener('mouseenter', showIcon);
  container.addEventListener('mouseleave', hideIcon);
  
  // 编辑功能
  editIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Reading Mode 编辑多行块:', link);
  });
  
  // 清理
  return () => {
    container.removeEventListener('mouseenter', showIcon);
    container.removeEventListener('mouseleave', hideIcon);
    editIcon.remove();
  };
}, []);
```

**验证标准**:
- ✅ Reading Mode 下编辑图标正常显示
- ✅ 悬浮效果与 Live Preview 一致
- ✅ 点击功能正常
- ✅ 图标位置不与跳转按钮重叠

---

### 步骤9: 完整模式切换 (1天)
**目标**: 所有功能在模式切换时都正确工作

**实现内容**:
```typescript
// 完善模式切换处理
private handleModeSwitch(view: MarkdownView, switchType: string): void {
  const container = view.contentEl;
  
  // 处理多行块在模式切换时的状态
  const multilineBlocks = container.querySelectorAll('.mk-multiline-block-test');
  
  multilineBlocks.forEach((block) => {
    // 清理可能残留的事件监听器
    const icons = block.querySelectorAll('.mk-multiline-edit-icon');
    icons.forEach(icon => icon.remove());
    
    // 重新应用必要的样式和事件
    if (switchType === 'to-reading') {
      // 切换到阅读模式时的处理
      this.setupReadingModeFeatures(block);
    } else if (switchType === 'to-live') {
      // 切换到预览模式时的处理  
      this.setupLivePreviewFeatures(block);
    }
  });
}

private setupReadingModeFeatures(block: Element) {
  // 为 Reading Mode 设置功能
  // 重新添加编辑图标等
}

private setupLivePreviewFeatures(block: Element) {
  // 为 Live Preview 设置功能
  // 外部编辑图标会通过 Widget 自动处理
}
```

**验证标准**:
- ✅ 切换后固定内容正确显示
- ✅ 切换后跳转按钮正常工作
- ✅ 切换后编辑图标正常显示和隐藏
- ✅ 连续切换多次不出错
- ✅ 多个多行块同时存在时切换正常
- ✅ 切换时不影响其他内容
- ✅ 切换速度正常

---

### 步骤10: 真正的多行块渲染 (2-3天)
**目标**: 替换固定内容为实际的多行块内容

**实现内容**:
```typescript
// 替换固定内容为真实渲染
const renderMultilineBlock = async (ref: string, plugin: BlockLinkPlus) => {
  // 解析引用
  const [filePath, blockRef] = ref.split('#');
  const blockId = blockRef.replace('^', '');
  
  // 提取多行块 ID
  const multilineMatch = blockId.match(/^([a-z0-9]+)-\1$/);
  if (!multilineMatch) {
    return '<div class="mk-multiline-error">无效的多行块引用</div>';
  }
  
  const baseId = multilineMatch[1];
  const startMarker = `^${baseId}`;
  const endMarker = `^${baseId}-${baseId}`;
  
  try {
    // 获取文件
    const file = plugin.app.vault.getAbstractFileByPath(filePath + '.md') ||
                 plugin.app.vault.getAbstractFileByPath(filePath);
    
    if (!file) {
      return '<div class="mk-multiline-error">文件不存在</div>';
    }
    
    // 读取文件内容
    const content = await plugin.app.vault.read(file);
    const lines = content.split('\n');
    
    // 查找开始和结束标记
    let startIdx = -1;
    let endIdx = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes(startMarker) && startIdx === -1) {
        startIdx = i;
      }
      
      if (line.includes(endMarker) && startIdx !== -1) {
        endIdx = i;
        break;
      }
    }
    
    if (startIdx === -1 || endIdx === -1) {
      return '<div class="mk-multiline-error">未找到多行块标记</div>';
    }
    
    // 提取多行块内容（排除标记行）
    const blockLines = lines.slice(startIdx + 1, endIdx);
    const blockContent = blockLines.join('\n');
    
    if (!blockContent.trim()) {
      return '<div class="mk-multiline-empty">多行块内容为空</div>';
    }
    
    // 创建容器
    const container = document.createElement('div');
    container.className = 'mk-multiline-block-content';
    
    // 使用 MarkdownRenderer 渲染
    await MarkdownRenderer.renderMarkdown(
      blockContent,
      container,
      file.path,
      plugin  // 传递插件实例作为 component
    );
    
    return container.outerHTML;
    
  } catch (error) {
    console.error('渲染多行块失败:', error);
    return '<div class="mk-multiline-error">渲染失败</div>';
  }
};

// 更新 Widget 和 Reading Mode 渲染
class MultilineBlockWidget extends WidgetType {
  toDOM(view: EditorView) {
    const div = document.createElement("div");
    div.className = "mk-multiline-block-container";
    
    // 异步渲染真实内容
    this.renderRealContent(div);
    
    return div;
  }
  
  private async renderRealContent(container: HTMLElement) {
    try {
      // 显示加载状态
      container.innerHTML = '<div class="mk-multiline-loading">加载中...</div>';
      
      // 渲染真实内容
      const content = await renderMultilineBlock(this.info.link, this.plugin);
      container.innerHTML = content;
      
      // 添加跳转和编辑功能
      this.addInteractionFeatures(container);
      
    } catch (error) {
      console.error('渲染失败:', error);
      container.innerHTML = '<div class="mk-multiline-error">渲染失败</div>';
    }
  }
  
  private addInteractionFeatures(container: HTMLElement) {
    // 添加跳转按钮
    const jumpBtn = document.createElement('button');
    jumpBtn.className = 'mk-jump-btn';
    jumpBtn.innerHTML = '🔗';
    jumpBtn.onclick = () => this.handleJump();
    container.appendChild(jumpBtn);
    
    // 添加编辑图标（如果需要）
    if (this.plugin.settings.showMultilineEditIcon) {
      this.createExternalEditIcon(view, container);
    }
  }
}
```

**验证标准**:
- ✅ 能正确解析 `^abc-abc` 格式的引用
- ✅ 能正确提取多行块内容
- ✅ 能正确渲染 Markdown 内容
- ✅ 渲染后的内容支持所有 Markdown 语法
- ✅ 嵌套内容（如其他链接）正常工作
- ✅ 错误情况有适当的提示（文件不存在、标记不存在等）
- ✅ 空内容有适当的提示
- ✅ 渲染后的交互功能（跳转、编辑图标）正常工作
- ✅ Live Preview 和 Reading Mode 下渲染结果一致

---

## 🎯 CSS 样式支持

### 基础样式
```css
/* src/css/Editor/Flow/FlowEditor.css */

/* 多行块容器 */
.mk-multiline-block-container {
  position: relative;
  margin: 0.5rem 0;
}

.mk-multiline-block-content {
  padding: 0.5rem;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  background: var(--background-primary);
}

/* 外部编辑图标 */
.mk-floweditor-selector.mk-external-icon {
  position: absolute;
  z-index: var(--layer-popover);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.mk-floweditor-selector.mk-external-icon:hover {
  opacity: 1;
}

/* 跳转按钮 */
.mk-jump-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.mk-jump-btn:hover {
  opacity: 1;
}

/* 错误和状态提示 */
.mk-multiline-error {
  color: var(--text-error);
  padding: 0.5rem;
  border: 1px solid var(--background-modifier-error);
  border-radius: 4px;
  background: var(--background-modifier-error);
}

.mk-multiline-empty {
  color: var(--text-muted);
  padding: 0.5rem;
  font-style: italic;
}

.mk-multiline-loading {
  color: var(--text-muted);
  padding: 0.5rem;
  text-align: center;
}

/* 测试样式（前9步使用） */
.mk-multiline-block-test {
  position: relative;
  margin: 0.5rem 0;
}

.mk-multiline-edit-icon {
  position: absolute;
  top: 5px;
  right: 30px;
  opacity: 0;
  transition: opacity 0.2s;
  cursor: pointer;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  padding: 4px;
  z-index: 10;
}
```

## 🧪 测试策略

### 单元测试
```typescript
// src/__tests__/multiline-block.test.ts
describe('Multiline Block', () => {
  test('应该正确识别多行块引用', () => {
    const validRefs = [
      'file#^abc-abc',
      'path/to/file#^xyz123-xyz123',
      'nested/path/file#^test-test'
    ];
    
    validRefs.forEach(ref => {
      expect(isMultilineBlockRef(ref)).toBe(true);
    });
  });
  
  test('应该拒绝无效的多行块引用', () => {
    const invalidRefs = [
      'file#^abc',
      'file#^abc-xyz',
      'file#heading',
      'file#^123-abc'
    ];
    
    invalidRefs.forEach(ref => {
      expect(isMultilineBlockRef(ref)).toBe(false);
    });
  });
});
```

### 集成测试
- 创建测试文件，包含多行块标记
- 测试不同模式下的渲染
- 测试模式切换的稳定性
- 测试错误处理

### 手动测试检查清单
- [ ] 基本语法识别
- [ ] Live Preview 渲染
- [ ] Reading Mode 渲染  
- [ ] 模式切换稳定性
- [ ] 跳转功能
- [ ] 编辑图标
- [ ] 错误处理
- [ ] 性能表现
- [ ] 与现有功能的兼容性

## 🚨 风险控制

### 已知风险
1. **选择冲突**: `^![[` 偏移量计算错误
2. **模式切换**: 状态不一致
3. **性能问题**: 大量多行块渲染
4. **兼容性**: 与其他插件冲突

### 缓解措施
1. **充分测试**: 每步都有详细验证
2. **渐进实现**: 先固定内容再真实渲染
3. **错误处理**: 完善的异常捕获
4. **性能优化**: 异步渲染，避免阻塞

## 📊 成功标准

### 功能完整性
- ✅ 所有10个步骤按计划完成
- ✅ Live Preview 和 Reading Mode 功能一致
- ✅ 模式切换稳定
- ✅ 错误处理完善

### 性能要求
- ✅ 渲染时间 < 500ms
- ✅ 模式切换时间 < 200ms
- ✅ 内存使用合理
- ✅ 不影响编辑器性能

### 兼容性要求
- ✅ 不影响现有 `!![[]]` 和 `![[]]` 功能
- ✅ 与其他插件兼容
- ✅ 支持各种 Markdown 语法
- ✅ 支持嵌套内容

## 📝 实施注意事项

### 开发环境准备
1. 确保开发环境正常
2. 创建测试文件和多行块标记
3. 准备调试工具

### 代码管理
1. 每步完成后提交代码
2. 使用有意义的提交信息
3. 保持代码整洁

### 文档维护
1. 及时更新 memory-bank
2. 记录遇到的问题和解决方案
3. 更新 README 和用户文档

---

*本文档将随着实施进度持续更新* 