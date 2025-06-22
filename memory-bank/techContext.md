# σ₃: Technical Context
*v1.0 | Created: 2024-12-19 | Updated: 2024-12-19*
*Π: DEVELOPMENT | Ω: RESEARCH*

## 🛠️ Technology Stack

### Core Technologies
- **🖥️ Frontend**: TypeScript 4.7.4 + Obsidian Plugin API
- **📦 Package Manager**: npm (with package-lock.json)
- **🔧 Build System**: ESBuild 0.17.3 (Fast bundling)
- **📋 Language**: TypeScript (Strict mode enabled)
- **🎯 Target Platform**: Obsidian Desktop + Mobile

### Development Dependencies

#### TypeScript & Build Tools
```json
{
  "@types/node": "^16.11.6",
  "typescript": "4.7.4",
  "tslib": "2.4.0",
  "esbuild": "0.17.3",
  "builtin-modules": "3.3.0"
}
```

#### Code Quality & Linting
```json
{
  "@typescript-eslint/eslint-plugin": "5.29.0",
  "@typescript-eslint/parser": "5.29.0"
}
```

#### Obsidian Ecosystem
```json
{
  "obsidian": "latest",
  "@codemirror/language": "^6.3.2"
}
```

## 🏗️ Build Configuration

### ESBuild Setup (esbuild.config.mjs)
- **Entry Point**: main.ts
- **Output**: main.js (for Obsidian)
- **Format**: CommonJS (Obsidian requirement)
- **External Modules**: obsidian, electron
- **Development Mode**: Watch mode with incremental builds
- **Production Mode**: Minified output

### TypeScript Configuration (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2018",
    "lib": ["DOM", "ES6"],
    "allowJs": true,
    "module": "CommonJS",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

### Package.json Scripts
```json
{
  "dev": "node esbuild.config.mjs",
  "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
  "version": "node version-bump.mjs && git add manifest.json versions.json"
}
```

## 🔧 Development Environment

### Project Structure
```
obsidian-block-link-plus/
├── src/                    # Source code (modular structure)
│   ├── ui/                 # UI components (empty - future use)
│   ├── css/                # CSS modules (empty - future use)  
│   └── enactor/            # Business logic (empty - future use)
├── memory-bank/            # RIPER5 memory system
│   └── backups/            # Backup storage
├── main.ts                 # Main plugin entry (1620 lines)
├── main.js                 # Compiled output (1449 lines)
├── test.ts                 # Test suite (1213 lines)
├── manifest.json           # Obsidian plugin manifest
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── esbuild.config.mjs      # Build configuration
├── .eslintrc               # ESLint rules
└── styles.css              # Minimal base styles
```

### Code Quality Tools

#### ESLint Configuration (.eslintrc)
- **Parser**: @typescript-eslint/parser
- **Plugins**: @typescript-eslint/eslint-plugin
- **Rules**: Strict TypeScript enforcement
- **Ignore**: .eslintignore for build outputs

#### Editor Configuration (.editorconfig)
- **Charset**: utf-8
- **Indent**: tabs
- **Line endings**: lf
- **Final newline**: true

## 🚀 Deployment & Distribution

### Obsidian Plugin Requirements
- **Manifest Version**: Compatible with Obsidian 0.15.0+
- **Plugin ID**: "block-link-plus"
- **Main Entry**: main.js (compiled from main.ts)
- **Mobile Support**: isDesktopOnly: false

### Version Management (version-bump.mjs)
- **Automatic Versioning**: Syncs package.json → manifest.json → versions.json
- **Git Integration**: Auto-commits version changes
- **Release Process**: Supports automated releases

### File Assets
- **User Documentation**: README.md (English) + README_zh.md (Chinese)
- **Demo Content**: user_case.gif (8.5MB usage demonstration)
- **License**: GNU GPLv3 (LICENSE file, 675 lines)
- **Data**: data.json (configuration data)

## 🧪 Testing Infrastructure

### Test Framework (test.ts - 1213 lines)
- **Unit Tests**: Individual function testing
- **Integration Tests**: Full workflow testing
- **Mock System**: Obsidian API mocking
- **Edge Cases**: Boundary condition testing
- **Performance Tests**: Memory and execution time validation

### Testing Dependencies
- **Native Testing**: No external testing framework
- **Obsidian Mocks**: Custom mock implementations
- **TypeScript Support**: Full type checking in tests

## 🔒 Security & Compliance

### Code Security
- **No External APIs**: Self-contained plugin
- **Local Data Only**: No network requests
- **Obsidian Sandbox**: Runs within Obsidian's security model
- **Type Safety**: Full TypeScript strict mode

### License Compliance
- **GNU GPLv3**: Open source license
- **Dependency Licenses**: All dependencies compatible
- **Attribution**: Proper credit to referenced projects

## 🔄 Development Workflow

### Local Development
1. **Setup**: `npm install`
2. **Development**: `npm run dev` (watch mode)
3. **Testing**: Run test.ts
4. **Building**: `npm run build` (production)
5. **Versioning**: `npm run version`

### Git Workflow
- **Repository**: Git-enabled with .gitignore
- **Ignore Patterns**: node_modules, build outputs, OS files
- **Version Control**: Automated version commits

## 📊 Performance Characteristics

### Bundle Size
- **Main Bundle**: main.js (48KB compiled)
- **Styles**: styles.css (134B minimal)
- **Dependencies**: Optimized for Obsidian environment

### Runtime Performance
- **Memory Usage**: Minimal footprint
- **CPU Usage**: Efficient text processing
- **UI Responsiveness**: Non-blocking operations
- **Startup Time**: Fast plugin initialization

## 🔮 Future Technical Considerations

### Potential Upgrades
- **TypeScript 5.x**: Future language features
- **ESBuild Updates**: Build performance improvements
- **Module System**: Full src/ directory utilization
- **Testing Framework**: External testing library integration
- **Performance Monitoring**: Runtime analytics 