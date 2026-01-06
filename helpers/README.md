# Figmatic Library

Functional, modular utilities for Figma automation scripts.

## Overview

The Figmatic library provides clean, composable helpers for common Figma automation tasks. It follows a functional programming style with:
- **Pure functions** where possible
- **Modular design** - each module focuses on one concern
- **Composability** - functions work well together
- **Type safety** - clear parameter expectations
- **Error handling** - informative error messages

## Installation

```javascript
const figmatic = require('./lib');
```

## Modules

### 1. Script Runner

Wraps scripts with standard initialization and error handling.

```javascript
const { runScript } = require('./lib');

runScript('My Script', async (api) => {
  // Your script logic
  // api provides: executeInFigma, getAllVariables, bindVariable, etc.
});
```

**Before (45 lines):**
```javascript
const {
  startServer,
  executeInFigma,
  getAllVariables,
  bindVariable,
  notifyFigma
} = require('./websocket-server/server');

console.log('🎯 My Script\n');
startServer();

setTimeout(async () => {
  console.log('\n🚀 Starting...\n');
  try {
    // ... your logic (30 lines)
    console.log('\n✅ Complete!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
```

**After (7 lines):**
```javascript
const figmatic = require('./lib');

figmatic.runScript('My Script', async (api) => {
  // ... your logic (30 lines)
});
```

---

### 2. Variables

Cache and retrieve Figma variables efficiently.

```javascript
const { createVariableCache } = require('./lib');

// Create cache instance
const varCache = createVariableCache();

// Get single variable
const spacing4 = await varCache.get('Spacing/spacing-4', api.getAllVariables);

// Get multiple variables
const vars = await varCache.getMany([
  'Spacing/spacing-4',
  'Spacing/spacing-5',
  'Fills/card-background'
], api.getAllVariables);

console.log(vars['Spacing/spacing-4'].id);
```

**Benefits:**
- ✅ Caches `getAllVariables()` result (expensive API call)
- ✅ Automatic error handling with helpful messages
- ✅ Batch operations with `getMany()`

---

### 3. Bindings

Batch variable binding with parallel execution.

```javascript
const {
  bindCornerRadii,
  bindPadding,
  bindPaddingHorizontal,
  bindSize,
  bindTextColor
} = require('./lib');

// Bind all 4 corner radii at once (parallel)
await bindCornerRadii(nodeId, radiusVarId, api.bindVariable);

// Bind all padding (parallel)
await bindPadding(nodeId, { all: spacing4Id }, api.bindVariable);

// Different values for different sides
await bindPadding(nodeId, {
  left: spacing5Id,
  right: spacing5Id,
  top: spacing4Id,
  bottom: spacing8Id
}, api.bindVariable);

// Horizontal padding only
await bindPaddingHorizontal(nodeId, spacing5Id, api.bindVariable);

// Size (width and height)
await bindSize(nodeId, dim10Id, api.bindVariable);

// Text color
await bindTextColor(textId, textPrimaryId, api.bindVariableToPaint);
```

**Before (8 sequential awaits):**
```javascript
await bindVariable({ nodeId, field: 'topLeftRadius', variableId });
await bindVariable({ nodeId, field: 'topRightRadius', variableId });
await bindVariable({ nodeId, field: 'bottomLeftRadius', variableId });
await bindVariable({ nodeId, field: 'bottomRightRadius', variableId });
await bindVariable({ nodeId, field: 'paddingLeft', variableId });
await bindVariable({ nodeId, field: 'paddingRight', variableId });
await bindVariable({ nodeId, field: 'paddingTop', variableId });
await bindVariable({ nodeId, field: 'paddingBottom', variableId });
```

**After (2 parallel calls):**
```javascript
await bindCornerRadii(nodeId, radiusVarId, api.bindVariable);
await bindPadding(nodeId, { all: paddingVarId }, api.bindVariable);
```

---

### 4. Components

Find components and text styles safely.

```javascript
const { findComponent, findComponents, findTextStyle } = require('./lib');

// Find single component
const backButton = await findComponent('BackButton', api.executeInFigma);

// Find multiple components
const components = await findComponents([
  'BackButton',
  'Help Navigation Card',
  'Button'
], api.executeInFigma);

// Find text style
const titleStyle = await findTextStyle('Title', api.executeInFigma);
```

**Benefits:**
- ✅ Automatic error messages if not found
- ✅ Batch finding with single API call
- ✅ Returns clean objects with id and name

---

### 5. Auto-Layout

Create auto-layout frames with presets.

```javascript
const {
  createVerticalFrame,
  createContentFrame,
  createHeaderFrame
} = require('./lib');

// Inside executeInFigma:
const code = createContentFrame('Content', {
  itemSpacing: 20,
  padding: { left: 20, right: 20, top: 16, bottom: 32 },
  layoutAlign: 'STRETCH',
  layoutGrow: 1
});

eval(code); // Creates 'frame' variable

// Use the frame
frame.appendChild(child);
```

**Presets:**
- `createVerticalFrame()` - Basic vertical layout
- `createHorizontalFrame()` - Basic horizontal layout
- `createContentFrame()` - Content area (vertical, stretched, auto-sizing)
- `createHeaderFrame()` - Header (horizontal, space-between)
- `createCardFrame()` - Card (vertical, padded, with background)

**Before (20 lines):**
```javascript
const frame = figma.createFrame();
frame.name = "Content";
frame.layoutMode = 'VERTICAL';
frame.primaryAxisSizingMode = 'AUTO';
frame.counterAxisSizingMode = 'FIXED';
frame.primaryAxisAlignItems = 'MIN';
frame.counterAxisAlignItems = 'CENTER';
frame.itemSpacing = 20;
frame.paddingLeft = 16;
frame.paddingRight = 16;
frame.paddingTop = 16;
frame.paddingBottom = 32;
frame.fills = [];
frame.layoutAlign = 'STRETCH';
frame.layoutGrow = 1;
```

**After (1 line):**
```javascript
eval(createContentFrame('Content', { itemSpacing: 20, padding: { left: 16, right: 16, top: 16, bottom: 32 } }));
```

---

### 6. Text

Create text nodes with safe font loading.

```javascript
const { createTextWithStyle, updateInstanceText } = require('./lib');

// Inside executeInFigma:
const code = createTextWithStyle('Help', titleStyleId, {
  layoutAlign: 'STRETCH',
  textAlign: 'CENTER',
  name: 'Title'
});

eval(code); // Creates 'text' variable

content.appendChild(text);

// Update text in component instance
await updateInstanceText(buttonInstanceId, 'Get in touch', api.executeInFigma);
```

**Benefits:**
- ✅ Handles default font (Inter Regular) automatically
- ✅ Loads text style font before applying
- ✅ No font loading errors
- ✅ Helper for updating instance text

---

## Complete Example

```javascript
const figmatic = require('./lib');

figmatic.runScript('Create Help Screen', async (api) => {
  // 1. Get variables (cached)
  const varCache = figmatic.createVariableCache();
  const vars = await varCache.getMany([
    'Spacing/spacing-4',
    'Spacing/spacing-5',
    'Fills/page background'
  ], api.getAllVariables);

  // 2. Find components
  const components = await figmatic.findComponents([
    'BackButton',
    'Help Navigation Card',
    'Button'
  ], api.executeInFigma);

  const textStyles = await figmatic.findTextStyles([
    'Title'
  ], api.executeInFigma);

  // 3. Create screen
  const screen = await api.executeInFigma(`
    // Main frame
    ${figmatic.createVerticalFrame('Help Screen', {
      itemSpacing: 0,
      width: 393,
      height: 852
    })}

    figma.currentPage.appendChild(frame);

    // Header
    ${figmatic.createHeaderFrame('Header')}
    const backBtn = figma.getNodeById('${components.BackButton.id}').createInstance();
    header.appendChild(backBtn);
    frame.appendChild(header);

    // Content
    ${figmatic.createContentFrame('Content')}

    ${figmatic.createTextWithStyle('Help', '${textStyles.Title.id}', {
      layoutAlign: 'STRETCH',
      textAlign: 'CENTER'
    })}
    content.appendChild(text);

    frame.appendChild(content);

    return { frameId: frame.id, contentId: content.id };
  `);

  // 4. Bind variables (parallel)
  await Promise.all([
    figmatic.bindFillColor(screen.result.frameId, vars['Fills/page background'].id, api.bindVariableToPaint),
    figmatic.bindPaddingHorizontal(screen.result.contentId, vars['Spacing/spacing-5'].id, api.bindVariable)
  ]);

  await api.notifyFigma('✅ Help screen created!', 3000);
});
```

## Migration Guide

### Old Script Structure
```javascript
const { startServer, executeInFigma, getAllVariables, bindVariable } = require('./websocket-server/server');
startServer();
setTimeout(async () => {
  try {
    const allVars = await getAllVariables();
    const spacing4 = allVars.variables.find(v => v.name === 'Spacing/spacing-4');
    // ...
  } catch (error) {
    console.error(error);
  }
}, 5000);
```

### New Script Structure
```javascript
const figmatic = require('./lib');

figmatic.runScript('My Script', async (api) => {
  const varCache = figmatic.createVariableCache();
  const spacing4 = await varCache.get('Spacing/spacing-4', api.getAllVariables);
  // ...
});
```

## Performance Improvements

| Operation | Old Approach | New Approach | Speedup |
|-----------|--------------|--------------|---------|
| Get 5 variables | 5× `getAllVariables()` | 1× cached | **5×** |
| Bind 4 corner radii | 4 sequential awaits | 1 parallel call | **4×** |
| Bind 4 padding sides | 4 sequential awaits | 1 parallel call | **4×** |

## Best Practices

1. **Always use variable cache** for multiple variable lookups
2. **Use batch binding helpers** instead of individual bindings
3. **Use presets** for common auto-layout patterns
4. **Use text helpers** to avoid font loading errors
5. **Leverage Promise.all()** for independent operations

## API Reference

See individual module files for detailed JSDoc documentation:
- `script-runner.js` - Script wrapper
- `variables.js` - Variable cache and getters
- `bindings.js` - Batch binding helpers
- `components.js` - Component finders
- `autolayout.js` - Auto-layout presets
- `text.js` - Text creation helpers
