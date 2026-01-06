# Recipe: Expose Nested Instance by Path (Workflow)

**Use Case:** You know the **name hierarchy** but not the exact node ID. Use path-based navigation to expose.

**Example:** Expose "Icon Container" → "Icon" in a button component without knowing the exact node IDs.

---

## Prerequisites

- Parent component already exists
- Nested child instance exists with a known name
- Child instance has component properties

---

## Step-by-Step Recipe

### Step 1: Expose by Path

**Tool:** `expose_nested_instance_by_path`

```json
{
  "name": "expose_nested_instance_by_path",
  "arguments": {
    "parentInstanceId": "267:3769",
    "childPath": ["NestedIcon"],
    "isExposed": true
  }
}
```

**Replace:**
- `267:3769` - Component ID or Instance ID
- `["NestedIcon"]` - Array of child names to navigate

**For deeper nesting:**
```json
{
  "childPath": ["IconContainer", "Icon"]
}
```

**Output:**
```json
{
  "success": true,
  "targetNodeId": "267:3771",
  "targetNodeName": "NestedIcon",
  "isExposed": true,
  "exposedInstanceId": null,
  "traversedPath": ["Button", "NestedIcon"],
  "pathDepth": 1
}
```

**Verify in Figma:**
- Select parent component
- Properties panel shows exposed instance
- Nested instance properties are accessible

---

## Benefits

- ✅ Don't need to know exact node IDs
- ✅ Navigate by name (more maintainable)
- ✅ Works on both components and instances
- ✅ Single tool call instead of manual navigation
- ✅ Clear error messages if child not found

---

## Multi-Level Navigation

**Example:** Expose a deeply nested instance

```json
{
  "name": "expose_nested_instance_by_path",
  "arguments": {
    "parentInstanceId": "184:5659",
    "childPath": ["Widget Container", "Icon Slot", "Icon"],
    "isExposed": true
  }
}
```

**Traverses:**
1. Start at parent (184:5659)
2. Find child named "Widget Container"
3. Find child named "Icon Slot"
4. Find child named "Icon"
5. Set `isExposedInstance = true` on Icon

---

## Common Use Cases

### 1. Icon in Button
```json
{
  "parentInstanceId": "button-component-id",
  "childPath": ["IconSlot"]
}
```

### 2. Text in Card
```json
{
  "parentInstanceId": "card-component-id",
  "childPath": ["TextContainer", "Title"]
}
```

### 3. Badge in List Item
```json
{
  "parentInstanceId": "list-item-id",
  "childPath": ["Badge"]
}
```

---

## Comparison: Primitive vs Workflow

**Using Primitive (`set_nested_instance_exposure`):**
```json
// Requires exact node ID
{
  "name": "set_nested_instance_exposure",
  "arguments": {
    "nodeId": "267:3771",  // Must know this!
    "isExposed": true
  }
}
```

**Using Workflow (`expose_nested_instance_by_path`):**
```json
// Only requires parent ID and child name
{
  "name": "expose_nested_instance_by_path",
  "arguments": {
    "parentInstanceId": "267:3769",  // Parent ID (easier to get)
    "childPath": ["NestedIcon"],     // Name (human-readable)
    "isExposed": true
  }
}
```

**When to Use Each:**
- **Primitive:** When you already have the exact node ID (faster)
- **Workflow:** When you know the hierarchy by name (more maintainable)

---

## Error Handling

**If child name doesn't match:**
```
Error: Child 'IconSlot' not found in 'Button'.
Available children: NestedIcon, Background, TextLabel
```

**Solution:** Use `get_nested_instance_tree` to discover exact names

---

## Summary

**What We Did:**
✅ Exposed nested instance using path-based navigation
✅ No need to manually find node IDs
✅ Single tool call for convenience

**Key Benefits:**
- More maintainable (uses names, not IDs)
- Clearer intent in code
- Better error messages

---

**Last Updated:** 2024-12-27
**Related Recipes:** [Expose Properties](./expose-nested-instance-properties.md), [Hide Instance](./hide-exposed-instance.md)
