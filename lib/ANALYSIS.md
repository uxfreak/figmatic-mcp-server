# Analysis Library

The Analysis Library provides layered abstractions for examining Figma designs programmatically.

## Architecture: 5 Layers

### Layer 1: Property Extractors
Low-level functions for safely extracting specific properties from nodes.

```javascript
const { extractFills, extractEffects, extractLayoutProps } = require('./lib/analysis');

// Extract fills with variable bindings
const fills = extractFills(node, { includeBindings: true });
// Returns: [{ type: 'SOLID', color: { r, g, b }, boundVariable: { id } }]

// Extract effects (shadows, blurs, glows)
const effects = extractEffects(node);
// Returns: [{ type: 'LAYER_BLUR', radius: 200, visible: true }]

// Extract auto-layout properties
const layout = extractLayoutProps(node);
// Returns: { layoutMode, layoutAlign, layoutGrow, itemSpacing, padding }
```

**Available extractors:**
- `extractBasicProps(node)` - id, name, type, width, height, visible
- `extractPosition(node)` - x, y coordinates
- `extractPadding(node)` - padding (left, right, top, bottom)
- `extractLayoutProps(node)` - auto-layout properties
- `extractFills(node, options)` - fills with optional bindings
- `extractStrokes(node, options)` - strokes with optional bindings
- `extractEffects(node)` - effects (shadows, blurs)
- `extractTextProps(node)` - text-specific properties
- `extractCornerRadius(node)` - corner radius
- `extractBoundVariable(node, property, index)` - variable binding

### Layer 2: Binding Resolvers
Functions to extract and resolve variable IDs to their names.

```javascript
const { extractVariableIds, resolveVariableIds, enrichWithVariableNames } = require('./lib/analysis');

// Extract all variable IDs from an analysis result
const ids = extractVariableIds(analysisResult);
// Returns: ['VariableID:9:127', 'VariableID:8:791']

// Resolve IDs to names and collections
const mapping = await resolveVariableIds(ids, getAllVariablesFn);
// Returns: {
//   'VariableID:9:127': { name: 'Glow', collection: 'Tokens' },
//   'VariableID:8:791': { name: 'page background', collection: 'Tokens' }
// }

// Enrich analysis with resolved names
const enriched = enrichWithVariableNames(analysisResult, mapping);
// boundVariable now includes: { id, name, collection }
```

### Layer 3: Node Type Analyzers
Type-specific analysis functions.

```javascript
const { analyzeFrame, analyzeRectangle, analyzeText, analyzeNode } = require('./lib/analysis');

// Analyze a frame with auto-layout
const frame = analyzeFrame(node, {
  includePosition: true,
  includeFills: true,
  includeChildren: true,
  recurse: false
});

// Analyze any node (auto-detects type)
const result = analyzeNode(node, options);
```

**Available analyzers:**
- `analyzeGenericNode(node, options)` - works for any node type
- `analyzeFrame(node, options)` - frames with layout
- `analyzeText(node, options)` - text nodes
- `analyzeRectangle(node, options)` - rectangles with corner radius
- `analyzeEllipse(node, options)` - ellipses/circles
- `analyzeInstance(node, options)` - component instances
- `analyzeGroup(node, options)` - groups
- `analyzeNode(node, options)` - auto-routes to correct analyzer

**Options:**
```javascript
{
  includePosition: true,      // Include x, y coordinates
  includeFills: true,          // Include fill information
  includeStrokes: false,       // Include stroke information
  includeEffects: true,        // Include effects (shadows, blurs)
  includeBindings: true,       // Include variable bindings
  includeChildren: true,       // Include child nodes
  recurse: false               // Recursively analyze children
}
```

### Layer 4: Pattern Detectors
Functions to recognize common design patterns.

```javascript
const {
  hasGlowPattern,
  hasShadowPattern,
  analyzeAutoLayoutPattern,
  analyzeBindingCoverage
} = require('./lib/analysis');

// Detect glow effects
if (hasGlowPattern(node)) {
  console.log('Node has glow effect!');
}

// Analyze auto-layout structure
const layoutPattern = analyzeAutoLayoutPattern(frame);
// Returns: { type: 'auto-layout', direction: 'VERTICAL', spacing: 20, ... }

// Check variable binding coverage
const coverage = analyzeBindingCoverage(node);
// Returns: { fills: true, dimensions: false, percentage: 50 }
```

### Layer 5: Unified Analysis API
High-level interface for complete analysis.

```javascript
const { analyze } = require('./lib/analysis');

const result = await analyze(
  'Background Glow',           // Node name
  api.executeInFigma,          // Execute function
  {
    includePosition: true,
    includeFills: true,
    includeEffects: true,
    includeBindings: true,
    includeChildren: true,
    recurse: true,
    resolveVariables: true,    // Automatically resolve variable names
    getAllVariablesFn: api.getAllVariables
  }
);

// Result has fully resolved variable bindings:
// result.children[0].fills[0].boundVariable = {
//   id: 'VariableID:9:127',
//   name: 'Glow',
//   collection: 'Tokens'
// }
```

## Usage Examples

### Basic Analysis

```javascript
const { runScript, analyze } = require('./lib');

runScript('Analyze Node', async (api) => {
  const node = await analyze('My Frame', api.executeInFigma, {
    includeFills: true,
    includeEffects: true,
    includeBindings: true,
    resolveVariables: true,
    getAllVariablesFn: api.getAllVariables
  });

  console.log(`Node: ${node.name}`);
  console.log(`Size: ${node.width}×${node.height}px`);

  if (node.fills && node.fills[0].boundVariable) {
    const bv = node.fills[0].boundVariable;
    console.log(`Fill bound to: ${bv.collection}/${bv.name}`);
  }
});
```

### Recursive Structure Analysis

```javascript
const { runScript, analyze } = require('./lib');

runScript('Analyze Structure', async (api) => {
  const screen = await analyze('Help Screen', api.executeInFigma, {
    includeChildren: true,
    recurse: true,          // Recursively analyze all children
    includeBindings: true,
    resolveVariables: true,
    getAllVariablesFn: api.getAllVariables
  });

  function printTree(node, indent = '') {
    console.log(`${indent}${node.name} (${node.type})`);
    if (node.children) {
      node.children.forEach(child => printTree(child, indent + '  '));
    }
  }

  printTree(screen);
});
```

### Pattern Detection

```javascript
const { runScript, hasGlowPattern, analyzeNode } = require('./lib');

runScript('Find Glows', async (api) => {
  const result = await api.executeInFigma(`
    const frame = figma.currentPage.selection[0];

    ${hasGlowPattern.toString()}
    ${analyzeNode.toString()}
    // ... (include all dependencies)

    const glowNodes = [];
    frame.children.forEach(child => {
      if (hasGlowPattern(child)) {
        glowNodes.push(analyzeNode(child, {
          includeFills: true,
          includeEffects: true
        }));
      }
    });

    return glowNodes;
  `);

  console.log(`Found ${result.result.length} nodes with glow effects`);
});
```

## Comparison: Before vs After

### Before (Raw Script - 200+ lines)

```javascript
const { startServer, executeInFigma } = require('./websocket-server/server');

startServer();

setTimeout(async () => {
  try {
    const analysis = await executeInFigma(`
      const node = figma.root.findOne(n => n.name === 'Background Glow');

      // Manually extract every property
      const children = node.children.map(child => {
        const fillsInfo = child.fills ? child.fills.map((f, fillIndex) => {
          const info = { type: f.type };

          if (f.type === 'SOLID' && f.color) {
            info.color = {
              r: Math.round(f.color.r * 255),
              g: Math.round(f.color.g * 255),
              b: Math.round(f.color.b * 255)
            };
          }

          // Try to get bound variable
          if (child.boundVariables && child.boundVariables.fills) {
            const boundVar = child.boundVariables.fills[fillIndex];
            info.boundVariable = { id: boundVar.id };
          }

          return info;
        }) : [];

        const effectsInfo = child.effects ? child.effects.map(e => {
          return {
            type: e.type,
            visible: e.visible,
            radius: e.radius
          };
        }) : [];

        return {
          id: child.id,
          name: child.name,
          type: child.type,
          width: child.width,
          height: child.height,
          fills: fillsInfo,
          effects: effectsInfo
        };
      });

      return { children };
    `);

    // Manually resolve variable IDs (separate call!)
    const varIds = [];
    analysis.result.children.forEach(child => {
      child.fills.forEach(fill => {
        if (fill.boundVariable) varIds.push(fill.boundVariable.id);
      });
    });

    const varResult = await executeInFigma(`
      const allVars = await figma.variables.getLocalVariablesAsync();
      const targetIds = ${JSON.stringify(varIds)};
      return allVars.filter(v => targetIds.includes(v.id)).map(v => ({
        id: v.id,
        name: v.name
      }));
    `);

    // Manually merge results...
    // ... 100+ more lines of display logic

  } catch (error) {
    console.error(error);
  }
}, 5000);
```

### After (With Library - 50 lines)

```javascript
const { runScript, analyze } = require('./lib');

runScript('Analyze Background Glow', async (api) => {
  const glowGroup = await analyze(
    'Background Glow',
    api.executeInFigma,
    {
      includeFills: true,
      includeEffects: true,
      includeBindings: true,
      includeChildren: true,
      recurse: true,
      resolveVariables: true,
      getAllVariablesFn: api.getAllVariables
    }
  );

  glowGroup.children.forEach((child, i) => {
    console.log(`${i + 1}. ${child.name}`);
    console.log(`   Size: ${child.width}×${child.height}px`);

    if (child.fills && child.fills[0]) {
      const fill = child.fills[0];
      const { r, g, b } = fill.color;
      console.log(`   Fill: rgb(${r}, ${g}, ${b})`);

      if (fill.boundVariable) {
        console.log(`   Token: ${fill.boundVariable.collection}/${fill.boundVariable.name}`);
      }
    }

    if (child.effects && child.effects[0]) {
      console.log(`   Effect: ${child.effects[0].type} ${child.effects[0].radius}px`);
    }
  });
});
```

**Improvements:**
- 75% less code (200 lines → 50 lines)
- Automatic variable resolution (no manual ID → name mapping)
- Type-safe property extraction
- Consistent error handling
- Reusable across all analysis tasks

## Performance

The analysis library maintains the same performance optimizations:
- Single API call per analysis (functions inlined in executeInFigma)
- Variable resolution cached (getAllVariables called once)
- Parallel execution where possible

## Error Handling

All extractors handle missing properties gracefully:
- Returns `null` for missing scalar values
- Returns `[]` for missing arrays
- Never throws on undefined properties
- Safe for all node types
