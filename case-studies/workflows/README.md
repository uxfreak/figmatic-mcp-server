# Nested Instance Workflows - Recipe Index

**Last Updated:** 2024-12-27
**Purpose:** Step-by-step recipes for working with nested component instances

---

## 📋 Available Recipes

### Core Workflows

1. **[Expose Nested Instance Properties](./expose-nested-instance-properties.md)**
   - Expose a child instance's properties at the parent level
   - Use TEXT, BOOLEAN, and other property types
   - 6-step workflow with exact tool calls

2. **[Expose Nested Instance by Path](./expose-by-path-workflow.md)**
   - Navigate by name hierarchy instead of node IDs
   - Workflow tool for convenience
   - Best when you know the structure but not IDs

3. **[Hide Exposed Instance](./hide-exposed-instance.md)**
   - Remove an exposed instance from parent's properties
   - Simple single-step operation

4. **[Instance Swap with Proper Binding](./instance-swap-with-proper-binding.md)** ⭐ **CRITICAL**
   - **Proper design system pattern** for swappable components
   - INSTANCE_SWAP property creation and binding
   - 7-step workflow with visual verification
   - **Use this for all production icon/component swapping**

5. **[Copy Properties Workflow](./copy-properties-workflow.md)** 🆕
   - Copy bindings, properties, and styles between components
   - Complete replication with `copy_all_properties`
   - Selective copying with `copy_bindings`
   - Includes variable bindings, text styles, shadows, fills

---

## 📚 Reference Documentation

- **[Troubleshooting Guide](./troubleshooting.md)** - Common errors and solutions
- **[Common Patterns](./common-patterns.md)** - Real-world design system examples

---

## 🎯 Quick Start

**New to nested instances?** Start here:
1. Read [Expose Nested Instance Properties](./expose-nested-instance-properties.md) first
2. Then read [Instance Swap with Proper Binding](./instance-swap-with-proper-binding.md) ⭐
3. Reference [Troubleshooting](./troubleshooting.md) when you hit errors

**Need to swap icons/components?**
→ Go directly to [Instance Swap with Proper Binding](./instance-swap-with-proper-binding.md)

---

## 🔧 Tools Used

All recipes use these MCP tools:
- `execute_figma_script` - Low-level Figma API operations
- `create_instance` - Create component instances
- `get_nested_instance_tree` - Discover nested structure
- `set_nested_instance_exposure` - Expose/hide instances (primitive)
- `expose_nested_instance_by_path` - Expose by name path (workflow)
- `set_instance_properties` - Modify exposed properties
- `copy_bindings` - Copy property bindings only (workflow) 🆕
- `copy_all_properties` - Copy bindings + properties + styles (workflow) 🆕
- `get_screenshot` - Visual verification

---

## ✅ What You'll Learn

After completing these recipes, you'll know how to:
- ✅ Expose nested instances and their properties
- ✅ Create INSTANCE_SWAP properties with proper bindings
- ✅ Navigate component hierarchies by path
- ✅ Modify exposed properties via API
- ✅ Build maintainable design system patterns
- ✅ Debug common errors

---

**Format:** Each recipe includes:
- Use case and when to use it
- Prerequisites
- Step-by-step tool calls (copy-paste ready)
- Expected outputs
- Verification steps
