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
Wrap the selection with a pair of special headings (`## ˅id` ... `## ^id`).

**Generated format**:
```
## ˅abc123
First line content
Second line content

## ^abc123
```

**Reference syntax**:
```
![[filename#˅abc123]]
```

### 3. Add Multiple Blocks
Create separate block IDs per block (paragraph, list item, etc.).

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

Notes:
- By default, the end marker is appended inline at the end of the end line. If the end falls inside block structures (blockquote/list/code/table/comment, etc.), it may be inserted as a standalone line after the block, with a blank line added only when needed.
- If a list item has continuation lines, the block ID is inserted at the end of the item.

**Reference syntax**:
```
![[filename#^abc123-abc123]]
```

**Display result**: Complete display of all content from first to third line.

## Recommendations

- **Single-page reference** - Use default processing
- **Section organization** - Use add new heading
- **Block-by-block reference** - Use add multiple blocks
- **Precise range** - Use add multi-line block

## Compatibility

- **Default processing**: Fully compatible with native block references
- **New heading**: Special rendering in reading mode
- **Multiple blocks**: Standard block reference syntax
- **Multi-line block**: Plugin-specific format
