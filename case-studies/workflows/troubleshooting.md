# Troubleshooting Guide - Nested Instance Workflows

Common errors and solutions when working with nested instances and component properties.

---

## Error: "Can only expose primary instances"

**Cause:** Trying to expose an instance within an instance (not in component definition)

**What this means:** You can only expose instances that live inside component definitions, not instances of instances.

**Solution:** Expose the instance in the component definition, not in an instance of that component.

**Example:**
```
❌ WRONG: Trying to expose in instance
ButtonInstance
└── IconSlot (trying to expose this)

✅ CORRECT: Expose in component definition
Button (Component)
└── IconSlot (expose this)
```

---

## Error: "Can only expose instances that have exposed nested instances or children with component property references"

**Cause:** Nested instance has no component properties or bindings

**What this means:** The child instance you're trying to expose must either:
1. Have component properties that are bound to its nodes, OR
2. Have its own exposed nested instances

**Solution:**
1. Add component properties to child component
2. Bind nodes to properties using `componentPropertyReferences`

**Example:**
```javascript
// ❌ WRONG - No binding
const propKey = comp.addComponentProperty("Label", "TEXT", "Default");
// textNode is NOT bound to property

// ✅ CORRECT - With binding
const propKey = comp.addComponentProperty("Label", "TEXT", "Default");
textNode.componentPropertyReferences = { characters: propKey };
```

---

## Error: "Child not found in path"

**Full Error Example:**
```
Error: Child 'IconSlot' not found in 'Button'.
Available children: NestedIcon, Background, TextLabel
```

**Cause:** Child name doesn't match exactly (case-sensitive)

**Solution:**
- Check exact name (case-sensitive, whitespace matters)
- Use `get_nested_instance_tree` to discover correct child names

**Example:**
```json
{
  "name": "get_nested_instance_tree",
  "arguments": {
    "instanceId": "parent-id",
    "depth": -1
  }
}
```

Look in the output for actual child names in the `children` array.

---

## Error: "Expected boolean, received object" (addComponentProperty)

**Cause:** Passing component object instead of component ID string for INSTANCE_SWAP default value

**What this means:** `addComponentProperty` expects a string ID, not the component object itself.

**Solution:**
```javascript
// ❌ WRONG - Passing component object
button.addComponentProperty("Icon", "INSTANCE_SWAP", iconComp);

// ✅ CORRECT - Passing component ID string
button.addComponentProperty("Icon", "INSTANCE_SWAP", iconComp.id);
```

**JSON equivalent:**
```json
{
  "script": "... button.addComponentProperty('Icon', 'INSTANCE_SWAP', iconComp.id) ..."
}
```

---

## Error: "Could not find a component property with name: 'Icon#270:12'"

**Cause:** Trying to set INSTANCE_SWAP property on exposed nested instance instead of parent instance

**What this means:** INSTANCE_SWAP properties must be set on the **parent instance**, not the exposed nested instance.

**Solution:**
```javascript
// ❌ WRONG - Using exposed instance ID
{
  "instanceId": "I270:3829;270:3827",  // Don't use this!
  "properties": { "Icon#270:14": "270:3823" }
}

// ✅ CORRECT - Using parent instance ID
{
  "instanceId": "270:3829",  // Parent instance only
  "properties": { "Icon#270:14": "270:3823" }
}
```

**Rule:** INSTANCE_SWAP properties are always set on the **parent instance**, not the exposed nested instance.

**ID Breakdown:**
- Parent instance ID: `270:3829` ← Use this
- Exposed instance ID: `I270:3829;270:3827` ← Don't use for INSTANCE_SWAP

---

## Error: "Invalid discriminator value. Expected 'PNG' | 'JPG'" (get_screenshot)

**Cause:** Format parameter is case-sensitive, must be uppercase

**Solution:**
```javascript
// ❌ WRONG
{ "format": "png" }

// ✅ CORRECT
{ "format": "PNG" }
```

**Note:** This has been fixed in the tool - lowercase is now auto-converted to uppercase. But for clarity, use uppercase.

---

## Missing Property Binding (No Error, But Doesn't Work)

**Symptom:** Swap control doesn't appear in properties panel even though instance is exposed

**What this means:** You created the INSTANCE_SWAP property but forgot to bind the nested instance to it. This is the most common mistake.

**Cause:** Created INSTANCE_SWAP property but didn't bind nested instance to it

**Solution:**
```javascript
// After addComponentProperty, MUST add binding:
const swapProp = button.addComponentProperty("Icon", "INSTANCE_SWAP", defaultIcon.id);

// ⭐ THIS LINE IS CRITICAL!
iconInstance.componentPropertyReferences = {
  mainComponent: swapProp
};
```

**Without this binding:**
- ❌ No swap control in properties panel
- ❌ Direct manipulation still works but bypasses design system
- ❌ Not maintainable
- ❌ Not a proper design system pattern

**With this binding:**
- ✅ Swap control appears in properties panel
- ✅ Proper design system pattern
- ✅ Maintainable
- ✅ Can set preferred values

---

## No Exposed Instances Showing Up

**Symptom:** `get_nested_instance_tree` returns empty `exposedInstances` array

**Possible Causes:**

### 1. Instance not exposed
```javascript
// Check if isExposedInstance is set to true
iconInstance.isExposedInstance = true;
```

### 2. No property bindings
The child instance needs component property bindings to be exposable.

### 3. Looking at wrong node
Make sure you're querying the parent instance, not the component definition.

**Solution:**
```json
{
  "name": "get_nested_instance_tree",
  "arguments": {
    "instanceId": "instance-id-here",  // NOT component ID
    "depth": -1
  }
}
```

---

## Property Not Updating

**Symptom:** Set property via `set_instance_properties` but value doesn't change in Figma

**Possible Causes:**

### 1. Wrong property key format
Property keys have format `{name}#{componentId}:{index}`

**Solution:** Get the exact property key from `get_instance_properties` or from component creation output.

### 2. Setting on wrong instance
For TEXT properties, use exposed instance ID: `I{parent};{child}`
For INSTANCE_SWAP properties, use parent instance ID: `{parent}`

### 3. Property doesn't exist
Verify the property exists:
```json
{
  "name": "get_instance_properties",
  "arguments": {
    "instanceId": "your-instance-id"
  }
}
```

---

## Finding Node IDs

**Problem:** Don't know the node ID to expose

**Solution:** Use `get_nested_instance_tree` on the parent component

```json
{
  "name": "get_nested_instance_tree",
  "arguments": {
    "instanceId": "parent-component-id",
    "depth": -1
  }
}
```

Look for the child in the `children` array and note its `id`.

---

## Debugging Checklist

When things don't work, check these in order:

1. ✅ **Child has component properties**
   - Use `get_component_properties` to verify

2. ✅ **Nodes are bound to properties**
   - Check `componentPropertyReferences` in creation script

3. ✅ **Instance is exposed**
   - Verify `isExposedInstance = true`

4. ✅ **Using correct instance ID**
   - Parent ID for INSTANCE_SWAP
   - Exposed ID (`I{parent};{child}`) for TEXT/BOOLEAN

5. ✅ **Property key format is correct**
   - Format: `{name}#{componentId}:{index}`
   - Get from creation output or `get_instance_properties`

6. ✅ **Operating on instance, not component**
   - Instances have format like `270:3829`
   - Components have same format but are definitions

---

## Getting Help

If you're still stuck:

1. Run `get_nested_instance_tree` and inspect the full structure
2. Check `exposedInstances` array for what's actually exposed
3. Verify property bindings exist in component definition
4. Take a screenshot with `get_screenshot` to visually confirm state

---

**Last Updated:** 2024-12-27
**Related:** [Instance Swap Recipe](./instance-swap-with-proper-binding.md), [Common Patterns](./common-patterns.md)
