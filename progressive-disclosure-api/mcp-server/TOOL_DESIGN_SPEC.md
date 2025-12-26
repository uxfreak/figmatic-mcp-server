# MCP Tool Enhancement & New Tools Design Specification

## Overview
This document specifies enhancements to existing tools and new tools needed for complete component property and variable binding support.

---

## Part 1: Enhanced Existing Tools (Add `bindings` Parameter)

### 1. `create_component` (Enhanced)
**Purpose:** Create component with automatic variable bindings

**New Parameters:**
```javascript
{
  name: string,
  width: number,
  height: number,
  layoutMode: "NONE" | "HORIZONTAL" | "VERTICAL",
  fills: array,
  cornerRadius: number,
  bindings?: {  // NEW OPTIONAL PARAMETER
    fills?: string,              // Variable name: "Fills/card-background"
    paddingLeft?: string,        // Variable name: "Spacing/spacing-2"
    paddingRight?: string,
    paddingTop?: string,
    paddingBottom?: string,
    topLeftRadius?: string,      // Variable name: "Dimensions/Radius/card-radius"
    topRightRadius?: string,
    bottomLeftRadius?: string,
    bottomRightRadius?: string,
    itemSpacing?: string,
    strokes?: string             // Variable name: "Strokes/card-border"
  }
}
```

**Implementation Pattern:**
```javascript
1. Create component
2. If bindings provided:
   - Get all variables by name
   - Use setBoundVariable() or setBoundVariableForPaint()
   - Bind each specified property
3. Return component with all bindings applied
```

---

### 2. `create_auto_layout` (Enhanced)
Same pattern as create_component - add optional `bindings` parameter

---

### 3. `create_text_node` (Enhanced)
Add bindings for text properties:
```javascript
{
  characters: string,
  fontFamily: string,
  fontSize: number,
  bindings?: {
    fills?: string,              // "Text/text-primary"
    fontSize?: string,
    // ... other text properties
  }
}
```

---

## Part 2: New Tools for Component Properties

### 4. `add_component_property` (NEW)
**Purpose:** Add TEXT/BOOLEAN/INSTANCE_SWAP property to component

**Parameters:**
```javascript
{
  componentId: string,           // Component node ID
  propertyName: string,          // "Title", "Description", etc.
  propertyType: "TEXT" | "BOOLEAN" | "INSTANCE_SWAP",
  defaultValue: string | boolean | string  // Default value
}
```

**Returns:**
```javascript
{
  propertyKey: string,           // "Title#4:3" (with unique ID suffix)
  success: true
}
```

**Implementation:**
```javascript
const component = figma.getNodeById(componentId);
const propertyKey = component.addComponentProperty(
  propertyName,
  propertyType,
  defaultValue
);
return { propertyKey, success: true };
```

---

### 5. `bind_text_to_property` (NEW)
**Purpose:** Link text node characters to component property

**Parameters:**
```javascript
{
  textNodeId: string,            // Text node ID
  propertyKey: string            // "Title#4:3" (from add_component_property)
}
```

**Implementation:**
```javascript
const textNode = figma.getNodeById(textNodeId);
textNode.componentPropertyReferences = {
  characters: propertyKey
};
```

---

### 6. `set_text_truncation` (NEW)
**Purpose:** Configure text truncation with ellipsis and max lines

**Parameters:**
```javascript
{
  textNodeId: string,
  truncation: "ENDING" | "DISABLED",  // ENDING = ellipsis
  maxLines?: number,                  // e.g., 2 for 2-line limit
  autoResize?: "NONE" | "HEIGHT" | "WIDTH_AND_HEIGHT"
}
```

**Implementation:**
```javascript
const textNode = figma.getNodeById(textNodeId);
textNode.textTruncation = truncation;
if (maxLines) {
  textNode.maxLines = maxLines;
}
if (autoResize) {
  textNode.textAutoResize = autoResize;
}
```

---

### 7. `set_instance_properties` (NEW)
**Purpose:** Update component property values on instances

**Parameters:**
```javascript
{
  instanceId: string,
  properties: {
    "Title#4:3": "Inbox Message Title",
    "Description#4:4": "Message description...",
    "Timestamp#4:5": "2h ago"
  }
}
```

**Implementation:**
```javascript
const instance = figma.getNodeById(instanceId);
instance.setProperties(properties);
```

---

## Part 3: Workflow for InboxListItem

### Step 1: Add Component Properties
```javascript
// Add 3 TEXT properties to InboxListItem component
add_component_property({
  componentId: "184:5648",
  propertyName: "Title",
  propertyType: "TEXT",
  defaultValue: "Inbox Title"
})
// Returns: { propertyKey: "Title#xxx" }

add_component_property({
  componentId: "184:5648",
  propertyName: "Description",
  propertyType: "TEXT",
  defaultValue: "Description text"
})
// Returns: { propertyKey: "Description#yyy" }

add_component_property({
  componentId: "184:5648",
  propertyName: "Timestamp",
  propertyType: "TEXT",
  defaultValue: "1h ago"
})
// Returns: { propertyKey: "Timestamp#zzz" }
```

### Step 2: Bind Text Nodes to Properties
```javascript
bind_text_to_property({
  textNodeId: "184:5655",  // Title text node
  propertyKey: "Title#xxx"
})

bind_text_to_property({
  textNodeId: "184:5656",  // Description text node
  propertyKey: "Description#yyy"
})

bind_text_to_property({
  textNodeId: "184:5657",  // Timestamp text node
  propertyKey: "Timestamp#zzz"
})
```

### Step 3: Set Text Truncation
```javascript
// Title: truncate at 2 lines with ellipsis
set_text_truncation({
  textNodeId: "184:5655",
  truncation: "ENDING",
  maxLines: 2,
  autoResize: "NONE"
})

// Description: truncate at 3 lines
set_text_truncation({
  textNodeId: "184:5656",
  truncation: "ENDING",
  maxLines: 3,
  autoResize: "NONE"
})
```

### Step 4: Update Instance Properties
```javascript
// Instance 1
set_instance_properties({
  instanceId: "184:5659",
  properties: {
    "Title#xxx": "New reward program launched",
    "Description#yyy": "You can now earn points on every transaction...",
    "Timestamp#zzz": "2h ago"
  }
})

// Instance 2
set_instance_properties({
  instanceId: "184:5669",
  properties: {
    "Title#xxx": "Your card expires soon",
    "Description#yyy": "Renew your card before it expires on Dec 31...",
    "Timestamp#zzz": "5h ago"
  }
})

// ... repeat for other instances
```

---

## Part 4: Implementation Priority

### Phase 1: New Component Property Tools (High Priority)
1. ✅ `add_component_property`
2. ✅ `bind_text_to_property`
3. ✅ `set_text_truncation`
4. ✅ `set_instance_properties`

### Phase 2: Enhance Existing Creation Tools (Medium Priority)
1. Update `create_component` with `bindings` parameter
2. Update `create_auto_layout` with `bindings` parameter
3. Update `create_text_node` with `bindings` parameter

### Phase 3: Test on Real Component (High Priority)
1. Apply all steps to InboxListItem component
2. Verify truncation works correctly
3. Verify instances update properly
4. Screenshot results

---

## API References

- [ComponentNode.addComponentProperty](https://www.figma.com/plugin-docs/api/ComponentNode/)
- [TextNode.componentPropertyReferences](https://forum.figma.com/t/plugin-api-link-textnode-characters-to-component-property/61457)
- [TextNode.textTruncation](https://www.figma.com/plugin-docs/api/properties/TextNode-texttruncation/)
- [TextNode.maxLines](https://www.figma.com/plugin-docs/api/properties/TextNode-maxlines/)
- [InstanceNode.setProperties](https://www.figma.com/plugin-docs/api/InstanceNode/)
- [setBoundVariable](https://www.figma.com/plugin-docs/api/properties/nodes-setboundvariable/)
- [Working with Variables](https://www.figma.com/plugin-docs/working-with-variables/)

---

## Notes

- Component property names get suffixed with unique IDs (e.g., "Title#4:3")
- Always use the returned property key when binding or setting properties
- Text truncation requires `textAutoResize = "NONE"` to work
- maxLines only works when textTruncation = "ENDING"
- Variable bindings must match property data types
