# Copy Properties Workflow - Complete Guide

**Last Updated:** 2024-12-27

Comprehensive guide for copying properties, bindings, and styles between Figma nodes using the copy tools.

---

## Overview

The copy tools enable efficient replication of properties from one node to another, supporting:
- **Variable bindings** (spacing, colors, dimensions)
- **Component property bindings** (text, instance swap)
- **Direct properties** (opacity, locked, layout)
- **Styles** (effects, fills, strokes, text)
- **Recursive child text styles**

---

## Available Tools

### 1. `copy_bindings` (Workflow)

**Purpose:** Copy only property bindings from source to target

**Use Cases:**
- Transfer variable bindings between components
- Sync component property references
- Copy instance swap bindings

**Signature:**
```json
{
  "name": "copy_bindings",
  "arguments": {
    "sourceNodeId": "272:3861",
    "targetNodeId": "272:3863",
    "bindingTypes": ["variables", "text", "instanceSwap"]  // Optional, defaults to all
  }
}
```

**Binding Types:**
- `variables` - Variable bindings (fills, spacing, dimensions via boundVariables)
- `text` - Text property bindings (via componentPropertyReferences)
- `instanceSwap` - Instance swap bindings (via componentPropertyReferences)

---

### 2. `copy_all_properties` (Comprehensive Workflow)

**Purpose:** Copy everything - bindings, direct properties, AND styles

**Use Cases:**
- Duplicate component configurations completely
- Apply template properties to new components
- Synchronize design system components

**Signature:**
```json
{
  "name": "copy_all_properties",
  "arguments": {
    "sourceNodeId": "273:3865",
    "targetNodeId": "273:3867",
    "includeTypes": ["bindings", "direct"]  // Optional, defaults to both
  }
}
```

**What It Copies:**

1. **Bindings** (via `copy_bindings` internally)
   - Variable bindings (spacing, colors, dimensions)
   - Component property bindings (text, instance swap)

2. **Direct Properties**
   - `opacity`, `visible`, `locked`, `blendMode`
   - Layout: `layoutMode`, sizing modes, alignment
   - Spacing: `itemSpacing`, padding (left, right, top, bottom)

3. **Styles** (NEW!)
   - Effect styles (`effectStyleId`) - shadows, blurs
   - Fill styles (`fillStyleId`)
   - Stroke styles (`strokeStyleId`)
   - Direct fills (if not using style or variable)
   - Direct strokes (if not using style or variable)
   - **Text styles from child nodes** (recursive)

---

## Recipe 1: Copy Variable Bindings Only

**Scenario:** You have a component with spacing/color variables bound, and want to apply the same bindings to another component.

**Steps:**

1. **Create or identify source component** with variable bindings
2. **Create or identify target component** (can have different values)
3. **Copy variable bindings only:**

```json
{
  "name": "copy_bindings",
  "arguments": {
    "sourceNodeId": "272:3861",
    "targetNodeId": "272:3863",
    "bindingTypes": ["variables"]
  }
}
```

**Result:**
```json
{
  "success": true,
  "totalCopied": 9,
  "copiedBindings": {
    "variables": [
      { "field": "itemSpacing", "variableId": "VariableID:272:3855" },
      { "field": "paddingLeft", "variableId": "VariableID:272:3855" },
      { "field": "paddingTop", "variableId": "VariableID:272:3855" },
      { "field": "paddingRight", "variableId": "VariableID:272:3855" },
      { "field": "paddingBottom", "variableId": "VariableID:272:3855" },
      { "field": "topLeftRadius", "variableId": "VariableID:272:3856" },
      { "field": "topRightRadius", "variableId": "VariableID:272:3856" },
      { "field": "bottomLeftRadius", "variableId": "VariableID:272:3856" },
      { "field": "bottomRightRadius", "variableId": "VariableID:272:3856" }
    ]
  }
}
```

**Target node now has:** All spacing and radius bindings from source

---

## Recipe 2: Copy Everything (Complete Replication)

**Scenario:** You want to create an exact copy of a component's configuration (bindings + properties + styles).

**Steps:**

1. **Create source component** with all desired properties:
   - Variable bindings (spacing, radius)
   - Text style on child text node
   - Effect style (shadow)
   - Fill color

2. **Create target component** (basic setup)

3. **Copy all properties:**

```json
{
  "name": "copy_all_properties",
  "arguments": {
    "sourceNodeId": "273:3865",
    "targetNodeId": "273:3867"
  }
}
```

**Result:**
```json
{
  "success": true,
  "totalBindingsCopied": 9,
  "totalDirectPropertiesCopied": 14,
  "totalStylesCopied": 3,
  "copiedStyles": [
    { "type": "effect", "styleId": "S:8fe3fe5768393e5464e1160890a91639c1bbd38f," },
    { "type": "fills", "count": 1 },
    {
      "type": "textStyles",
      "styles": [
        {
          "nodeId": "273:3868",
          "nodeName": "Target 2",
          "styleId": "S:6580270912d0270654a167a00d7fcaad42f42a61,"
        }
      ]
    }
  ]
}
```

**Target node now has:**
- ✅ All variable bindings (9 bindings)
- ✅ All direct properties (14 properties)
- ✅ Effect style (shadow)
- ✅ Fill color
- ✅ Text style on child text node

**Visual Result:** Target looks identical to source (except text content)

---

## Recipe 3: Copy Text Styles from Child Nodes

**Scenario:** Your component has multiple text nodes with different text styles, and you want to copy the styles to a target component's text children.

**How It Works:**
- `copy_all_properties` recursively traverses children
- Matches children by position (index-based)
- Copies text styles from source text nodes to target text nodes

**Example Structure:**
```
Component
├── Title (Text) - Heading style
├── Subtitle (Text) - Body style
└── Description (Text) - Caption style
```

**Steps:**

1. **Ensure target has same child structure** (same number of children in same order)
2. **Run copy_all_properties:**

```json
{
  "name": "copy_all_properties",
  "arguments": {
    "sourceNodeId": "source-component-id",
    "targetNodeId": "target-component-id"
  }
}
```

**Result:** All text styles copied to corresponding target text nodes

**Important:** Child matching is position-based, so ensure child order matches.

---

## Recipe 4: Filter Specific Binding Types

**Scenario:** You only want to copy instance swap bindings, not variable or text bindings.

**Steps:**

```json
{
  "name": "copy_bindings",
  "arguments": {
    "sourceNodeId": "button-source",
    "targetNodeId": "button-target",
    "bindingTypes": ["instanceSwap"]
  }
}
```

**Result:** Only instance swap bindings copied (e.g., icon swap property)

---

## Recipe 5: Copy Only Direct Properties (No Bindings)

**Scenario:** You want to copy layout and appearance properties, but not variable bindings.

**Steps:**

```json
{
  "name": "copy_all_properties",
  "arguments": {
    "sourceNodeId": "source-id",
    "targetNodeId": "target-id",
    "includeTypes": ["direct"]
  }
}
```

**Result:**
- ✅ Opacity, visible, locked, blendMode
- ✅ Layout properties
- ✅ Styles (effect, fill, stroke, text)
- ❌ No variable bindings

---

## Comprehensive Test Example

**Test Setup:**

1. **Create variables:**
   - `test-color` (COLOR) = magenta
   - `test-spacing` (FLOAT) = 16px
   - `test-radius` (FLOAT) = 12px

2. **Create text style:**
   - "Test Heading" - Inter Bold, 24px, 32px line height

3. **Create effect style:**
   - "Test Shadow" - Drop shadow, y:4, radius:8, 25% opacity

4. **Create SOURCE component:**
   - Bind padding to `test-spacing`
   - Bind corner radius to `test-radius`
   - Apply effect style (shadow)
   - Add text child with text style
   - Fill: green (#00CC66)

5. **Create TARGET component:**
   - Basic setup (gray fill, small padding, no styles)

6. **Run copy_all_properties:**

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "copy_all_properties",
      "arguments": {
        "sourceNodeId": "273:3865",
        "targetNodeId": "273:3867"
      }
    }
  }'
```

**Expected Result:**

TARGET component now has:
- ✅ 16px padding (from variable binding)
- ✅ 12px corner radius (from variable binding)
- ✅ Shadow effect (from effect style)
- ✅ Green fill (direct copy)
- ✅ Bold 24px text style on child (recursive copy)

**Visual Confirmation:** Take screenshots to verify TARGET matches SOURCE

---

## Best Practices

### 1. **Verify Node IDs Before Copying**
Always confirm source and target node IDs are correct:
```javascript
const source = await get_node_details({ nodeId: "source-id" });
const target = await get_node_details({ nodeId: "target-id" });
```

### 2. **Match Child Structures for Text Style Copying**
Ensure target has same child hierarchy as source for text style copying to work correctly.

### 3. **Use Filters When Needed**
Don't copy more than necessary - use `bindingTypes` or `includeTypes` filters:
```json
// Only copy layout properties, skip bindings
{ "includeTypes": ["direct"] }

// Only copy variable bindings, skip text/instance swap
{ "bindingTypes": ["variables"] }
```

### 4. **Test on Simple Cases First**
Before copying complex component hierarchies, test on simple components to verify behavior.

### 5. **Take Screenshots for Visual Verification**
Always use `get_screenshot` to confirm visual results match expectations.

---

## Error Handling

### Common Errors

**1. "Source node not found"**
```json
{ "error": "Source node not found: 272:9999" }
```
**Solution:** Verify node ID exists using `get_node_details`

**2. "Target node not found"**
```json
{ "error": "Target node not found: 272:9999" }
```
**Solution:** Verify node ID exists using `get_node_details`

**3. "Invalid binding types"**
```json
{ "error": "Invalid binding types: invalid. Valid types: variables, text, instanceSwap" }
```
**Solution:** Use only valid binding types

**4. Partial Success (Some Properties Failed)**
```json
{
  "copiedBindings": {
    "variables": [
      { "field": "fills", "error": "Not supported on target node" }
    ]
  }
}
```
**Solution:** Check target node type supports the property being copied

---

## Performance Considerations

### Batch Operations
If copying to multiple targets, consider using `batch_set_instance_properties` (when available) or loop with error handling:

```javascript
const targets = ["id1", "id2", "id3"];
for (const targetId of targets) {
  try {
    await copy_all_properties({ sourceNodeId, targetNodeId: targetId });
  } catch (err) {
    console.error(`Failed for ${targetId}:`, err);
  }
}
```

### Large Component Hierarchies
For components with many children, text style copying may take longer due to recursive traversal.

---

## Comparison: copy_bindings vs copy_all_properties

| Feature | copy_bindings | copy_all_properties |
|---------|---------------|---------------------|
| Variable bindings | ✅ | ✅ |
| Component property bindings | ✅ | ✅ |
| Direct properties | ❌ | ✅ |
| Effect styles | ❌ | ✅ |
| Fill/stroke styles | ❌ | ✅ |
| Direct fills/strokes | ❌ | ✅ |
| Text styles (recursive) | ❌ | ✅ |
| Filterable by binding type | ✅ | ❌ (but has includeTypes) |

**When to use copy_bindings:**
- You only need bindings, not properties or styles
- You want to filter specific binding types
- You want precise control over what's copied

**When to use copy_all_properties:**
- You want complete replication
- You need styles copied too
- You want a one-call solution for everything

---

## Real-World Use Cases

### 1. Design System Template Application
**Scenario:** Apply design system component template to new instances

```javascript
// Copy all properties from template to new component
await copy_all_properties({
  sourceNodeId: "design-system-button-template",
  targetNodeId: "new-button-component"
});
```

### 2. Bulk Variable Binding Updates
**Scenario:** Switch multiple components to use new variable collection

```javascript
// Copy variable bindings from updated component
for (const componentId of allButtons) {
  await copy_bindings({
    sourceNodeId: "updated-button-with-new-variables",
    targetNodeId: componentId,
    bindingTypes: ["variables"]
  });
}
```

### 3. Style Synchronization
**Scenario:** Ensure all card components have consistent shadow/text styles

```javascript
await copy_all_properties({
  sourceNodeId: "master-card-component",
  targetNodeId: "card-variant-1",
  includeTypes: ["direct"]  // Only copy styles and properties, not bindings
});
```

---

## Related Tools

- `get_node_details` - Inspect node properties before copying
- `get_screenshot` - Verify visual results after copying
- `bind_variable` - Manually bind individual variables
- `modify_node` - Alternative for simple property updates
- `set_instance_properties` - For component instance properties

---

## Summary

**copy_bindings:**
- ✅ Fast, focused binding replication
- ✅ Filter by binding type
- ✅ Lightweight (bindings only)

**copy_all_properties:**
- ✅ Complete replication (bindings + properties + styles)
- ✅ Text style copying (recursive)
- ✅ One-call comprehensive solution
- ✅ Production-ready for design system workflows

---

**Last Updated:** 2024-12-27
**Related:** [Common Patterns](./common-patterns.md), [Troubleshooting](./troubleshooting.md)
