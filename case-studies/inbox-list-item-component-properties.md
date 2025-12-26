# Case Study: InboxListItem Component with Exposed Instance Properties

**Date:** December 25, 2024
**Component:** InboxListItem
**Focus:** Component properties, text truncation, exposed nested instances, icon swapping via MCP tools

---

## Overview

This case study documents the complete implementation of an InboxListItem component for a mobile inbox screen, demonstrating advanced Figma component property features including:
- TEXT component properties for editable content
- Text truncation with maxLines
- Exposed nested instance properties
- Programmatic icon swapping via MCP tools
- Responsive auto-layout with fill/hug sizing

**Challenge:** Create a reusable inbox list item component where title, description, timestamp, and icon are all editable at the instance level, while maintaining proper text truncation and responsive sizing.

---

## Component Structure

### Final Hierarchy

```
InboxListItem (Component)
├── Icon Container (Instance - EXPOSED)
│   └── Icon (Instance - swappable via property)
├── Text Container (Frame)
│   ├── Title (Text - bound to property)
│   ├── Description (Text - bound to property)
│   └── Timestamp (Text - bound to property)
└── Chevron (Instance)
```

### Component Properties

**TEXT Properties:**
- `Title#187:59` - Main heading (1-line truncation)
- `Description#187:60` - Body text (2-line truncation)
- `Timestamp#187:61` - Time indicator

**Exposed Instance Properties:**
- `Icon Container` → `Instance#51:22` (INSTANCE_SWAP) - Swappable icon

---

## Implementation Journey

### Phase 1: Component Creation

**Goal:** Create base component with proper auto-layout structure

**Steps:**
1. Created component using `create_component` MCP tool
2. Added Icon Container, Text Container, and Chevron using `add_children`
3. Added three text nodes to Text Container
4. Set horizontal layout with 8px spacing

**Layout Configuration:**
- Direction: HORIZONTAL
- Item spacing: 8px
- Padding: 8px (all sides)
- Width: 330px (fixed)
- Height: 80px (fixed initially)

**MCP Tools Used:**
```json
{
  "method": "create_component",
  "arguments": {
    "name": "InboxListItem",
    "width": 330,
    "height": 80,
    "layoutMode": "HORIZONTAL"
  }
}
```

### Phase 2: Variable Bindings

**Goal:** Bind all design system variables for Light/Dark mode support

**Variables Bound:**

**Container:**
- Fills → `Fills/card-background`
- Strokes → `Strokes/card-border`
- Corner radius (all 4) → `Dimensions/Radius/card-radius`
- Padding (all 4) → `Spacing/spacing-2`
- Item spacing → `Spacing/spacing-2`

**Text Container:**
- Item spacing → `Spacing/spacing-6p` (6px gap)

**Text Nodes:**
- Title fill → `Text/text-primary`
- Description fill → `Text/text-secondary`
- Timestamp fill → `Text/text-secondary`

**Chevron:**
- Stroke → `Icons/Icon Color`

**Key Learning:** Always bind padding and spacing variables, not just visual properties. Check reference components to ensure completeness.

### Phase 3: Component Properties (TEXT)

**Goal:** Make text content editable on instances

**Challenge:** Three separate text nodes needed to be bound to component properties.

**Solution:**
1. Used `add_component_property` to create TEXT properties
2. Used `bind_text_to_property` to link text nodes to properties
3. Used `set_instance_properties` to populate instances with content

**Implementation:**
```json
// Step 1: Add property
{
  "method": "add_component_property",
  "arguments": {
    "componentId": "184:5648",
    "propertyName": "Title",
    "propertyType": "TEXT",
    "defaultValue": "Inbox Title"
  }
}
// Returns: { "propertyKey": "Title#187:59" }

// Step 2: Bind text node
{
  "method": "bind_text_to_property",
  "arguments": {
    "textNodeId": "184:5655",
    "propertyKey": "Title#187:59"
  }
}

// Step 3: Update instance
{
  "method": "set_instance_properties",
  "arguments": {
    "instanceId": "184:5659",
    "properties": {
      "Title#187:59": "New reward program launched"
    }
  }
}
```

**Result:** All instances now have unique, editable text content.

### Phase 4: Text Truncation

**Goal:** Truncate title at 1 line and description at 2 lines with ellipsis

**Challenge:** Text truncation requires specific configuration:
- `textAutoResize: "HEIGHT"` - Allow vertical growth
- `maxHeight` - Limit growth (not fixed `height`)
- `textTruncation: "ENDING"` - Show ellipsis
- `maxLines` - Line limit
- `layoutSizingHorizontal: "FILL"` - Fill container width

**Initial Mistake:**
```javascript
// ❌ Wrong: Used fixed height
textNode.height = 36;
textNode.textAutoResize = "NONE";
textNode.textTruncation = "ENDING";
textNode.maxLines = 2;
// Result: Text always takes up 36px even if only 1 line
```

**Correct Approach:**
```javascript
// ✅ Right: Use maxHeight with auto-resize
textNode.textAutoResize = "HEIGHT";
textNode.maxHeight = 36;  // 2 lines × 18px line-height
textNode.textTruncation = "ENDING";
textNode.maxLines = 2;
textNode.layoutSizingHorizontal = "FILL";
```

**MCP Tool Usage:**
```json
{
  "method": "modify_node",
  "arguments": {
    "nodeId": "184:5655",
    "properties": {
      "textAutoResize": "HEIGHT",
      "maxHeight": 22,
      "textTruncation": "ENDING",
      "maxLines": 1,
      "layoutSizingHorizontal": "FILL"
    }
  }
}
```

**Key Learning:** Use `maxHeight` instead of fixed `height` for responsive text that can shrink when content is short but truncates when long.

### Phase 5: Responsive Sizing

**Goal:** Make instances fill container width and hug content height

**Pattern:** In vertical auto-layout containers, children should:
- Width: FILL (stretch to container width)
- Height: HUG (wrap content)

**Implementation:**
```json
{
  "method": "modify_node",
  "arguments": {
    "nodeId": "184:5659",
    "properties": {
      "layoutSizingHorizontal": "FILL",
      "layoutSizingVertical": "HUG"
    }
  }
}
```

**Result:** Instances now properly fill container width and adapt to content height.

### Phase 6: Exposed Instance Properties (Icon Swapping)

**Goal:** Make the icon inside Icon Container swappable from the parent component

**Challenge:** The icon is nested two levels deep:
- InboxListItem (Component)
  - Icon Container (Instance)
    - Icon (Instance)

**Initial Approach - FAILED:**
Created INSTANCE_SWAP property on InboxListItem pointing to the nested icon.

**Problem:** This created a new property but didn't expose the existing Icon Container's icon swap.

**Correct Approach:**
1. Set `isExposedInstance = true` on Icon Container instance
2. Access exposed instance properties via `instance.exposedInstances`
3. Use exposed instance's node ID to set properties

**Implementation:**
```javascript
// Step 1: Expose Icon Container
{
  "method": "modify_node",
  "arguments": {
    "nodeId": "184:5649",  // Icon Container instance
    "properties": {
      "isExposedInstance": true
    }
  }
}

// Step 2: Discover exposed properties
{
  "method": "get_instance_properties",
  "arguments": {
    "instanceId": "184:5659"
  }
}
// Returns:
{
  "properties": [...],  // Regular properties
  "exposedInstances": [
    {
      "id": "I184:5659;184:5649",
      "name": "Icon Container",
      "properties": [
        {
          "key": "Instance#51:22",
          "value": {
            "type": "INSTANCE_SWAP",
            "value": "40:394"
          }
        }
      ]
    }
  ]
}

// Step 3: Swap icon using exposed instance ID
{
  "method": "set_instance_properties",
  "arguments": {
    "instanceId": "I184:5659;184:5649",  // Exposed instance ID
    "properties": {
      "Instance#51:22": "163:5584"  // mail-open icon
    }
  }
}
```

**Key Discovery:** Exposed instances maintain their own node IDs (prefixed with parent ID) and their property keys remain unchanged. Access them through `exposedInstances` array.

---

## New MCP Tools Created

To support this workflow, we created three new MCP tools:

### 1. `get_component_properties`

**Purpose:** Get all component property definitions

**Schema:**
```json
{
  "name": "get_component_properties",
  "inputSchema": {
    "type": "object",
    "properties": {
      "componentId": { "type": "string" }
    }
  }
}
```

**Usage:**
```bash
curl -X POST http://localhost:3000/mcp \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "get_component_properties",
      "arguments": { "componentId": "184:5648" }
    }
  }'
```

**Response:**
```json
{
  "componentId": "184:5648",
  "componentName": "InboxListItem",
  "properties": [
    {
      "key": "Title#187:59",
      "name": "Title#187:59",
      "type": "TEXT",
      "defaultValue": "Inbox Title"
    }
  ]
}
```

### 2. `get_instance_properties`

**Purpose:** Get all properties on an instance, including exposed nested instances

**Key Feature:** Returns `exposedInstances` array with nested instance properties

**Schema:**
```json
{
  "name": "get_instance_properties",
  "inputSchema": {
    "type": "object",
    "properties": {
      "instanceId": { "type": "string" }
    }
  }
}
```

**Response:**
```json
{
  "instanceId": "184:5659",
  "properties": [
    { "key": "Title#187:59", "value": { "type": "TEXT", "value": "..." } }
  ],
  "exposedInstances": [
    {
      "id": "I184:5659;184:5649",
      "name": "Icon Container",
      "properties": [
        {
          "key": "Instance#51:22",
          "value": { "type": "INSTANCE_SWAP", "value": "40:394" }
        }
      ]
    }
  ]
}
```

### 3. `swap_component`

**Purpose:** Swap a nested component instance inside a parent

**Note:** This tool was created but ultimately not used. We used `set_instance_properties` on exposed instances instead.

**Schema:**
```json
{
  "name": "swap_component",
  "inputSchema": {
    "type": "object",
    "properties": {
      "instanceId": { "type": "string" },
      "childPath": { "type": "array", "items": { "type": "string" } },
      "newComponentId": { "type": "string" }
    }
  }
}
```

### Phase 7: Component Variants (Read/Unread States)

**Goal:** Create component variants for Read and Unread states following React Native implementation

**Challenge:** Create variants without breaking existing instances, while applying different visual states to each variant.

#### Research Phase

**Figma Plugin API Research:**

Researched official Figma documentation to understand variant creation:
- [`combineAsVariants()`](https://developers.figma.com/docs/plugins/api/properties/figma-combineasvariants/) - Combines components into ComponentSet
- Variant naming pattern: `PropertyName=Value` (e.g., "State=Unread")
- Variant options automatically derived from component names
- No `figma.createComponentSet()` - empty component sets not supported

**React Native Implementation Analysis:**

Analyzed `/Users/kasa/Downloads/Projects/alloy-standalone/src/components/MessageListItem.tsx` to identify exact visual differences:

| Property | Unread State | Read State |
|----------|--------------|------------|
| Icon | Mail (closed) | MailOpen (open) |
| Icon container opacity | 1.0 | 0.5 |
| Title font weight | 600 (Semibold) | 400 (Regular) |
| Title color | textPrimary | textSecondary |

#### Tool Creation: create_component_variants

**Initial Implementation:**

Created comprehensive tool to automate variant creation:

**Features:**
- Accepts array of variant specifications with modifications
- Supports node modifications (opacity, component swaps)
- Supports text modifications (font changes, color bindings)
- Automatically loads required fonts
- Combines components using `figma.combineAsVariants()`

**Tool Usage:**
```json
{
  "name": "create_component_variants",
  "arguments": {
    "componentId": "184:5648",
    "variants": [
      {
        "name": "State=Unread"
      },
      {
        "name": "State=Read",
        "modifications": {
          "nodes": [
            {
              "path": ["Icon Container"],
              "opacity": 0.5,
              "swapComponentId": "163:5584"
            }
          ],
          "textNodes": [
            {
              "path": ["Text Container", "Title"],
              "fontName": {
                "family": "DM Sans",
                "style": "Regular"
              },
              "fillVariableName": "Text/text-secondary"
            }
          ]
        }
      }
    ]
  }
}
```

#### Bug 1: Broken Existing Instances

**Problem:** After creating variants, all 5 existing instances lost connection to the component.

**Root Cause:**
```javascript
// Initial buggy implementation
for (let i = 0; i < variantSpecs.length; i++) {
  const variantComponent = originalComponent.clone(); // ❌ Cloned for ALL variants
  variantComponent.name = spec.name;
  variantComponents.push(variantComponent);
}

// Then removed original
originalComponent.remove(); // ❌ Broke all existing instances!
```

**Why instances broke:**
- Cloned original twice (for both variants)
- Deleted original component
- Existing instances pointed to deleted component → orphaned

**Solution:**
```javascript
// Fixed implementation
for (let i = 0; i < variantSpecs.length; i++) {
  // Use original for FIRST variant, clone for subsequent
  const variantComponent = i === 0 ? originalComponent : originalComponent.clone();
  variantComponent.name = spec.name;
  variantComponents.push(variantComponent);
}

// No deletion needed - original is now part of variant set
```

**Result:**
- First variant uses original component (ID preserved: 184:5648)
- Existing instances automatically become instances of first variant
- Only second variant is a new clone

#### Bug 2: Incorrect ComponentSet Name

**Problem:** ComponentSet named "State=Unread" instead of "InboxListItem"

**Root Cause:**
```javascript
// Buggy code - stored name AFTER renaming
for (let i = 0; i < variantSpecs.length; i++) {
  variantComponent.name = spec.name; // Renames original to "State=Unread"
}

// Then tried to use original name (but it's already changed!)
const originalName = originalComponent.name; // ❌ Returns "State=Unread"
variantSet.name = originalName; // ❌ Wrong name!
```

**Solution:**
```javascript
// Store original name BEFORE the loop
const originalName = originalComponent.name; // ✅ "InboxListItem"
const originalX = originalComponent.x;
const originalY = originalComponent.y;

// Then rename in loop
for (let i = 0; i < variantSpecs.length; i++) {
  variantComponent.name = spec.name;
}

// Use stored original name
variantSet.name = originalName; // ✅ Correct!
```

#### Tool Creation: rename_node

**Need:** Fix the incorrectly named ComponentSet without recreating everything.

**Created simple utility tool:**
```javascript
async function renameNode(api, args, sendProgress) {
  const { nodeId, name } = args;

  const result = await api.executeInFigma(`
    const node = figma.getNodeById("${nodeId}");
    node.name = "${name}";
    return { oldName: node.name, newName: node.name };
  `);

  return result.result;
}
```

**Usage:**
```json
{
  "name": "rename_node",
  "arguments": {
    "nodeId": "192:6111",
    "name": "InboxListItem"
  }
}
```

**Result:** ComponentSet renamed from "State=Unread" to "InboxListItem"

#### Final Variant Structure

**ComponentSet:**
- ID: `192:6111`
- Name: `InboxListItem`
- Type: `COMPONENT_SET`

**Variants:**
1. **State=Unread**
   - ID: `184:5648` (original component - preserves instances)
   - Icon: Mail (camera icon in current implementation)
   - Icon opacity: 1.0
   - Title font: DM Sans Semibold
   - Title color: Text/text-primary

2. **State=Read**
   - ID: `192:6100` (new clone)
   - Icon: MailOpen (open envelope)
   - Icon opacity: 0.5
   - Title font: DM Sans Regular
   - Title color: Text/text-secondary

#### Verification

**Checked existing instances:**
- All 5 instances remain connected
- All are instances of "State=Unread" variant by default
- Can switch to "State=Read" using State property
- No broken connections or detached instances

**MCP Tools Created:**
1. `create_component_variants` - Comprehensive variant creation with modifications
2. `rename_node` - Simple node renaming utility

**Total MCP Tools:** Now 18 (was 16)

---

## Final Component Specifications

### Layout Properties

**InboxListItem Component:**
- Layout mode: HORIZONTAL
- Item spacing: 8px → `Spacing/spacing-2`
- Padding: 8px all sides → `Spacing/spacing-2`
- Corner radius: 16px → `Dimensions/Radius/card-radius`
- Fill: `Fills/card-background`
- Stroke: 1px → `Strokes/card-border`

**Text Container:**
- Layout mode: VERTICAL
- Item spacing: 6px → `Spacing/spacing-6p`
- Layout grow: 1 (fills available width)

**Text Sizing:**
- Title: maxHeight 22px, 1 line, FILL width, HUG height
- Description: maxHeight 36px, 2 lines, FILL width, HUG height
- Timestamp: HUG both axes

**Instance Sizing:**
- Horizontal: FILL (stretch to container)
- Vertical: HUG (wrap content)

### Variable Bindings Summary

| Property | Variable |
|----------|----------|
| Container fills | `Fills/card-background` |
| Container strokes | `Strokes/card-border` |
| Container padding (4 sides) | `Spacing/spacing-2` |
| Container radius (4 corners) | `Dimensions/Radius/card-radius` |
| Container item spacing | `Spacing/spacing-2` |
| Text container spacing | `Spacing/spacing-6p` |
| Title fill | `Text/text-primary` |
| Description fill | `Text/text-secondary` |
| Timestamp fill | `Text/text-secondary` |
| Chevron stroke | `Icons/Icon Color` |

### Instance Data

| Instance | Title | Description | Icon |
|----------|-------|-------------|------|
| 1 | New reward program launched | You can now earn points on every transaction... | mail-open |
| 2 | Your card expires soon | Renew your card before it expires on December 31st... | mail |
| 3 | Payment received | We received your payment of $1,234.56... | mail-open |
| 4 | New security features available | Enable two-factor authentication and biometric... | mail |
| 5 | Monthly statement ready | Your November statement is now available... | mail-open |

---

## Best Practices Discovered

### 1. Text Truncation Pattern

**Always use maxHeight, not fixed height:**
```javascript
// ✅ Good: Responsive
{
  textAutoResize: "HEIGHT",
  maxHeight: 36,
  textTruncation: "ENDING",
  maxLines: 2,
  layoutSizingHorizontal: "FILL"
}

// ❌ Bad: Takes up space even when empty
{
  height: 36,
  textAutoResize: "NONE",
  textTruncation: "ENDING",
  maxLines: 2
}
```

### 2. Vertical Container Children Sizing

**Pattern:** For vertical auto-layout containers:
```javascript
childInstance.layoutSizingHorizontal = "FILL";  // Stretch width
childInstance.layoutSizingVertical = "HUG";     // Wrap height
```

### 3. Exposed Instance Properties

**Access pattern:**
1. Set `isExposedInstance = true` on nested instance
2. Use `get_instance_properties` to discover exposed instance ID
3. Use exposed instance's node ID (e.g., `I184:5659;184:5649`) with `set_instance_properties`
4. Property keys remain unchanged from the nested component

**Don't:** Try to create duplicate INSTANCE_SWAP properties on parent - use exposed instances instead.

### 4. Component Property Workflow

**Correct order:**
1. `add_component_property` → Returns property key with unique ID
2. `bind_text_to_property` → Links text node to property
3. `set_instance_properties` → Updates values on instances

**Always use the returned property key** (e.g., `Title#187:59`) for subsequent operations.

### 5. Variable Binding Checklist

For any card/container component, verify all are bound:
- [ ] Fill
- [ ] Stroke
- [ ] Corner radius (all 4 corners)
- [ ] **Padding (all 4 sides)** ← Often forgotten!
- [ ] Item spacing (if auto-layout)
- [ ] Text colors

### 6. Component Variant Creation Pattern

**Critical: Preserve existing instances when creating variants**

```javascript
// ✅ Good: Use original component as first variant
for (let i = 0; i < variants.length; i++) {
  const variant = i === 0 ? original : original.clone();
  variant.name = variantNames[i];
}

// ❌ Bad: Clone everything and delete original
for (let i = 0; i < variants.length; i++) {
  const variant = original.clone();
  variant.name = variantNames[i];
}
original.remove(); // Breaks all existing instances!
```

**Always store metadata BEFORE modifying:**
```javascript
// ✅ Store BEFORE renaming
const originalName = component.name;
component.name = "State=Unread"; // Modify after storing

// ❌ Store AFTER renaming
component.name = "State=Unread";
const originalName = component.name; // Gets wrong name!
```

---

## Challenges & Solutions

### Challenge 1: Text Not Filling Width

**Problem:** Text truncated but didn't stretch to full container width.

**Cause:** Missing `layoutSizingHorizontal = "FILL"`

**Solution:** Added modern Figma sizing properties:
```javascript
{
  layoutSizingHorizontal: "FILL",
  layoutSizingVertical: "HUG",
  textAutoResize: "HEIGHT",
  maxHeight: 36
}
```

### Challenge 2: Instances Not Filling Container Width

**Problem:** With fewer items, instances didn't fill vertical container width.

**Cause:** Default instance sizing is HUG/HUG.

**Solution:** Set all instances to FILL horizontal, HUG vertical:
```javascript
for (const instanceId of instanceIds) {
  modify_node({
    nodeId: instanceId,
    properties: {
      layoutSizingHorizontal: "FILL",
      layoutSizingVertical: "HUG"
    }
  });
}
```

### Challenge 3: Icon Swap Property Not Accessible

**Problem:** Created INSTANCE_SWAP property on parent, but it didn't expose the nested Icon Container's icon.

**Cause:** Misunderstanding of how exposed instances work.

**Solution:**
1. Set `isExposedInstance = true` on Icon Container
2. Discovered exposed instances via `get_instance_properties`
3. Used exposed instance's node ID to access its properties

**Key Insight:** Figma shows exposed instances as collapsible sections in the UI, and they maintain their own node IDs in the API.

### Challenge 4: Finding Property Keys

**Problem:** Needed to know exact property key for Icon Container's icon swap.

**Cause:** Property keys include unique IDs (e.g., `Instance#51:22`).

**Solution:** Created `get_component_properties` and `get_instance_properties` tools to programmatically discover property keys.

---

## MCP Tools Architecture

### Tool Flow Diagram

```
Component Creation Flow:
create_component → add_children → bind_variable → add_component_property → bind_text_to_property

Instance Manipulation Flow:
get_instance_properties → (discover exposed instances) → set_instance_properties

Property Discovery Flow:
get_component_properties → (for component-level)
get_instance_properties → (for instance-level + exposed)

Variant Creation Flow:
create_component_variants → (auto font loading + modifications) → rename_node (if needed)
```

### File Changes

**New Tools Added:**

`/progressive-disclosure-api/mcp-server/tools/write-tools.js`:
- `getComponentProperties()` - Lines 755-787
- `getInstanceProperties()` - Lines 789-832
- `swapComponent()` - Lines 703-753
- `createComponentVariants()` - Lines 838-973
- `renameNode()` - Lines 975-1004

`/progressive-disclosure-api/mcp-server/tools/schemas.js`:
- `getComponentProperties` schema - Lines 552-565
- `getInstanceProperties` schema - Lines 567-580
- `swapComponent` schema - Lines 528-550
- `createComponentVariants` schema - Lines 528-611
- `renameNode` schema - Lines 613-630

**Tools Exported:**
- Total MCP tools: 18 (was 13)
- New READ tools: 2 (`get_component_properties`, `get_instance_properties`)
- New WRITE tools: 3 (`swap_component`, `create_component_variants`, `rename_node`)

---

## Performance & Workflow

### Iteration Speed

**Tool restart required:** Server restart needed when adding new tools (2-3 seconds)

**Typical operation times:**
- `add_component_property`: ~40ms
- `bind_text_to_property`: ~30ms
- `set_instance_properties`: ~35ms
- `get_instance_properties`: ~45ms
- `modify_node`: ~30ms

**Parallel execution:** Successfully ran 5 icon swaps in parallel (4 curl commands simultaneously)

### Development Pattern

**Iterative approach worked well:**
1. Create component structure
2. Bind variables
3. Add component properties
4. Configure text truncation
5. Fix sizing issues
6. Expose nested instances
7. Discover property keys
8. Swap icons

**Anti-pattern:** Trying to do everything in one step. Each phase builds on the previous.

---

## Results

### Functionality Achieved

✅ **Editable content:** Title, description, timestamp all editable per instance
✅ **Text truncation:** Title 1-line, description 2-line with ellipsis
✅ **Responsive sizing:** Fills container width, hugs content height
✅ **Theme support:** Full Light/Dark mode via variable bindings
✅ **Icon swapping:** Icons changeable via exposed instance properties
✅ **Reusable component:** All 5 instances use same base component

### Design System Integration

**Variables bound:** 11 total
- 5 container properties (fill, stroke, radius×4, padding×4, spacing)
- 3 text colors
- 2 spacing values
- 1 chevron stroke

**Component properties:** 4 total
- 3 TEXT properties (Title, Description, Timestamp)
- 1 INSTANCE_SWAP (via exposed Icon Container)

**Text styles applied:** 2 total
- Body/Medium (16px) for title
- Caption/Regular (13px) for description and timestamp

### Component Metrics

- **Total nodes:** 8 (1 component + 3 child containers + 3 text nodes + 1 chevron)
- **Total instances:** 5
- **Total properties:** 4 (3 TEXT + 1 exposed INSTANCE_SWAP)
- **Total variable bindings:** 11
- **Complexity:** Medium-high (nested instances with exposed properties)

---

## Lessons Learned

### 1. Modern Figma Sizing Properties

Figma's modern sizing properties (`layoutSizingHorizontal/Vertical`) are more powerful than legacy `resize()` methods:
- FILL: Stretch to fill container
- HUG: Wrap content
- FIXED: Fixed size

**Use case:** Essential for responsive components.

### 2. Text Truncation Requires Multiple Properties

Text truncation isn't a single setting. Required configuration:
1. `textAutoResize: "HEIGHT"` - Allow vertical growth
2. `maxHeight` - Set limit
3. `textTruncation: "ENDING"` - Enable ellipsis
4. `maxLines` - Set line limit
5. `layoutSizingHorizontal: "FILL"` - Fill width

**Miss any one**, and truncation won't work correctly.

### 3. Exposed Instances Are Powerful

Exposing nested instances allows deep property customization without flattening component hierarchy.

**Benefits:**
- Preserve component structure
- Expose only what's needed
- Properties maintain their keys
- Works with INSTANCE_SWAP, TEXT, BOOLEAN

**Access pattern:** Use `exposedInstances` array, not `componentProperties`.

### 4. Tool Discovery Is Critical

When working with component properties, you need tools to:
1. Discover what properties exist (`get_component_properties`)
2. See what values instances have (`get_instance_properties`)
3. Find exposed instances and their property keys

**Without these tools**, you'd need to manually check Figma UI or guess property keys.

### 5. MCP Tools Enable Complex Workflows

The MCP server architecture makes it possible to:
- Chain multiple operations
- Discover component structure programmatically
- Update multiple instances in parallel
- Build reusable component libraries

**Key advantage:** Scriptable, repeatable, automatable component creation.

### 6. Component Variants Require Careful Instance Management

When creating component variants from existing components:

**Critical Rules:**
1. **Never delete the original component** - Use it as the first variant
2. **Store metadata before modifications** - Names, positions change during process
3. **Preserve component IDs** - Existing instances depend on them
4. **Test with existing instances** - Verify no broken connections

**Pattern:**
```javascript
// First variant = original (preserves instances)
// Additional variants = clones (new instances)
const variants = specs.map((spec, i) =>
  i === 0 ? original : original.clone()
);
```

**Why this matters:** Breaking instance connections means users lose all their customizations and overrides.

### 7. Tool Development is Iterative

Building MCP tools taught us:
- Start with basic functionality, iterate on edge cases
- Bugs in production reveal real-world usage patterns
- User feedback identifies missing features quickly
- Documentation catches mistakes before users do

**Example:** `create_component_variants` had two bugs found immediately after first use, both fixed within minutes because the tool structure made debugging easy.

---

## Future Enhancements

### Potential Improvements

1. **Batch property updates:**
   - Create tool to update multiple instances at once
   - Accept array of instance IDs and properties

2. ~~**Component variant support:**~~ ✅ **COMPLETED**
   - ✅ Created `create_component_variants` tool
   - ✅ Supports variant modifications and property manipulation
   - ✅ Preserves existing instances

3. **Text style binding:**
   - Create tool to bind text nodes to text styles
   - Currently done manually

4. **Auto-expose nested instances:**
   - Create tool to automatically expose all nested instances
   - Save manual exposure steps

5. **Property validation:**
   - Validate property keys before setting
   - Return helpful error messages for invalid keys

### Reusable Patterns

This workflow pattern can be applied to:
- Transaction list items (with different icons)
- Settings list items (with toggle/switch exposed)
- Notification items (with action buttons exposed)
- Card components (with image/icon variants)

**Generic pattern:**
1. Create base component with nested instances
2. Add component properties for editable content
3. Expose nested instances for deep customization
4. Bind all design variables for theming
5. Use MCP tools to populate instances

---

## Code Snippets

### Complete Instance Creation & Population

```javascript
// 1. Create instances
const instances = [];
for (let i = 1; i <= 5; i++) {
  const instance = await api.executeInFigma(`
    const component = figma.getNodeById("184:5648");
    const instance = component.createInstance();
    instance.name = "Inbox Item " + ${i};
    instance.layoutSizingHorizontal = "FILL";
    instance.layoutSizingVertical = "HUG";
    figma.currentPage.appendChild(instance);
    return { id: instance.id };
  `);
  instances.push(instance.result.id);
}

// 2. Populate with data
const messages = [
  {
    title: "New reward program launched",
    desc: "You can now earn points on every transaction...",
    icon: "163:5584", // mail-open
    time: "2h ago"
  },
  // ... more messages
];

for (let i = 0; i < instances.length; i++) {
  const msg = messages[i];

  // Set text properties
  await setInstanceProperties({
    instanceId: instances[i],
    properties: {
      "Title#187:59": msg.title,
      "Description#187:60": msg.desc,
      "Timestamp#187:61": msg.time
    }
  });

  // Set icon via exposed instance
  const exposedIconId = `I${instances[i]};184:5649`;
  await setInstanceProperties({
    instanceId: exposedIconId,
    properties: {
      "Instance#51:22": msg.icon
    }
  });
}
```

### Property Discovery Helper

```javascript
async function discoverInstanceProperties(instanceId) {
  const props = await getInstanceProperties({ instanceId });

  console.log('Regular properties:');
  props.properties.forEach(p => {
    console.log(`  ${p.key}: ${JSON.stringify(p.value)}`);
  });

  console.log('\nExposed instances:');
  props.exposedInstances.forEach(exp => {
    console.log(`  ${exp.name} (${exp.id}):`);
    exp.properties.forEach(p => {
      console.log(`    ${p.key}: ${JSON.stringify(p.value)}`);
    });
  });
}
```

---

## Conclusion

This case study demonstrates a complete workflow for creating advanced Figma components with:
- Multiple component properties (TEXT, INSTANCE_SWAP)
- Text truncation with ellipsis
- Exposed nested instances
- Component variants with state-based styling
- Programmatic manipulation via MCP tools

**Key Takeaways:**
1. Modern Figma sizing properties (FILL/HUG) are essential for responsive components
2. Text truncation requires coordinated configuration of multiple properties
3. Exposed instances provide deep customization without flattening hierarchy
4. Discovery tools are critical for working with component properties programmatically
5. MCP tools enable complex, repeatable workflows
6. **Preserving instance connections is critical when creating variants**
7. **Store metadata before modifications to avoid data loss**

**Impact:**
- Created 5 new MCP tools (3 for properties, 2 for variants)
- Documented patterns for text truncation, responsive sizing, and variant creation
- Established workflow for exposed instance properties
- Built production-ready, theme-aware, editable component with variants
- Discovered and fixed critical bugs in variant creation workflow

**Time Investment:** ~3 hours total
**Lines of Code:** ~280 (new MCP tools)
**Components Created:** 1 ComponentSet with 2 variants (5 instances preserved)
**New Tools:** 5 (`get_component_properties`, `get_instance_properties`, `swap_component`, `create_component_variants`, `rename_node`)
**Bugs Found & Fixed:** 2 (instance preservation, ComponentSet naming)
**Documentation:** This comprehensive case study

---

## References

**Component Properties & Instances:**
- [Figma Component Properties API](https://www.figma.com/plugin-docs/api/ComponentNode/)
- [Exposed Instances Forum Discussion](https://forum.figma.com/t/expose-properties-from-nested-instances-using-plugin-api/95262)
- [Text Truncation API](https://www.figma.com/plugin-docs/api/properties/TextNode-texttruncation/)
- [Instance Node API](https://www.figma.com/plugin-docs/api/InstanceNode/)

**Component Variants:**
- [combineAsVariants() API](https://developers.figma.com/docs/plugins/api/properties/figma-combineasvariants/)
- [ComponentSetNode Documentation](https://www.figma.com/plugin-docs/api/ComponentSetNode/)
- [variantProperties API](https://www.figma.com/plugin-docs/api/properties/nodes-variantproperties/)
- [Create and Use Variants Guide](https://help.figma.com/hc/en-us/articles/360056440594-Create-and-use-variants)

**Project Resources:**
- [BEST-PRACTICES.md](../BEST-PRACTICES.md) - Icon Container pattern
- [React Native MessageListItem](../../alloy-standalone/src/components/MessageListItem.tsx) - Reference implementation

---

**Next Steps:**
- Apply variant pattern to other list item components (Transactions, Settings)
- Create batch instance update tool for populating multiple instances
- Build component library with variants and exposed properties
- Document variant naming conventions and state patterns
- Create helper tool for automatic variant generation from React Native components
