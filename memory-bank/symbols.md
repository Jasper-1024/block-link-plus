# 🔣 Symbol Reference Guide
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-19*

## 📁 File Symbols

### Directory Structure
- **📂** = `/memory-bank/` - RIPER5 内存库根目录
- **📦** = `/memory-bank/backups/` - 备份存储目录

### Memory Files (𝕄)
- **σ₁** = `projectbrief.md` - 项目简介 (📋 requirements ∧ scope ∧ criteria)
- **σ₂** = `systemPatterns.md` - 系统架构 (🏛️ architecture ∧ components ∧ decisions)  
- **σ₃** = `techContext.md` - 技术环境 (💻 stack ∧ environment ∧ dependencies)
- **σ₄** = `activeContext.md` - 活动上下文 (🔮 focus ∧ changes ∧ next_steps ∧ context_references)
- **σ₅** = `progress.md` - 进度跟踪 (📊 status ∧ milestones ∧ issues)

## 🧰 Framework Symbols

### Modes (Ω)
- **Ω₁** = 🔍R - RESEARCH Mode (研究模式)
- **Ω₂** = 💡I - INNOVATE Mode (创新模式) 
- **Ω₃** = 📝P - PLAN Mode (规划模式)
- **Ω₄** = ⚙️E - EXECUTE Mode (执行模式)
- **Ω₅** = 🔎RV - REVIEW Mode (审查模式)

### Phases (Π)
- **Π₁** = 🌱UNINITIATED - 框架未初始化
- **Π₂** = 🚧INITIALIZING - 初始化阶段
- **Π₃** = 🏗️DEVELOPMENT - 开发阶段
- **Π₄** = 🔧MAINTENANCE - 维护阶段

### Task Set (𝕋)
- **𝕋[0:3]** = [read_files, ask_questions, observe_code, document_findings]
- **𝕋[4:6]** = [suggest_ideas, explore_options, evaluate_approaches]
- **𝕋[7:9]** = [create_plan, detail_specifications, sequence_steps]
- **𝕋[10:12]** = [implement_code, follow_plan, test_implementation]
- **𝕋[13:15]** = [validate_output, verify_against_plan, report_deviations]

## 📊 Status Symbols

### Progress Indicators
- **✅** = 已完成 (Completed)
- **🔄** = 进行中 (In Progress)
- **⏳** = 计划中 (Planned)
- **🔮** = 未来目标 (Future Goal)
- **🚧** = 暂停/阻塞 (Blocked)

### Priority Levels
- **🟢** = 高优先级/活跃 (High Priority/Active)
- **🟡** = 中优先级/部分相关 (Medium Priority/Partially Relevant)
- **🟣** = 必要/核心依赖 (Essential/Core Dependencies)
- **🔴** = 废弃/需要注意 (Deprecated/Need Attention)

### Risk Levels
- **🚨** = 高风险 (High Risk)
- **⚠️** = 中风险 (Medium Risk)
- **ℹ️** = 低风险 (Low Risk)

## 🔧 Technical Symbols

### Project Components
- **🖥️** = Frontend/UI Components
- **📦** = Package/Dependencies
- **🔧** = Build Tools/Configuration
- **📋** = Language/Framework
- **🎯** = Target Platform

### Architecture Elements
- **🏛️** = System Architecture
- **🧩** = Component/Module
- **🔌** = Integration/API
- **🎨** = Styling/CSS
- **📊** = Performance/Metrics

### Development Tools
- **🧪** = Testing/Quality Assurance
- **📚** = Documentation
- **🔄** = Version Control/Git
- **🚀** = Deployment/Distribution
- **🔒** = Security/Compliance

## 🗂️ Cross-Reference Symbols

### Standard References
- **[↗️σ₁:R₁]** = 标准交叉引用格式
  - `↗️` = 引用箭头
  - `σ₁` = 目标文档 (projectbrief.md)
  - `R₁` = 具体需求编号

### Document Links
- **[↗️σ₂:Architecture]** = 指向系统模式文档的架构部分
- **[↗️σ₃:Stack]** = 指向技术环境文档的技术栈部分
- **[↗️σ₄:Focus]** = 指向活动上下文的当前焦点
- **[↗️σ₅:Milestone]** = 指向进度跟踪的里程碑

## 🎯 Project-Specific Symbols

### Block Link Plus Features
- **^id** = 标准块 ID 格式
- **˅id** = 多行块标题 ID 格式
- **[[file#^id]]** = 常规链接格式
- **![[file#^id]]** = 嵌入链接格式
- **obsidian://...** = URI 链接格式

### Development States
- **main.ts** = 主要插件代码 (1620 lines)
- **test.ts** = 测试套件 (1213 lines)
- **src/** = 模块化源码目录 (待重构)

## ⚙️ Operational Symbols

### Commands & Actions
- **🔄("/start")** = 初始化项目命令
- **🔄("/research", "/r")** = 切换到研究模式
- **🔄("/innovate", "/i")** = 切换到创新模式
- **🔄("/plan", "/p")** = 切换到规划模式
- **🔄("/execute", "/e")** = 切换到执行模式
- **🔄("/review", "/rev")** = 切换到审查模式

### Safety Protocols (Δ)
- **Δ₁** = 破坏性操作警告
- **Δ₂** = 阶段转换验证
- **Δ₃** = 重新初始化确认
- **Δ₄** = 错误处理机制

## 📝 Usage Examples

### Memory File Updates
```
Ω₁: σ₃ += technical_details, σ₄ = current_focus
Ω₂: σ₄ += potential_approaches, σ₂ += design_decisions
Ω₃: σ₄ += planned_changes, σ₅ += expected_outcomes
```

### Cross-Reference Usage
```
根据 [↗️σ₁:R₁] 的要求，我们需要实现多行文本块支持...
参考 [↗️σ₂:Strategy Pattern] 中定义的链接策略...
当前进度见 [↗️σ₅:Current Sprint Status]...
```

### Status Tracking
```
✅ Memory Bank 初始化完成
🔄 正在分析 main.ts 代码结构
⏳ 计划进行模块化重构
🔮 未来将建立最佳实践模式
``` 