# Testing Observations & Notes

**Date Started:** 2024-12-27
**Purpose:** Document testing observations, tool issues, and improvements needed

---

## Session 1: Phase 3 - Testing swap_component

### Test Setup
- **Goal:** Verify swap_component correctly swaps nested instances without replacing parent
- **Existing components:**
  - TEST_Child (267:3766) - Blue component
  - TEST_Parent (267:3769) - Gray parent with NestedChild inside
  - TEST_Instance (267:3779) - Instance of parent at x:600
  - TEST_Child_Alt (267:3784) - Orange component with "SWAPPED!" text

### Test Executed
- Called `swap_component` with:
  - instanceId: 267:3779
  - childPath: ["NestedChild"]
  - newComponentId: 267:3784
- Result: SUCCESS (tool reported swap successful)

### Verification Attempt 1: get_node_details

**Tool:** `get_node_details`
**Status:** ✅ SUCCESS
**Node ID:** 267:3779 (parent instance)
**Findings:**
- Tool works correctly
- Returns: identity, dimensions, layout, appearance, bindings, structure
- **Issue:** Does NOT include `mainComponent` field for instances
- **Improvement needed:** Add mainComponent info to get_node_details for INSTANCE types

### Verification Attempt 2: get_nested_instance_tree

**Tool:** `get_nested_instance_tree`
**Status:** ✅ SUCCESS
**Node ID:** 267:3779
**Findings:**
- Tool works excellently for verifying structure
- **Confirmed swap SUCCESS:**
  - Parent: TEST_Parent (267:3769) - unchanged ✅
  - NestedChild: mainComponent = TEST_Child_Alt (267:3784) ✅
  - NestedChild children: Rectangle + "SWAPPED!" text ✅
- The swap correctly targeted ONLY the nested child, not the parent

### Test Result: swap_component

**Status:** ✅ WORKS CORRECTLY
**Conclusion:** The swap_component tool with childPath correctly swaps nested instances without replacing the parent.

**Evidence:**
```json
{
  "name": "NestedChild",
  "mainComponent": {
    "id": "267:3784",
    "name": "TEST_Child_Alt"
  },
  "children": [
    {"name": "Rectangle", "type": "RECTANGLE"},
    {"name": "SWAPPED!", "type": "TEXT"}
  ]
}
```

Parent structure remained intact with gray background rectangle still present.

---

## Observations Summary

### Tools Tested
1. ✅ `swap_component` - Works correctly with childPath
2. ✅ `get_node_details` - Works but missing mainComponent field
3. ✅ `get_nested_instance_tree` - Excellent for verification

### Issues Found
1. **get_node_details missing mainComponent** - Should add mainComponent field for INSTANCE nodes

### Verification Attempt 3: get_screenshot

**Tool:** `get_screenshot`
**Status (Initial):** ❌ FAILED
**Error:** `Invalid discriminator value. Expected 'PNG' | 'JPG' | 'PDF' | 'SVG' | 'SVG_STRING' | 'JSON_REST_V1' at .format`

**Bug Found:** Tool didn't convert lowercase format to uppercase

**Fix Applied:**
```javascript
// Added in read-tools.js line 115
const upperFormat = format.toUpperCase();
```

**Status (After Fix):** ✅ SUCCESS
**Test Result:**
- Format: 'png' (lowercase) → Converted to 'PNG' ✓
- Screenshot saved: `test-parent-267-3779-1766835265867.png`
- Size: 3109 bytes
- **Visual confirmation:** Gray parent with orange "SWAPPED!" nested child ✓

**Screenshot Evidence:**
- Parent background: Gray (still intact)
- Nested child: Orange with "SWAPPED!" text
- **Confirms:** swap_component correctly swapped nested instance without replacing parent

### Bugs Fixed
1. ✅ **get_screenshot format conversion** - Now converts format to uppercase before passing to Figma API

### Improvements Needed
1. **get_node_details:** Add mainComponent field for INSTANCE nodes (enhancement)

### Next Steps
- ~~Mark Phase 3 as complete (swap_component works correctly)~~ ✅
- ~~Document this workflow in testing notes~~ ✅
- **CRITICAL DISCOVERY:** Need to re-test with proper INSTANCE_SWAP property bindings
- Proceed to Phase 4

---

## Session 2: Phase 3 Revisited - Proper Instance Swap Pattern

### Discovery (2024-12-27)
User correctly identified that our test was incomplete. We tested `swap_component` directly but **missed the proper design system pattern**.

### The Problem
**What we tested:**
1. Created child component with TEXT property ✓
2. Created parent with nested instance ✓
3. Exposed nested instance ✓
4. Swapped directly via `swap_component` ✓

**What we SHOULD have tested:**
1. Created child component ✓
2. Created parent with nested instance ✓
3. **ADD INSTANCE_SWAP property to parent** ❌ MISSING
4. **BIND nested instance to property** ❌ MISSING
5. Exposed nested instance ✓
6. Swapped via property ❌ DIDN'T TEST

### Why This Matters
- Without property binding: swap works but bypasses design system
- With property binding: proper maintainable pattern
- Properties panel shows swap control
- Can set preferred values

### Research Findings
Source: [Figma Component Properties Documentation](https://help.figma.com/hc/en-us/articles/5579474826519-Explore-component-properties)

**Proper Binding:**
```javascript
// Create INSTANCE_SWAP property on parent
const swapProp = parentComp.addComponentProperty("Icon", "INSTANCE_SWAP", defaultComp);

// Bind nested instance to this property
nestedInstance.componentPropertyReferences = {
  mainComponent: swapProp  // This creates the binding!
};
```

### Action Required
- ~~Create new test with proper INSTANCE_SWAP property binding~~ ✅
- ~~Verify swap works through the property~~ ✅
- ~~Update workflows documentation with correct pattern~~ ✅

### Test Execution (2024-12-27 5:14 PM)

**Test:** `/tmp/test-proper-instance-swap.js`

**Result:** ✅ ALL STEPS PASSED

**Steps Verified:**
1. ✅ Created Icon_Mail component (270:3821) - blue circle
2. ✅ Created Icon_Settings component (270:3823) - orange square
3. ✅ Created Button_Proper component (270:3825) with:
   - INSTANCE_SWAP property: `Icon#270:14`
   - Nested icon instance bound to property
   - Instance exposed
4. ✅ Created ButtonInstance_Proper (270:3829)
5. ✅ Verified exposed instance in tree
6. ✅ Swapped icon from Icon_Mail to Icon_Settings via property
7. ✅ Screenshot captured: `button-proper-270-3829-1766835880631.png`
8. ✅ Final verification confirmed swap: Icon_Settings (270:3823)

**Screenshot Evidence:**
- Dark gray button background (preserved)
- Orange square icon (successfully swapped from blue circle)

**Errors Encountered & Fixed:**
1. ❌ First attempt: Used `iconComp` instead of `iconComp.id` for defaultValue
   - Error: "Expected boolean, received object"
   - Fix: Changed to `iconComp.id` (string ID)

2. ❌ Second attempt: Tried to set property on exposed nested instance
   - Error: "Could not find a component property with name: 'Icon#270:12'"
   - Fix: Set property on parent instance (270:3829), not `I270:3829;270:3827`

**Key Learning:**
- INSTANCE_SWAP properties are ALWAYS set on parent instance, not nested instance
- Default value must be component ID string, not component object
- Property binding (`componentPropertyReferences`) is CRITICAL for design system pattern

### Documentation Updated (2024-12-27)

✅ **Updated:** `case-studies/nested-instance-workflows.md`

**Changes Made:**
1. Added Recipe 4: INSTANCE_SWAP Property with Proper Binding ⭐
   - Complete 7-step workflow
   - Proper property binding code examples
   - Visual verification steps
   - What each step accomplishes

2. Updated Troubleshooting Section:
   - Added error: "Expected boolean, received object"
   - Added error: "Could not find a component property"
   - Added error: "Invalid discriminator value" (get_screenshot)
   - Added section: Missing Property Binding (silent failure)
   - All errors include exact error messages and solutions

3. Updated Common Patterns:
   - Pattern 1 now shows proper INSTANCE_SWAP pattern
   - References Recipe 4 for full implementation
   - Explains why binding matters

4. Updated Summary:
   - Highlighted Recipe 4 as critical learning
   - Updated tool count and recipe count
   - Emphasized proper design system pattern

**Result:** Complete, production-ready documentation for INSTANCE_SWAP property binding pattern.

---
