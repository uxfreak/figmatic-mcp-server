# Recipe: Expose Nested Instance Properties

**Use Case:** You have a parent component containing a child instance, and you want the child's properties to be accessible when using the parent.

**Example:** A Button component containing an IconLabel component. You want to modify the label text when using the button.

---

## Prerequisites

- Child component with component properties (TEXT, BOOLEAN, etc.)
- Parent component containing an instance of the child
- Child instance must have property bindings (e.g., text node bound to TEXT property)

---

## Step-by-Step Recipe

### Step 1: Create Child Component with Bound Property

**Tool:** `execute_figma_script`

```json
{
  "name": "execute_figma_script",
  "arguments": {
    "description": "Create child with bound text property",
    "script": "const comp = figma.createComponent(); comp.name = 'IconLabel'; comp.resize(120, 50); const bg = figma.createRectangle(); bg.resize(120, 50); bg.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 1 } }]; comp.appendChild(bg); const text = figma.createText(); await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); text.characters = 'Label'; text.fontSize = 16; text.x = 10; text.y = 15; text.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; comp.appendChild(text); const propKey = comp.addComponentProperty('Label', 'TEXT', 'Default Label'); text.componentPropertyReferences = { characters: propKey }; return { componentId: comp.id, componentName: comp.name, propertyKey: propKey };"
  }
}
```

**Output:**
```json
{
  "componentId": "267:3766",
  "componentName": "IconLabel",
  "propertyKey": "Label#267:11"
}
```

**Save:** Component ID and Property Key for next steps

---

### Step 2: Create Parent Component with Nested Child

**Tool:** `execute_figma_script`

```json
{
  "name": "execute_figma_script",
  "arguments": {
    "description": "Create parent with nested child instance",
    "script": "const childComp = figma.getNodeById('267:3766'); const parent = figma.createComponent(); parent.name = 'Button'; parent.resize(200, 100); const bg = figma.createRectangle(); bg.resize(200, 100); bg.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]; parent.appendChild(bg); const childInstance = childComp.createInstance(); childInstance.name = 'NestedIcon'; childInstance.x = 20; childInstance.y = 25; parent.appendChild(childInstance); return { parentId: parent.id, parentName: parent.name, nestedChildId: childInstance.id, nestedChildName: childInstance.name };"
  }
}
```

**Replace:** `267:3766` with your child component ID from Step 1

**Output:**
```json
{
  "parentId": "267:3769",
  "parentName": "Button",
  "nestedChildId": "267:3771",
  "nestedChildName": "NestedIcon"
}
```

**Save:** Parent ID and Nested Child ID

---

### Step 3: Expose the Nested Instance (PRIMITIVE)

**Tool:** `set_nested_instance_exposure`

```json
{
  "name": "set_nested_instance_exposure",
  "arguments": {
    "nodeId": "267:3771",
    "isExposed": true
  }
}
```

**Replace:** `267:3771` with your nested child ID from Step 2

**Output:**
```json
{
  "success": true,
  "nodeId": "267:3771",
  "nodeName": "NestedIcon",
  "isExposed": true,
  "exposedInstanceId": null,
  "parentId": "267:3769",
  "parentName": "Button"
}
```

**Verify in Figma:**
- Select the parent component (Button)
- Check properties panel
- You should see "NestedIcon" as an exposed instance
- The Label property should be visible

---

### Step 4: Create Instance to Test

**Tool:** `create_instance`

```json
{
  "name": "create_instance",
  "arguments": {
    "componentId": "267:3769",
    "name": "ButtonInstance",
    "position": { "x": 600, "y": 100 }
  }
}
```

**Replace:** `267:3769` with your parent ID from Step 2

**Output:**
```json
{
  "id": "267:3779",
  "name": "Button",
  "mainComponent": { "id": "267:3769", "name": "Button" }
}
```

**Verify in Figma:**
- Instance created at x:600
- Select the instance
- Properties panel shows exposed "NestedIcon" with "Label" property

---

### Step 5: Modify Exposed Property via API

**Tool:** `set_instance_properties`

```json
{
  "name": "set_instance_properties",
  "arguments": {
    "instanceId": "I267:3779;267:3771",
    "properties": {
      "Label#267:11": "Custom Text"
    }
  }
}
```

**Replace:**
- `267:3779` - Instance ID from Step 4
- `267:3771` - Nested child ID from Step 2
- `Label#267:11` - Property key from Step 1
- Format: `I{instanceId};{nestedChildId}`

**Output:**
```json
{
  "success": true,
  "instanceName": "NestedIcon",
  "updatedProperties": 1
}
```

**Verify in Figma:**
- The label text changed to "Custom Text"
- Property update visible immediately

---

### Step 6: Discover Structure (READ)

**Tool:** `get_nested_instance_tree`

```json
{
  "name": "get_nested_instance_tree",
  "arguments": {
    "instanceId": "267:3779",
    "depth": -1
  }
}
```

**Replace:** `267:3779` with your instance ID from Step 4

**Output:**
```json
{
  "id": "267:3779",
  "name": "Button",
  "type": "INSTANCE",
  "mainComponent": {
    "id": "267:3769",
    "name": "Button"
  },
  "exposedInstances": [
    {
      "id": "I267:3779;267:3771",
      "name": "NestedIcon",
      "isExposed": true,
      "properties": [
        {
          "key": "Label#267:11",
          "type": "TEXT",
          "value": "Custom Text"
        }
      ]
    }
  ],
  "children": [...]
}
```

---

## Summary

**What We Did:**
1. ✅ Created child component with TEXT property and binding
2. ✅ Created parent component with nested child instance
3. ✅ Exposed the nested instance using `set_nested_instance_exposure`
4. ✅ Created instance of parent to test
5. ✅ Modified exposed property via API
6. ✅ Verified structure with `get_nested_instance_tree`

**Key Concepts:**
- **Property Binding:** `text.componentPropertyReferences = { characters: propKey }`
- **Exposed Instance ID Format:** `I{parentInstanceId};{nestedChildId}`
- **Property Key Format:** `{propertyName}#{componentId}:{index}`

---

**Last Updated:** 2024-12-27
**Related Recipes:** [Expose by Path](./expose-by-path-workflow.md), [Instance Swap with Proper Binding](./instance-swap-with-proper-binding.md)
