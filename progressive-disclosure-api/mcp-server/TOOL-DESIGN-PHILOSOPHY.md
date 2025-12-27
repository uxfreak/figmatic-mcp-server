# MCP Tool Design Philosophy

**Purpose:** Guide tool design decisions for the Figmatic MCP Server

**Last Updated:** December 27, 2024

**Based on:** 9 case studies, 3 successful implementations (clone_node, reorder_children, add_variant_to_component_set)

---

## The Core Problem

We're building tools for AI agents (like Claude) to interact with Figma. The question is: **What's the optimal abstraction layer between natural language and the Figma Plugin API?**

```
Natural Language (User Intent)
         ↓
   AI Agent (Claude)  ← Reasoning, composition, validation
         ↓
   MCP Tools  ← THE OPTIMAL ABSTRACTION LAYER
         ↓
   Figma Plugin API
```

---

## The Philosophy in One Sentence

**"Tools provide primitives and workflows. AI provides intelligence and composition."**

---

## Understanding the User's Layer

**Based on:** Analysis of 1000+ recent user interactions, focusing on MCP/Figmatic development

### The Critical Meta-Principle: "The Right Layer of Abstraction"

The user's **most important principle** (appears repeatedly):

> "Think about the right layer of abstraction. Like are we being specific to something? Could we generalize it which could be applied to multiple things?"
>
> "It is all about climbing the layers of abstractions, right? And identifying that right layer between natural language and the API layer and the AI agent."

**What this means:**
- Tools should be **generalizable**, not overly specific
- Find the **sweet spot** between low-level API and high-level intent
- Ask: "Could this apply to multiple contexts?"

### User's Natural Language Patterns

**Communication Style:**
- **Context-first:** Provides WHY before WHAT
- **Incremental:** "Okay, now...", "Perfect. Now...", "Wait, at this point..."
- **Conversational:** Uses natural markers, asks for confirmation
- **Hybrid:** Mix of directive ("do X") and collaborative ("what do you think?")

**Common Verbs (in order of frequency):**
1. `create` - Most common action
2. `check/analyze` - Research-first mindset
3. `update` - Documentation maintenance
4. `apply/bind` - Design system consistency
5. **NOT**: `build`, `construct`, `develop` (less natural)

**Specificity Pattern:**
- **Execution phase:** Very specific details
- **Design phase:** Abstract exploration
- **Example:** "create auto layout with three instances, first one being first, center one being middle, last one being last, apply glass card style, add spacing-4 to padding, add card-radius"

### User's Quality Standards (Non-Negotiable)

**1. No Scripts, Tools Only:**
> "I just want you to do it using the tools that we have. If we don't have anything in the tools, let's create a tool."
> "wait no scripts.. tools for everything"

**Reasoning:** Tools are discoverable, versioned, documented, AI-friendly.

**2. Research Before Implementation:**
> "Actually do some research first using the plugin API, Figma plugin API to understand it even better."

**Pattern:** Research → Design → Implement → Test → Document

**3. Iterative Execution:**
> "Instead of writing long scripts, do it step by step, like divide it into tasks, do the first step, get the results, analyze them, then run the next part."

**Why:** Observable progress, catch errors early, validate assumptions.

**4. Always Use Design Tokens:**
> "Just ensure we use our tokens and our styles and everything."

**Never hardcode:** All colors, spacing, dimensions must bind to variables.

**5. Visual Validation:**
> "Also keep taking screenshots and analyzing whatever you have created to understand any mistakes."

**Pattern:** Create → Screenshot → Verify → Iterate

### User's Mental Model

**Layered Hierarchy:**
```
Design System (variables, styles)
    ↓
Primitives (text, auto layout, shapes)
    ↓
Components (reusable elements)
    ↓
Instances (actual usage)
```

**Tool-Centric Thinking:**
- MCP tools are first-class citizens
- AI composes workflows from tool primitives
- Each tool does ONE thing predictably

**CRUD Organization:**
> "There are different types of objects and then you have the create, read, update, delete and other types of actions related to them"

**Expects:** Comprehensive tool coverage per object type.

### User's Workflow Patterns

**Component Creation:**
1. Analyze reference (Figma URL, screenshot)
2. Extract properties/structure
3. Identify needed variables/styles
4. Create using MCP tools
5. Verify bindings
6. Document as case study

**Tool Development:**
1. Identify need
2. Check existing tools
3. Research Figma Plugin API
4. Design following philosophy
5. Implement
6. Test
7. Update README + case study

**Decision Making:**
- **Principle-first:** "scalable, modular, pure functions"
- **Collaborative exploration:** "What do you think?"
- **Pragmatic trust:** "Do whatever you think is right. Just ensure..."

### Agency-First Design Principle

> "Because at the end of the day, I'm giving you the agency. So if you have the agency, you should be the one making choices."
>
> "It also needs to be in a language that comes intuitively to you. Like when I ask you to do certain tasks on Figma, what is the intuitive name that comes to your mind?"

**Implication:** Tools should use terminology that feels natural to AI during execution, not just human-readable names.

---

## Key Principles

### Principle 1: Tools Are Verbs or Workflows

**Primitive Tools = Simple Verbs**
- One focused operation
- Works across object types when possible
- Predictable, no hidden logic
- Examples: `delete`, `clone`, `modify`, `rename`, `bind`, `get`

**Workflow Tools = Descriptive Phrases**
- Multi-step domain-specific operations
- Reduces AI cognitive load for common patterns
- Composes primitives internally
- Examples: `add_variant_to_component_set`, `create_component_variants`

### Principle 2: Intelligence Lives in the AI Layer

**AI Agent (Claude) handles:**
- ✅ Validation ("This is the last variant, deleting will remove ComponentSet")
- ✅ Precondition checking (`get_component_variants` before deleting)
- ✅ Workflow composition (check → create → bind → verify)
- ✅ Context-aware decisions ("Silver Chalice exists, skip creation")

**Tools handle:**
- ✅ Predictable operations (do exactly what they say)
- ✅ Parameter validation (required fields, types)
- ❌ NOT business logic or safety checks

### Principle 3: Avoid Tool Explosion

**Good pattern:**
```javascript
// Generic primitives
delete_node        // Any node type
clone_node         // Any node type
reorder_children   // Any parent type
modify_node        // Any property

// Specific workflows
add_variant_to_component_set  // Multi-step: clone + modify + append
```

**Bad pattern (avoid):**
```javascript
// Type explosion
❌ clone_component, clone_frame, clone_group
❌ reorder_variants, reorder_layers
❌ delete_component, delete_frame

// Mixing action + validation
❌ delete_node_with_safety_check
❌ remove_variant_from_component_set  // Just validation, not a workflow
```

---

## The Decision Framework

When designing a new tool, ask these questions:

### Q1: Is this ONE API call or MULTIPLE?

**One API call → Primitive tool**
```javascript
// Example: Deleting a variant
node.remove()  // Single API call
→ Use generic delete_node
```

**Multiple API calls → Consider workflow tool**
```javascript
// Example: Adding a variant
const clone = source.clone();           // 1. Clone
clone.name = "State=Pressed";           // 2. Rename
clone.x = source.x + 400;               // 3. Position
componentSet.appendChild(clone);        // 4. Append
→ Create add_variant_to_component_set workflow tool
```

### Q2: Does it work the SAME across different object types?

**Yes → Generic primitive**
```javascript
clone_node        // Works for components, frames, groups, text, etc.
reorder_children  // Works for ComponentSets, frames, groups, etc.
delete_node       // Works for any node type
```

**No → Type-specific primitive**
```javascript
swap_component            // Only for instances
set_instance_properties   // Only for instances
bind_text_to_property    // Only for text nodes
```

### Q3: Would AI repeat this EXACT sequence every time?

**Yes → Workflow tool**
```javascript
// Every time AI adds a variant, it does:
// clone → rename → position → append
→ add_variant_to_component_set (workflow)
```

**No → Let AI compose primitives**
```javascript
// Sometimes check count first, sometimes don't
// Depends on context
→ Use delete_node (primitive)
→ AI decides when to check
```

### Q4: What's the AI's natural thought?

**Simple verb → Primitive**
- User: "Delete the hover variant"
- AI thinks: "Delete this node" ✅ `delete_node`

**Complex phrase → Workflow**
- User: "Add a pressed variant"
- AI thinks: "Create variant based on existing one" ✅ `add_variant_to_component_set`

---

## Learned Patterns from Case Studies

### Pattern 1: Check → Analyze → Act → Verify

**From:** about-section-rapid-iteration.md

**AI Orchestration:**
```javascript
1. get_design_system()           // Check existing
2. [AI analyzes results]
3. create_variable()              // Create missing
4. bind_variable()                // Bind
5. get_component_structure()      // Verify
```

**Tools are primitives. AI composes the workflow.**

### Pattern 2: Workflow Tools Reduce Cognitive Load

**From:** add-variant-tool-implementation.md

**Without workflow tool:**
```javascript
1. clone_node(sourceVariantId)
2. rename_node(clonedId, "State=Pressed")
3. modify_node(clonedId, { x: 400, y: 0 })
4. add_children(componentSetId, [clonedId])
```

**With workflow tool:**
```javascript
1. add_variant_to_component_set({
     componentSetId,
     sourceVariantId,
     variantName: "State=Pressed"
   })
```

**AI cognitive load reduced from 4 steps to 1.**

### Pattern 3: Validation in AI Layer

**From:** chip-component-creation.md

**AI handles validation:**
```javascript
// AI checks first
const vars = await get_design_system();
const existing = vars.find(v => v.name === "Colors/Silver Chalice");

if (existing) {
  // AI decides: skip creation
  console.log("Silver Chalice already exists! Using existing.");
} else {
  // AI decides: create new
  await create_variable("Colors/Silver Chalice", ...);
}
```

**Tool doesn't need to check existence. AI handles it.**

---

## Real-World Examples

### Example 1: clone_node (Generic Primitive) ✅

**Design Decision:**
- Original proposal: `clone_component` (too specific)
- Final: `clone_node` (generic)

**Why:**
- Figma API has generic `node.clone()`
- Works for components, frames, groups, text, etc.
- One tool instead of many

**AI Usage:**
```javascript
User: "Clone the hover variant"
AI thinks: "Clone this node" (doesn't care what type)
AI calls: clone_node(variantId)
```

### Example 2: reorder_children (Generic Primitive) ✅

**Design Decision:**
- Original proposals: `reorder_variants` AND `reorder_children`
- Final: `reorder_children` (generic only)

**Why:**
- Same implementation for all parent types
- ComponentSet variants are just children
- One tool handles all cases

**AI Usage:**
```javascript
User: "Put the On state first in the Toggle"
AI thinks: "Reorder children of ComponentSet"
AI calls: reorder_children(componentSetId, childOrder)
```

### Example 3: add_variant_to_component_set (Workflow) ✅

**Design Decision:**
- Specialized workflow tool (not generic)

**Why:**
- Multi-step: clone → rename → position → appendChild
- AI would repeat this exact sequence every time
- Domain-specific to ComponentSet variant creation

**AI Usage:**
```javascript
User: "Add a pressed variant to the button"
AI thinks: "Create variant based on existing one"
AI calls: add_variant_to_component_set({
  componentSetId,
  sourceVariantId,
  variantName: "State=Pressed"
})
```

### Example 4: remove_variant (DON'T CREATE) ❌

**Design Decision:**
- Proposed: `remove_variant_from_component_set`
- Final: Use `delete_node` (existing generic primitive)

**Why:**
- Single API call: `node.remove()`
- Just deletion + validation (AI handles validation)
- Not a workflow (no repeated sequence)

**AI Usage:**
```javascript
User: "Remove the hover variant"

AI workflow:
1. get_component_variants(componentSetId)
2. [AI checks: 3 variants exist, safe to delete]
3. delete_node(hoverVariantId)

If last variant:
1. get_component_variants(componentSetId)
2. [AI sees: only 1 variant]
3. [AI warns: "This will delete the ComponentSet. Continue?"]
4. delete_node(variantId) if confirmed
```

**Intelligence lives in AI, not tool.**

---

## Common Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Safety Checks in Tools

**Bad:**
```javascript
function remove_variant_from_component_set(variantId, ensureMinimumVariants) {
  const variants = getVariants(componentSetId);
  if (ensureMinimumVariants && variants.length === 1) {
    throw new Error("Cannot remove last variant");
  }
  delete(variantId);
}
```

**Good:**
```javascript
// Tool is simple
function delete_node(nodeId) {
  node.remove();
}

// AI handles safety
const variants = await get_component_variants(componentSetId);
if (variants.length === 1) {
  warn("This will delete the ComponentSet. Continue?");
  if (!confirmed) return;
}
await delete_node(variantId);
```

### ❌ Anti-Pattern 2: Type Explosion

**Bad:**
```javascript
clone_component()
clone_frame()
clone_group()
clone_text()
```

**Good:**
```javascript
clone_node()  // Works for all types
```

### ❌ Anti-Pattern 3: Validation as Workflow

**Bad:**
```javascript
// This is just validation, not a workflow
remove_variant_from_component_set()  // Just delete + safety check
```

**Good:**
```javascript
// Use primitive + AI validation
delete_node()  // Tool is simple
// AI checks variant count before calling
```

---

## Tool Categories

### Category 1: Generic Primitives (CRUD Operations)

**Pattern:** Work across all or most node types

```javascript
// Read
get_node_details
get_component_structure
get_screenshot

// Create (type-specific creation)
create_component
create_auto_layout
create_text_node

// Update (generic operations)
modify_node         // Any property, any node
rename_node         // Any node
clone_node          // Any node
reorder_children    // Any parent

// Delete
delete_node         // Any node
```

### Category 2: Type-Specific Primitives

**Pattern:** Only work for specific node types (but still single operations)

```javascript
// Instance-specific
swap_component
set_instance_properties

// Text-specific
bind_text_to_property
set_text_truncation

// Variable-specific
bind_variable
create_variable
```

### Category 3: Workflow Tools

**Pattern:** Multi-step, domain-specific compositions

```javascript
// ComponentSet workflows
create_component_variants      // Create + combineAsVariants
add_variant_to_component_set   // Clone + modify + append

// High-level creation (proposed)
create_text_styled             // Create + apply style
```

---

## Applying This Philosophy

### When Reviewing a New Tool Proposal

1. **Read the use case carefully**
   - What does the user naturally say?
   - What would AI naturally think?

2. **Count API calls**
   - One call → Likely a primitive
   - Multiple calls → Consider workflow

3. **Check for type-specificity**
   - Same across types → Generic primitive
   - Type-specific → Specific primitive or workflow

4. **Ask: "Where does intelligence live?"**
   - Validation/safety → AI layer
   - Domain-specific composition → Workflow tool

5. **Look for tool explosion risk**
   - Can we make it generic?
   - Do we really need a specialized version?

### When Implementing a Tool

1. **Keep it predictable**
   - Tool does exactly what it says
   - No hidden logic or magic

2. **Document clearly**
   - What it does (not when to use it)
   - Required parameters
   - What it returns

3. **Let AI handle complexity**
   - Don't embed validation
   - Don't embed workflows (unless it's a workflow tool)

---

## Decision Template

Use this template when proposing a new tool:

```markdown
## Tool Proposal: [tool_name]

### User Intent
"[What user naturally says]"

### AI Natural Thought
"[What AI naturally thinks when translating intent]"

### Decision Framework

**Q1: API Calls?**
- [ ] One → Primitive
- [ ] Multiple → Workflow

**Q2: Type-Specific?**
- [ ] Generic → Generic primitive
- [ ] Specific → Type-specific primitive/workflow

**Q3: Repeated Sequence?**
- [ ] Yes → Workflow tool
- [ ] No → Let AI compose

**Q4: Natural Thought?**
- [ ] Simple verb → Primitive
- [ ] Complex phrase → Workflow

### Recommendation
- [ ] Create new tool: [name]
- [ ] Use existing: [name]
- [ ] Let AI compose: [list primitives]

### Reasoning
[Explain decision based on framework]
```

---

## Applying User Insights to Tool Design

### Recommendation 1: Use User's Natural Verbs

**DO use:**
- `create_component`, `check_component`, `apply_variable`, `bind_variable`

**DON'T use:**
- `build_component`, `construct_layout`, `attach_variable`

**Why:** Match the user's natural language patterns for seamless communication.

### Recommendation 2: Support Iterative Workflows

**Tool responses should include:**
```json
{
  "result": { ... },
  "_next": {
    "suggested_validations": [
      "get_screenshot(nodeId) to verify visually",
      "get_node_details(nodeId) to check bindings"
    ],
    "common_next_steps": [
      "add_variant_to_component_set(...)",
      "bind_variable(...)",
      "create_component_variants(...)"
    ]
  }
}
```

**Why:** Supports user's iterative, step-by-step workflow pattern.

### Recommendation 3: Always Return Node IDs

**Pattern:**
```json
{
  "created": true,
  "componentId": "181:5642",  // ← Always include
  "name": "Button",
  "type": "COMPONENT"
}
```

**Why:** User immediately needs IDs for next operations (bind variables, add children, etc.).

### Recommendation 4: Enable Visual Validation

**Add to workflow tools:**
```javascript
// After creation/modification
const screenshot = await get_screenshot(nodeId);
sendProgress({
  status: "Created. Screenshot available for validation.",
  screenshot: screenshot.path
});
```

**Why:** User validates through screenshots, not just API responses.

### Recommendation 5: Design for Composition

**Instead of monolithic:**
```javascript
❌ create_component_with_variants_and_bindings({
  // 50 parameters
})
```

**Provide composable primitives:**
```javascript
✅ const comp = await create_component(...)
✅ await bind_variable(comp.id, ...)
✅ await add_variant_to_component_set(...)
```

**Why:** User wants observable steps, not black boxes. AI composes workflows.

### Recommendation 6: Consistent CRUD Coverage

**For each object type, provide:**
- **Create:** `create_[object]`
- **Read:** `get_[object]`, `get_[object]_details`
- **Update:** `modify_[object]`, `bind_[property]`
- **Delete:** `delete_node` (generic)

**Example - Text Styles:**
- ✅ `create_text_style`
- ✅ `get_design_system` (includes text styles)
- ❌ Missing: `update_text_style`
- ✅ `delete_text_style`

**Why:** User expects comprehensive tool coverage per object type.

### Recommendation 7: Enforce Design Token Usage

**Tools should:**
1. Accept `variableId` parameters (not hardcoded values)
2. Return warnings if hardcoded values detected
3. Suggest variables from design system

**Example:**
```json
{
  "error": "Hardcoded color detected",
  "value": "#14B8A6",
  "_suggestion": {
    "variable": "Status/badge-default",
    "variableId": "VariableID:123:456",
    "reason": "Matches this color in design system"
  }
}
```

**Why:** User's non-negotiable standard - always use design tokens.

### Recommendation 8: Research-Driven Tool Development

**Before implementing any tool:**
1. Read Figma Plugin API docs
2. Check existing case studies for patterns
3. Verify Figma API capabilities
4. Test with real Figma data
5. Document findings

**Why:** User requires research before implementation to avoid mistakes.

---

## References

### Case Studies (Required Reading)
- `case-studies/add-variant-tool-implementation.md` - Workflow tool design
- `case-studies/chip-component-creation.md` - AI composition pattern
- `case-studies/about-section-rapid-iteration.md` - Check → Act → Verify

### Related Documents
- `DECISIONS.md` - Historical design decisions
- `MCP-VS-REST-ANALYSIS.md` - Why MCP is AI-native
- `README.md` - Tool catalog and usage

---

## Changelog

**2024-12-27 (Evening):** Enhanced with User Layer Analysis
- Added "Understanding the User's Layer" section based on 1000+ message analysis
- Extracted user's critical meta-principle: "The Right Layer of Abstraction"
- Documented user's natural language patterns and communication style
- Added user's quality standards (research-first, iterative, visual validation)
- Included 8 practical recommendations for applying user insights
- Total: 2 AI agents analyzed conversation history to extract patterns

**2024-12-27 (Afternoon):** Initial philosophy document created
- Based on 9 case studies
- Captures patterns from clone_node, reorder_children, add_variant_to_component_set decisions
- Established decision framework for future tools
