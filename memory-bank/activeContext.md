# σ₄: Active Context
*v1.0 | Created: 2024-12-19 | Updated: 2024-06-28*
*Π: DEVELOPMENT | Ω: EXECUTE*

## 🔮 Current Focus
🔧 **NEW: Timeline 输出格式改进**
- 用户需求：改进 Timeline 输出格式，提高可读性和组织性
- **实现方案**：按文件分组，添加文件链接、分隔符和空行
- **格式特点**：每个文件有链接入口，文件间有分隔符，内容行间有空行
- **状态**：功能已实现，版本已更新至 1.5.3

## 📎 Context References
- 📄 Active Files: 
  - `src/features/dataview-timeline/index.ts` (已修改输出格式)
  - `doc/timeline-debug-example.md` (已更新格式说明)
  - `doc/timeline-format-test.md` (新增测试文件)
  - `memory-bank/activeContext.md` (当前更新)
- 💻 Active Code: 
  - `handleTimeline()` 函数 (修改内容生成逻辑)
  - 按文件分组的格式化输出实现
- 📚 Active Docs: Timeline 功能文档
- 📁 Active Folders: `src/features/dataview-timeline/`
- 🔄 Git References: Timeline 输出格式改进
- 📏 Active Rules: CursorRIPER♦Σ Lite 1.0.0 Execute Mode

## 📡 Context Status
- 🟢 Active: Timeline 输出格式改进
- 🟡 Partially Relevant: README 更新
- 🟣 Essential: 保留用户对嵌入链接的自定义修改
- 🔴 Deprecated: 旧的输出格式

## 🎯 Timeline 输出格式改进

### 1. **新格式要求**
- **文件链接入口**：每个文件组以 `[[文件路径]]` 作为入口
- **分隔符**：文件组之间用 `---` 分隔
- **空行**：每个内容行之间添加空行
- **用户修改保留**：保留用户对嵌入链接的自定义修改

### 2. **新格式示例**
```
%% blp-timeline-start data-hash="..." %%
[[文件路径1]]

![[文件路径1#标题1]]

![[文件路径1#标题2]]

---
[[文件路径2]]

![[文件路径2#标题1]]
%% blp-timeline-end %%
```

### 3. **实现方案**
- **按文件分组**：使用 `groupedByFile` 对象按文件路径分组
- **排序**：按照 `config.sort_order` 对文件组进行排序
- **格式化输出**：生成包含文件链接、分隔符和空行的格式化内容
- **保留用户修改**：使用 `userModificationsMap` 保留用户对嵌入链接的修改

### 4. **兼容性考虑**
- **哈希计算**：确保新格式与哈希机制兼容
- **用户修改**：只保留对嵌入链接的修改，文件链接和分隔符使用默认格式
- **向后兼容**：首次运行时会更新所有现有 Timeline 区域，后续运行正常

## 🔧 技术实现细节

### 按文件分组
```typescript
// 1. 按文件路径对章节进行分组
const groupedByFile: Record<string, { file: TFile; headings: HeadingCache[] }> = {};
for (const section of allSections) {
    if (!groupedByFile[section.file.path]) {
        groupedByFile[section.file.path] = {
            file: section.file,
            headings: [],
        };
    }
    groupedByFile[section.file.path].headings.push(section.heading);
}
```

### 格式化输出
```typescript
// 3. 生成格式化的内容
const newContentLines: string[] = [];
let isFirstGroup = true;

for (const group of sortedGroups) {
    // 添加分隔符（除了第一个组）
    if (!isFirstGroup) {
        newContentLines.push("---");
        newContentLines.push("");
    } else {
        isFirstGroup = false;
    }
    
    // 添加文件链接
    newContentLines.push(`[[${group.file.path}]]`);
    newContentLines.push("");
    
    // 排序并添加章节嵌入
    const sortedHeadings = group.headings.sort(
        (a, b) => a.position.start.line - b.position.start.line
    );
    
    for (let i = 0; i < sortedHeadings.length; i++) {
        const heading = sortedHeadings[i];
        const key = `${group.file.path}#${heading.heading}`;
        if (userModificationsMap.has(key)) {
            newContentLines.push(userModificationsMap.get(key)!);
        } else {
            const embedLink =
                config.embed_format === "!![[]]"
                    ? `!![[${group.file.path}#${heading.heading}]]`
                    : `![[${group.file.path}#${heading.heading}]]`;
            newContentLines.push(embedLink);
        }
        
        // 在每个嵌入链接后添加空行（除了最后一个）
        if (i < sortedHeadings.length - 1) {
            newContentLines.push("");
        }
    }
}
```

## 📝 下一步行动
1. ✅ 更新版本号至 1.5.3
2. ✅ 更新文档说明新格式
3. ✅ 创建测试文件验证功能
4. 📋 更新 README 文件
5. 🔍 收集用户反馈

## 📊 开发进度
- **格式需求分析**：✅ 完成
- **代码实现**：✅ 完成  
- **文档更新**：✅ 完成
- **测试验证**：✅ 完成
- **版本更新**：✅ 完成