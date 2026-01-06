# Common Patterns - Design System Components

Real-world design system patterns using nested instances and component properties.

---

## Pattern 1: Icon Swap in Button (PROPER PATTERN) ⭐

**Structure:**
```
Button (Parent Component)
└── IconSlot (Nested Instance with INSTANCE_SWAP binding)
```

**Use Case:** Button component with swappable icons (Mail, Settings, User, etc.)

**Proper Implementation:**

1. Create icon components (Mail, Settings, User, etc.)
2. Create Button component with icon instance
3. Add INSTANCE_SWAP property to Button:
   ```javascript
   button.addComponentProperty("Icon", "INSTANCE_SWAP", defaultIcon.id)
   ```
4. Bind icon instance to property:
   ```javascript
   iconInstance.componentPropertyReferences = { mainComponent: swapProp }
   ```
5. Expose icon instance:
   ```javascript
   iconInstance.isExposedInstance = true
   ```
6. Instances of Button can now swap icons via properties panel

**Why Proper Pattern Matters:**
- ✅ Swap control in properties panel
- ✅ Can set preferred values (curated icon list)
- ✅ Maintainable design system
- ✅ Production-ready
- ❌ Without binding: Works but bypasses design system

**Full Recipe:** See [Instance Swap with Proper Binding](./instance-swap-with-proper-binding.md)

---

## Pattern 2: Text Override in Card

**Structure:**
```
Card (Parent Component)
└── TextContainer (Nested Instance)
    ├── Title (TEXT Property bound)
    └── Description (TEXT Property bound)
```

**Use Case:** Card component with customizable title and description text

**Implementation Steps:**

1. **Create TextContainer component:**
   ```javascript
   const comp = figma.createComponent();
   comp.name = "TextContainer";

   // Add title text node
   const title = figma.createText();
   const titleProp = comp.addComponentProperty("Title", "TEXT", "Default Title");
   title.componentPropertyReferences = { characters: titleProp };

   // Add description text node
   const desc = figma.createText();
   const descProp = comp.addComponentProperty("Description", "TEXT", "Default Description");
   desc.componentPropertyReferences = { characters: descProp };
   ```

2. **Create Card with TextContainer instance:**
   ```javascript
   const card = figma.createComponent();
   const textInstance = textContainerComp.createInstance();
   card.appendChild(textInstance);
   ```

3. **Expose TextContainer:**
   ```javascript
   textInstance.isExposedInstance = true;
   ```

4. **Usage:** Instances of Card can override both title and description:
   ```json
   {
     "instanceId": "I{cardInstanceId};{textContainerId}",
     "properties": {
       "Title#xxx:x": "Custom Card Title",
       "Description#xxx:x": "Custom card description text"
     }
   }
   ```

---

## Pattern 3: Multi-Level Nesting

**Structure:**
```
Dashboard (Parent)
└── WidgetContainer (Nested Level 1)
    └── Icon (Nested Level 2)
        └── IconGraphic (Nested Level 3)
```

**Use Case:** Complex component hierarchies with deep nesting

**Expose Deep Nested Instance:**

```json
{
  "name": "expose_nested_instance_by_path",
  "arguments": {
    "parentInstanceId": "dashboard-id",
    "childPath": ["WidgetContainer", "Icon"],
    "isExposed": true
  }
}
```

**Traversal:**
1. Start at Dashboard
2. Find "WidgetContainer" child
3. Find "Icon" child within WidgetContainer
4. Expose Icon

**Best Practice:** Don't nest too deep (2-3 levels max). Deeper nesting makes the design system harder to maintain.

---

## Pattern 4: List Item with Badge

**Structure:**
```
ListItem (Parent Component)
├── Badge (Nested Instance with TEXT property)
└── LabelText (Nested Instance with TEXT property)
```

**Use Case:** List items with dynamic badge text ("New", "Hot", "Sale")

**Implementation:**

1. **Create Badge component:**
   ```javascript
   const badge = figma.createComponent();
   const badgeText = figma.createText();
   const textProp = badge.addComponentProperty("Text", "TEXT", "New");
   badgeText.componentPropertyReferences = { characters: textProp };
   ```

2. **Add to ListItem and expose:**
   ```javascript
   const badgeInstance = badgeComp.createInstance();
   badgeInstance.name = "Badge";
   badgeInstance.isExposedInstance = true;
   listItem.appendChild(badgeInstance);
   ```

3. **Usage:**
   ```json
   {
     "instanceId": "I{listItemId};{badgeId}",
     "properties": {
       "Text#xxx:x": "Hot"
     }
   }
   ```

---

## Pattern 5: Avatar with Status Indicator

**Structure:**
```
Avatar (Parent Component)
├── ProfileImage (IMAGE property)
└── StatusIndicator (Nested Instance with BOOLEAN visibility)
```

**Use Case:** Avatar with toggle-able online/offline status indicator

**Implementation:**

1. **Create StatusIndicator:**
   ```javascript
   const indicator = figma.createComponent();
   const dot = figma.createEllipse();

   // Add BOOLEAN property for visibility
   const visibleProp = indicator.addComponentProperty("Visible", "BOOLEAN", true);

   // Note: Binding BOOLEAN to visibility requires direct assignment on instances
   ```

2. **Add to Avatar:**
   ```javascript
   const statusInstance = indicatorComp.createInstance();
   statusInstance.name = "StatusIndicator";
   statusInstance.isExposedInstance = true;
   avatar.appendChild(statusInstance);
   ```

3. **Toggle visibility:**
   ```json
   {
     "instanceId": "I{avatarId};{statusId}",
     "properties": {
       "Visible#xxx:x": false
     }
   }
   ```

---

## Pattern 6: Responsive Navigation Item

**Structure:**
```
NavItem (Parent Component with variant property)
├── Icon (INSTANCE_SWAP)
├── Label (TEXT)
└── Badge (BOOLEAN visibility)
```

**Use Case:** Navigation item with swappable icon, editable label, and optional badge

**Implementation:**

```javascript
// Create NavItem with all property types
const navItem = figma.createComponent();

// 1. INSTANCE_SWAP for icon
const iconInstance = iconComp.createInstance();
const iconProp = navItem.addComponentProperty("Icon", "INSTANCE_SWAP", iconComp.id);
iconInstance.componentPropertyReferences = { mainComponent: iconProp };
iconInstance.isExposedInstance = true;

// 2. TEXT for label
const label = figma.createText();
const labelProp = navItem.addComponentProperty("Label", "TEXT", "Home");
label.componentPropertyReferences = { characters: labelProp };

// 3. BOOLEAN for badge visibility
const badge = figma.createEllipse();
const badgeProp = navItem.addComponentProperty("ShowBadge", "BOOLEAN", false);
// Badge visibility controlled via property on instances
```

**Usage:**
```json
{
  "name": "set_instance_properties",
  "arguments": {
    "instanceId": "nav-item-instance-id",
    "properties": {
      "Icon#xxx:x": "settings-icon-id",
      "Label#xxx:x": "Settings",
      "ShowBadge#xxx:x": true
    }
  }
}
```

---

## Exposed Instance ID Format

**Format:** `I{parentInstanceId};{nestedChildId}`

**Example:**
- Parent Instance ID: `267:3779`
- Nested Child ID (in component definition): `267:3771`
- Exposed Instance ID: `I267:3779;267:3771`

**Usage:**
```json
{
  "name": "set_instance_properties",
  "arguments": {
    "instanceId": "I267:3779;267:3771",
    "properties": {
      "Label#267:11": "New Value"
    }
  }
}
```

**Important:** Use exposed instance ID for TEXT/BOOLEAN properties, but parent instance ID for INSTANCE_SWAP properties.

---

## Property Key Format

**Format:** `{propertyName}#{componentId}:{index}`

**Example:** `Icon#270:14`
- Property name: `Icon`
- Component ID: `270`
- Index: `14`

**Where to get it:**
- From component creation output
- From `get_component_properties`
- From `get_instance_properties`

---

## Best Practices

### 1. **Keep Nesting Shallow**
- 2-3 levels maximum
- Deeper nesting = harder to maintain
- Consider flattening complex hierarchies

### 2. **Use Descriptive Names**
- Good: "IconSlot", "TextContainer", "StatusIndicator"
- Bad: "Instance 1", "Nested", "Child"
- Names help with path-based navigation

### 3. **Always Bind Properties**
```javascript
// ❌ WRONG
comp.addComponentProperty("Label", "TEXT", "Default");

// ✅ CORRECT
const prop = comp.addComponentProperty("Label", "TEXT", "Default");
textNode.componentPropertyReferences = { characters: prop };
```

### 4. **Expose Only What's Needed**
- Don't expose every nested instance
- Only expose instances that need customization
- Keeps properties panel clean

### 5. **Document Property Keys**
- Save property keys from creation
- Include in component documentation
- Makes future updates easier

---

## Summary

**Common Patterns:**
1. ✅ Icon Swap in Button - INSTANCE_SWAP
2. ✅ Text Override in Card - TEXT
3. ✅ Multi-Level Nesting - Deep hierarchies
4. ✅ List Item with Badge - TEXT
5. ✅ Avatar with Status - BOOLEAN
6. ✅ Navigation Item - Multiple property types

**Key Takeaway:** All patterns require proper property binding via `componentPropertyReferences` for production-ready design systems.

---

**Last Updated:** 2024-12-27
**Related:** [Instance Swap Recipe](./instance-swap-with-proper-binding.md), [Troubleshooting](./troubleshooting.md)
