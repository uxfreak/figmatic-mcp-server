# Recipe: Hide Exposed Instance

**Use Case:** Remove an exposed instance from the parent's properties panel.

**Example:** You previously exposed a nested icon, but now want to hide it so instances can't modify it.

---

## Step-by-Step Recipe

### Single-Step Operation

**Tool:** `set_nested_instance_exposure`

```json
{
  "name": "set_nested_instance_exposure",
  "arguments": {
    "nodeId": "267:3771",
    "isExposed": false
  }
}
```

**Replace:** `267:3771` with nested child ID

**Output:**
```json
{
  "success": true,
  "nodeId": "267:3771",
  "nodeName": "NestedIcon",
  "isExposed": false,
  "exposedInstanceId": null
}
```

---

## Verification

**Before hiding:**
- Select parent component
- Properties panel shows "NestedIcon" exposed instance
- Can modify its properties

**After hiding:**
- Properties panel no longer shows "NestedIcon"
- Instances lose access to nested property
- Direct modifications still possible in component definition

---

## When to Hide Instances

### 1. **Lock Down Design System**
Hide instances that shouldn't be modified by designers:
```json
{
  "nodeId": "background-id",
  "isExposed": false
}
```

### 2. **Simplify Interface**
Too many exposed instances can clutter the properties panel:
```json
// Hide less commonly used instances
{
  "nodeId": "decorative-element-id",
  "isExposed": false
}
```

### 3. **Deprecate Properties**
When migrating to new patterns:
```json
{
  "nodeId": "old-icon-slot-id",
  "isExposed": false
}
```

---

## Finding Node IDs to Hide

**Method 1: Use get_nested_instance_tree**
```json
{
  "name": "get_nested_instance_tree",
  "arguments": {
    "instanceId": "parent-component-id",
    "depth": -1
  }
}
```

Look for exposed instances in the output:
```json
{
  "exposedInstances": [
    {
      "id": "I267:3779;267:3771",  // Use the second ID: 267:3771
      "name": "NestedIcon",
      "isExposed": true
    }
  ]
}
```

**Method 2: Use Component Definition ID**
If you created the component, you already have the nested child ID from creation.

---

## Batch Hide Multiple Instances

**Use execute_figma_script:**
```json
{
  "name": "execute_figma_script",
  "arguments": {
    "description": "Hide multiple exposed instances",
    "script": "const nodeIds = ['267:3771', '267:3772', '267:3773']; nodeIds.forEach(id => { const node = figma.getNodeById(id); if (node && node.type === 'INSTANCE') { node.isExposedInstance = false; } }); return { success: true, hiddenCount: nodeIds.length };"
  }
}
```

---

## Re-Exposing Later

To re-expose a hidden instance:
```json
{
  "name": "set_nested_instance_exposure",
  "arguments": {
    "nodeId": "267:3771",
    "isExposed": true
  }
}
```

**Note:** The instance must still have component property bindings to be exposed again.

---

## Summary

**What We Did:**
✅ Hidden an exposed instance from parent's properties panel

**Key Points:**
- Single tool call: `set_nested_instance_exposure` with `isExposed: false`
- Instances lose access to the property
- Can be re-exposed later
- Useful for design system governance

---

**Last Updated:** 2024-12-27
**Related Recipes:** [Expose Properties](./expose-nested-instance-properties.md), [Expose by Path](./expose-by-path-workflow.md)
