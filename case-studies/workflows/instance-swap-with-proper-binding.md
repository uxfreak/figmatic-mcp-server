# Recipe: Instance Swap with Proper Binding ⭐

**Use Case:** **PROPER DESIGN SYSTEM PATTERN** - Create a component with swappable nested instances using INSTANCE_SWAP properties. This is the correct way to implement icon swapping, variant selection, and other component substitutions in design systems.

**Example:** Button component with swappable icon (Mail → Settings → User)

---

## Why This Pattern Matters

**❌ Without Property Binding:**
- Direct manipulation works but bypasses design system
- No swap control in properties panel
- Not maintainable in production design systems

**✅ With Property Binding:**
- Swap control appears in properties panel
- Can set preferred values (curated component list)
- Proper design system pattern
- Maintainable and scalable

---

## Step-by-Step Recipe

### Step 1: Create Icon Components (Swappable Options)

**Tool:** `execute_figma_script`

**Create Icon_Mail:**
```json
{
  "name": "execute_figma_script",
  "arguments": {
    "description": "Create Mail icon component",
    "script": "const comp = figma.createComponent(); comp.name = 'Icon_Mail'; comp.resize(24, 24); comp.x = 50; comp.y = 50; const circle = figma.createEllipse(); circle.resize(24, 24); circle.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 1 } }]; comp.appendChild(circle); return { id: comp.id, name: comp.name };"
  }
}
```

**Output:**
```json
{
  "id": "270:3821",
  "name": "Icon_Mail"
}
```

**Create Icon_Settings:**
```json
{
  "name": "execute_figma_script",
  "arguments": {
    "description": "Create Settings icon component",
    "script": "const comp = figma.createComponent(); comp.name = 'Icon_Settings'; comp.resize(24, 24); comp.x = 100; comp.y = 50; const rect = figma.createRectangle(); rect.resize(24, 24); rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }]; comp.appendChild(rect); return { id: comp.id, name: comp.name };"
  }
}
```

**Output:**
```json
{
  "id": "270:3823",
  "name": "Icon_Settings"
}
```

**Save:** Both icon component IDs (you'll need them for Step 2 and Step 5)

---

### Step 2: Create Button with INSTANCE_SWAP Property & Binding ⭐

**Tool:** `execute_figma_script`

**CRITICAL:** This step creates the INSTANCE_SWAP property AND binds the nested instance to it.

```json
{
  "name": "execute_figma_script",
  "arguments": {
    "description": "Create button with proper INSTANCE_SWAP binding",
    "script": "const iconComp = figma.getNodeById('270:3821'); const button = figma.createComponent(); button.name = 'Button_Primary'; button.resize(120, 44); button.x = 200; button.y = 50; const bg = figma.createRectangle(); bg.resize(120, 44); bg.cornerRadius = 8; bg.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]; button.appendChild(bg); const iconInstance = iconComp.createInstance(); iconInstance.name = 'IconSlot'; iconInstance.x = 10; iconInstance.y = 10; button.appendChild(iconInstance); const swapProp = button.addComponentProperty('Icon', 'INSTANCE_SWAP', iconComp.id); iconInstance.componentPropertyReferences = { mainComponent: swapProp }; iconInstance.isExposedInstance = true; return { buttonId: button.id, buttonName: button.name, iconInstanceId: iconInstance.id, swapPropertyKey: swapProp, bound: true };"
  }
}
```

**Replace:** `270:3821` with your Icon_Mail component ID from Step 1

**Key Code Explained:**
```javascript
// ⭐ STEP 1: Create INSTANCE_SWAP property on parent
const swapProp = button.addComponentProperty(
  'Icon',              // Property name
  'INSTANCE_SWAP',     // Property type
  iconComp.id          // Default value (component ID as STRING!)
);

// ⭐ STEP 2: Bind nested instance to this property (CRITICAL!)
iconInstance.componentPropertyReferences = {
  mainComponent: swapProp  // Links instance to property
};

// ⭐ STEP 3: Expose the instance
iconInstance.isExposedInstance = true;
```

**Output:**
```json
{
  "buttonId": "270:3825",
  "buttonName": "Button_Primary",
  "iconInstanceId": "270:3827",
  "swapPropertyKey": "Icon#270:14",
  "bound": true
}
```

**Save:**
- `buttonId` - for creating instances
- `swapPropertyKey` - for swapping icons

---

### Step 3: Create Instance to Test

**Tool:** `create_instance`

```json
{
  "name": "create_instance",
  "arguments": {
    "componentId": "270:3825",
    "name": "ButtonInstance",
    "position": { "x": 400, "y": 50 }
  }
}
```

**Replace:** `270:3825` with button component ID from Step 2

**Output:**
```json
{
  "id": "270:3829",
  "name": "Button_Primary",
  "mainComponent": { "id": "270:3825", "name": "Button_Primary" }
}
```

**Verify in Figma:**
- Select the button instance
- Properties panel shows "Icon" swap control ⭐
- Current value: Icon_Mail

---

### Step 4: Verify Exposed Instance Structure

**Tool:** `get_nested_instance_tree`

```json
{
  "name": "get_nested_instance_tree",
  "arguments": {
    "instanceId": "270:3829",
    "depth": -1
  }
}
```

**Replace:** `270:3829` with instance ID from Step 3

**Output:**
```json
{
  "id": "270:3829",
  "name": "Button_Primary",
  "type": "INSTANCE",
  "exposedInstances": [
    {
      "id": "I270:3829;270:3827",
      "name": "IconSlot",
      "isExposed": true,
      "properties": [
        {
          "key": "Icon#270:14",
          "type": "INSTANCE_SWAP",
          "value": "270:3821"
        }
      ]
    }
  ]
}
```

**Verify:**
- ✅ Exposed instance ID format: `I{parentId};{childId}`
- ✅ Property type: INSTANCE_SWAP
- ✅ Current value points to Icon_Mail (270:3821)

---

### Step 5: Swap Icon via Property ⭐

**Tool:** `set_instance_properties`

**CRITICAL:** Set property on PARENT instance, not exposed nested instance!

```json
{
  "name": "set_instance_properties",
  "arguments": {
    "instanceId": "270:3829",
    "properties": {
      "Icon#270:14": "270:3823"
    }
  }
}
```

**Replace:**
- `270:3829` - Parent instance ID (NOT exposed instance ID!)
- `Icon#270:14` - Swap property key from Step 2
- `270:3823` - New component ID (Icon_Settings from Step 1)

**Common Mistake:** ❌ Using exposed instance ID `I270:3829;270:3827` - This will fail!

**Correct:** ✅ Using parent instance ID `270:3829`

**Output:**
```json
{
  "success": true,
  "instanceName": "Button_Primary",
  "updatedProperties": 1
}
```

**Verify in Figma:**
- Icon changed from blue circle (Mail) to orange square (Settings) ⭐
- Properties panel shows Icon_Settings selected

---

### Step 6: Take Screenshot to Verify

**Tool:** `get_screenshot`

```json
{
  "name": "get_screenshot",
  "arguments": {
    "nodeId": "270:3829",
    "format": "png",
    "scale": 2
  }
}
```

**Replace:** `270:3829` with instance ID

**Output:**
```json
{
  "path": "/var/folders/.../button-270-3829.png",
  "nodeId": "270:3829",
  "nodeName": "Button_Primary",
  "size": 4521
}
```

**Visual Confirmation:**
- Dark gray button background (preserved)
- Orange square icon (successfully swapped from blue circle)

---

### Step 7: Verify Final State

**Tool:** `get_nested_instance_tree`

```json
{
  "name": "get_nested_instance_tree",
  "arguments": {
    "instanceId": "270:3829",
    "depth": -1
  }
}
```

**Output:**
```json
{
  "children": [
    {
      "name": "IconSlot",
      "mainComponent": {
        "id": "270:3823",
        "name": "Icon_Settings"
      }
    }
  ]
}
```

**Confirmed:** mainComponent now points to Icon_Settings (270:3823) ✅

---

## What We Verified

✅ INSTANCE_SWAP property created on parent component
✅ Nested instance bound to property via `componentPropertyReferences`
✅ Instance exposed via `isExposedInstance = true`
✅ Swap via property works (parent instance, not nested)
✅ Screenshot confirms visual result
✅ Properties panel shows swap control

---

## Why Each Step Matters

1. **addComponentProperty** - Creates the swap control in properties panel
2. **componentPropertyReferences** - Binds nested instance to property (CRITICAL!)
3. **isExposedInstance** - Makes property accessible on parent instances
4. **set_instance_properties on parent** - Modifies property value (not direct instance manipulation)

---

## The Three Critical Lines

Without these three lines, the pattern doesn't work:

```javascript
// 1. Create the property
const swapProp = button.addComponentProperty('Icon', 'INSTANCE_SWAP', iconComp.id);

// 2. Bind the instance to the property (MOST CRITICAL!)
iconInstance.componentPropertyReferences = { mainComponent: swapProp };

// 3. Expose the instance
iconInstance.isExposedInstance = true;
```

**Missing line 2?** → No swap control in properties panel, not a proper design system pattern

---

## Summary

**What We Did:**
1. Created icon components (swappable options)
2. Created button with INSTANCE_SWAP property and proper binding
3. Created instance and verified structure
4. Swapped icon via property
5. Verified with screenshot

**Key Takeaway:**
This is the **proper design system pattern** for swappable components. Always use property binding, not direct manipulation.

---

**Last Updated:** 2024-12-27
**Related Recipes:** [Expose Properties](./expose-nested-instance-properties.md), [Troubleshooting](./troubleshooting.md)
