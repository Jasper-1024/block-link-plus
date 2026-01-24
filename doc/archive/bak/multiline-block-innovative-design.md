# 多行 Block 功能创新设计方案

## 一、重新定义问题

### 1.1 用户真正需要什么？
- **需求**：引用文档中的多行内容（而不仅仅是单行）
- **场景**：引用代码片段、多段引言、完整的章节等
- **体验**：简单直观，不需要学习复杂的语法

### 1.2 现有方案的根本问题
Block 分支试图做太多事情：
- 同时支持只读和可编辑
- 在多个渲染模式下工作
- 处理复杂的嵌套和状态

这导致了复杂度爆炸。

## 二、创新设计思路

### 2.1 核心洞察

**不要试图改变 Obsidian 的行为，而是扩展它。**

Obsidian 已经支持：
- 标题引用：`![[file#heading]]`
- 块引用：`![[file#^blockid]]`

我们可以：
- 扩展块引用的语义，使其支持范围

### 2.2 新的语法设计

而不是使用 `^xyz-xyz` 这种复杂的标记方式，我们可以：

```markdown
# 方案1：范围选择器
![[file#^start:end]]     // 从 start 块到 end 块
![[file#L10:L20]]        // 从第10行到第20行
![[file#heading:next]]   // 从标题到下一个同级标题

# 方案2：区域标记（更自然）
<!-- region:codeSample -->
这里是代码示例
可以有多行
<!-- endregion -->

然后引用：![[file#region:codeSample]]

# 方案3：利用现有的代码块
```python id="myfunction"
def hello():
    print("Hello World")
```

引用：![[file#code:myfunction]]
```

### 2.3 实现策略：最小可行产品

#### 第一步：支持行号引用
最简单、最实用的功能：

```typescript
// 检测行号引用
function parseLineReference(ref: string): { start: number; end: number } | null {
  const match = ref.match(/#L(\d+)(?::L?(\d+))?$/);
  if (match) {
    const start = parseInt(match[1]);
    const end = match[2] ? parseInt(match[2]) : start;
    return { start, end };
  }
  return null;
}

// 在 Markdown 后处理器中
registerMarkdownPostProcessor((element, context) => {
  const links = element.querySelectorAll('a.internal-link');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    const lineRef = parseLineReference(href);
    
    if (lineRef) {
      // 创建预览
      link.addEventListener('mouseenter', () => {
        showLinePreview(link, lineRef, context);
      });
    }
  });
});
```

#### 第二步：智能内容提取

不需要特殊标记，通过智能识别内容边界：

```typescript
class SmartContentExtractor {
  // 提取代码块
  extractCodeBlock(content: string, line: number): string[] {
    const lines = content.split('\n');
    let start = line;
    let end = line;
    
    // 向上查找代码块开始
    while (start > 0 && !lines[start-1].match(/^```/)) {
      start--;
    }
    
    // 向下查找代码块结束
    while (end < lines.length && !lines[end].match(/^```/)) {
      end++;
    }
    
    return lines.slice(start, end + 1);
  }
  
  // 提取段落
  extractParagraph(content: string, line: number): string[] {
    const lines = content.split('\n');
    let start = line;
    let end = line;
    
    // 向上查找段落开始（空行）
    while (start > 0 && lines[start-1].trim() !== '') {
      start--;
    }
    
    // 向下查找段落结束（空行）
    while (end < lines.length - 1 && lines[end+1].trim() !== '') {
      end++;
    }
    
    return lines.slice(start, end + 1);
  }
  
  // 提取列表
  extractList(content: string, line: number): string[] {
    const lines = content.split('\n');
    const baseIndent = lines[line].match(/^\s*/)[0].length;
    let start = line;
    let end = line;
    
    // 提取整个列表（相同或更深的缩进）
    while (start > 0 && lines[start-1].match(/^\s*[-*+\d]/)) {
      start--;
    }
    
    while (end < lines.length - 1) {
      const nextLine = lines[end + 1];
      const nextIndent = nextLine.match(/^\s*/)[0].length;
      if (nextLine.trim() === '' || (nextIndent < baseIndent && nextLine.trim() !== '')) {
        break;
      }
      end++;
    }
    
    return lines.slice(start, end + 1);
  }
}
```

### 2.4 用户交互设计

#### 简单的创建方式

1. **右键菜单**：
   - 选中多行文本
   - 右键 -> "创建多行引用"
   - 自动生成引用链接

2. **拖放支持**：
   - 选中文本
   - 拖动到另一个文档
   - 自动创建引用

3. **智能建议**：
   ```typescript
   // 当用户输入 ![[file# 时
   class MultilineReferenceSuggester {
     getSuggestions(file: TFile, input: string): Suggestion[] {
       const content = await vault.read(file);
       const suggestions = [];
       
       // 建议所有标题
       const headings = metadataCache.getFileCache(file)?.headings || [];
       headings.forEach(h => {
         suggestions.push({
           text: h.heading,
           action: () => `![[${file.name}#${h.heading}]]`
         });
       });
       
       // 建议代码块
       const codeBlocks = this.findCodeBlocks(content);
       codeBlocks.forEach(block => {
         suggestions.push({
           text: `Code: ${block.language} (${block.lines} lines)`,
           action: () => `![[${file.name}#L${block.start}:L${block.end}]]`
         });
       });
       
       return suggestions;
     }
   }
   ```

### 2.5 渲染优化

#### 使用虚拟滚动
对于长内容，使用虚拟滚动：

```typescript
class VirtualRenderer {
  render(lines: string[], container: HTMLElement) {
    const viewportHeight = container.clientHeight;
    const lineHeight = 20; // 估算
    const visibleLines = Math.ceil(viewportHeight / lineHeight);
    
    // 只渲染可见部分
    const scrollTop = container.scrollTop;
    const startLine = Math.floor(scrollTop / lineHeight);
    const endLine = startLine + visibleLines + 5; // 缓冲
    
    // 使用 placeholder 维持滚动高度
    const totalHeight = lines.length * lineHeight;
    container.style.height = totalHeight + 'px';
    
    // 渲染可见行
    const visibleContent = lines.slice(startLine, endLine).join('\n');
    MarkdownRenderer.renderMarkdown(visibleContent, container, '', null);
  }
}
```

#### 增量更新
使用 diff 算法只更新变化的部分：

```typescript
class IncrementalUpdater {
  private lastContent: Map<string, string[]> = new Map();
  
  update(blockId: string, newLines: string[], container: HTMLElement) {
    const oldLines = this.lastContent.get(blockId) || [];
    const patches = this.diff(oldLines, newLines);
    
    patches.forEach(patch => {
      if (patch.type === 'add') {
        this.addLines(container, patch.lines, patch.position);
      } else if (patch.type === 'remove') {
        this.removeLines(container, patch.start, patch.count);
      } else if (patch.type === 'update') {
        this.updateLines(container, patch.lines, patch.start);
      }
    });
    
    this.lastContent.set(blockId, newLines);
  }
}
```

### 2.6 独特功能

#### 1. 动态引用
引用可以是动态的：

```markdown
![[DailyNote#today]]        // 总是显示今天的内容
![[file#last-modified]]     // 显示最近修改的部分
![[file#containing:TODO]]   // 显示包含 TODO 的部分
```

#### 2. 引用模板
支持对引用内容进行转换：

```markdown
![[file#L10:L20|format:quote]]     // 格式化为引用
![[file#codeblock|lang:python]]    // 指定语言高亮
![[file#section|summary]]          // 生成摘要
```

#### 3. 实时协作
如果多人编辑同一文档：

```typescript
class CollaborativeReference {
  // 监听目标文件变化
  watchTarget(file: TFile, callback: (changes: Change[]) => void) {
    // 使用 Obsidian 的文件监听
    this.registerEvent(
      vault.on('modify', (modifiedFile) => {
        if (modifiedFile === file) {
          const changes = this.detectChanges(file);
          callback(changes);
        }
      })
    );
  }
  
  // 高亮变化
  highlightChanges(container: HTMLElement, changes: Change[]) {
    changes.forEach(change => {
      const element = container.querySelector(`[data-line="${change.line}"]`);
      if (element) {
        element.classList.add('reference-changed');
        // 3秒后移除高亮
        setTimeout(() => {
          element.classList.remove('reference-changed');
        }, 3000);
      }
    });
  }
}
```

## 三、实施路线

### Week 1: 核心功能
- [ ] 行号引用解析
- [ ] 基础内容提取
- [ ] 简单渲染

### Week 2: 用户体验
- [ ] 右键菜单
- [ ] 拖放支持
- [ ] 智能建议

### Week 3: 高级功能
- [ ] 动态引用
- [ ] 引用模板
- [ ] 实时更新

### Week 4: 优化
- [ ] 虚拟滚动
- [ ] 增量更新
- [ ] 性能调优

## 四、关键优势

1. **简单直观**：不需要特殊标记，利用已有概念
2. **强大灵活**：支持多种引用方式
3. **性能优异**：虚拟滚动和增量更新
4. **创新功能**：动态引用和模板
5. **易于扩展**：清晰的架构，方便添加新功能

## 五、总结

这个设计方案：
- 不是修复 block 分支的问题，而是重新思考整个功能
- 不是对抗 Obsidian，而是优雅地扩展它
- 不是追求功能完整，而是追求用户体验
- 不是复杂的工程，而是简单的创新

记住：**最好的设计是用户感觉不到设计的存在。**