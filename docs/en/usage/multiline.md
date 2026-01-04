# Multi-line Blocks

Create block references from multi-line text selection with four processing strategies.

## Core Innovation: ^abc123-abc123 Format

Multi-line block identifier format enabling multi-line text references:

**How it works**:
```
First line content ^abc123
Second line content
Third line content ^abc123-abc123
```

**Reference syntax**:
```
![[filename#^abc123-abc123]]
```

**Display result**:
```
First line content
Second line content  
Third line content
```

## Processing Strategies

Choose multi-line text processing method in settings:

### 1. Default Processing
Treat multi-line selection as single block, add one block ID at the end.

**Generated format**:
```
First line content
Second line content ^abc123
```

**Reference syntax**:
```
![[filename#^abc123]]
```

### 2. Add New Heading  
Create new heading above selected content with special identifier.

**Generated format**:
```
## ˅abc123
First line content
Second line content
```

**Reference syntax**:
```
![[filename#˅abc123]]
```

### 3. Add Multiple Blocks
Create separate block ID for each line.

**Generated format**:
```
First line content ^abc123

Second line content ^def456
```

**Reference syntax**:
```
![[filename#^abc123]]
![[filename#^def456]]
```

### 4. Add Multi-line Block
Use range identifiers to mark start and end.

**Generated format**:
```
First line content ^abc123
Second line content
Third line content ^abc123-abc123
```

**Reference syntax**:
```
![[filename#^abc123-abc123]]
```

**Display result**: Complete display of all content from first to third line.

## Recommendations

- **Single-page reference** - Use default processing
- **Section organization** - Use add new heading
- **Line-by-line reference** - Use add multiple blocks
- **Precise range** - Use add multi-line block

## Compatibility

- **Default processing**: Fully compatible with native block references
- **New heading**: Special rendering in reading mode
- **Multiple blocks**: Standard block reference syntax
- **Multi-line block**: Plugin-specific format
