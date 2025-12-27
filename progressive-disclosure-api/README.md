# Progressive Disclosure API

> Layered information architecture for Figma design system auditing and component analysis

## Problem

When analyzing Figma designs, you need different levels of detail at different times:
- **Design System Context** - What variables, styles, and tokens exist?
- **Visual Overview** - What does this screen look like?
- **Component Structure** - What components are used and where?
- **Deep Details** - How is this specific element built? What's bound to what?

Fetching everything upfront is slow and overwhelming. This API provides **progressive disclosure** - get exactly what you need, when you need it.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Layer 0: DESIGN SYSTEM (Meta-Level, File-Wide)         │
│ • All variables (Primitives + Tokens)                  │
│ • All text styles                                       │
│ • All paint styles, effect styles                      │
│ → Provides CONTEXT for understanding bindings          │
└─────────────────────────────────────────────────────────┘
              ↓ (run once, cache)
┌─────────────────────────────────────────────────────────┐
│ Layer 1: VISUAL (Screen/Node Level)                    │
│ • Screenshot (PNG)                                      │
│ → Quick visual understanding                           │
└─────────────────────────────────────────────────────────┘
              ↓ (provides visual context)
┌─────────────────────────────────────────────────────────┐
│ Layer 2: STRUCTURAL (Screen/Node Level)                │
│ • Component map with IDs                               │
│ • Full hierarchy tree                                   │
│ → Navigate structure, get IDs for drilling down        │
└─────────────────────────────────────────────────────────┘
              ↓ (provides node IDs)
┌─────────────────────────────────────────────────────────┐
│ Layer 3: DETAILED (Node Level)                         │
│ • Properties, dimensions, layout                       │
│ • Variable bindings (references Layer 0 variables)     │
│ • Appearance (fills, strokes, effects)                 │
│ → Understand exact implementation                      │
└─────────────────────────────────────────────────────────┘
```

## Key Insight

**Bindings in Layer 3 reference variables from Layer 0.**

Example:
- Layer 0 shows: `Fills/card-background` → `Colors/White` (Light) / `Colors/Eerie Black` (Dark)
- Layer 3 shows: Node `146:4867` has fill bound to `Fills/card-background`
- You need BOTH layers to understand: "This card is white in light mode, dark gray in dark mode"

## Documentation

📖 **[MCP Server Tool Design Philosophy](./mcp-server/TOOL-DESIGN-PHILOSOPHY.md)** - Essential reading for understanding tool design decisions

**Architecture Docs:**
- [MCP vs REST Analysis](./MCP-VS-REST-ANALYSIS.md) - Why MCP is AI-native
- [SSE Architecture](./SSE-ARCHITECTURE.md) - Streaming implementation details
- [Decisions Log](./DECISIONS.md) - Historical design decisions

**Case Studies:**
- See [case-studies/](../case-studies/) for real-world implementation examples

---

## Quick Start

```javascript
// 1. Get design system context (run once, cache)
const designSystem = await getDesignSystemAudit();
// Returns: All variables, text styles, paint styles, effect styles

// 2. Get visual overview
const screenshot = await getScreenshot('146:4867');
// Returns: { path: '/tmp/help-screen.png', width: 393, height: 852 }

// 3. Get component structure
const componentMap = await getComponentMap('146:4867');
// Returns: Tree with all components and their IDs

// 4. Get specific node details
const nodeDetails = await getNodeDetails('146:4876');
// Returns: { bindings: { fills: ['Fills/card-background'] }, ... }

// 5. Resolve binding using Layer 0 context
const variable = designSystem.variables.find(v => v.name === 'Fills/card-background');
// Now you know what the fill actually is
```

## API Reference

| Layer | Function | Input | Returns | Use Case |
|-------|----------|-------|---------|----------|
| **0. Design System** | `getDesignSystemAudit()` | - | All variables, styles | What tokens exist? |
| **1. Visual** | `getScreenshot(nodeId)` | Node ID | PNG image + metadata | What does it look like? |
| **2. Structural** | `getComponentMap(nodeId)` | Node ID | Tree with IDs | What components are here? |
| **3. Detailed** | `getNodeDetails(nodeId)` | Node ID | Properties + bindings | How is it built? |

## Examples

Working code examples in `/examples/`:

- **`00-design-system-audit.js`** - Layer 0: Get all variables and styles
- **`01-visual-layer.js`** - Layer 1: Take screenshots
- **`02-structural-layer.js`** - Layer 2: Generate component maps with IDs
- **`03-detailed-layer.js`** - Layer 3: Extract node properties and bindings
- **`04-complete-workflow.js`** - All layers together in a real scenario

**Important:** Run examples from the parent directory (figmatic):
```bash
# From /Users/kasa/Downloads/Projects/figmatic/
node progressive-disclosure-api/examples/00-design-system-audit.js
node progressive-disclosure-api/examples/01-visual-layer.js
# etc.
```

## Common Workflows

### Workflow 1: Understand a Screen
```javascript
// Step 1: Visual scan
const screenshot = await getScreenshot('146:4867');

// Step 2: See structure
const map = await getComponentMap('146:4867');
// Look at the tree, find interesting nodes

// Step 3: Dive into specific component
const details = await getNodeDetails('146:4876'); // Title text
// See: bound to Text/text-primary variable
```

### Workflow 2: Audit Variable Usage
```javascript
// Step 1: Get all variables
const ds = await getDesignSystemAudit();
const targetVar = 'Fills/card-background';

// Step 2: Get screen structure
const map = await getComponentMap('146:4867');

// Step 3: Check each node for bindings
const nodes = getAllNodeIds(map);
for (const nodeId of nodes) {
  const details = await getNodeDetails(nodeId);
  if (details.bindings.fills?.includes(targetVar)) {
    console.log(`${details.name} uses ${targetVar}`);
  }
}
```

### Workflow 3: Extract Design Tokens
```javascript
// Step 1: Get design system
const ds = await getDesignSystemAudit();

// Step 2: Export to code
const tokens = convertToCodeTokens(ds);
// Generate: tokens.js, tokens.css, tokens.json
```

## Design Decisions

See `DECISIONS.md` for architectural choices and rationale.

## File Structure

```
progressive-disclosure-api/
├── README.md                          # This file
├── examples/
│   ├── 00-design-system-audit.js     # Layer 0
│   ├── 01-visual-layer.js            # Layer 1
│   ├── 02-structural-layer.js        # Layer 2
│   ├── 03-detailed-layer.js          # Layer 3
│   ├── 04-complete-workflow.js       # End-to-end
│   └── lib/
│       └── api.js                    # Reusable API helpers
└── DECISIONS.md                       # Architecture decision log
```

## Principles

1. **Progressive Disclosure** - Start broad, drill down as needed
2. **Executable Examples** - Code IS the documentation
3. **Single Source of Truth** - One README, working examples
4. **Hypermedia Navigation** - Each layer provides IDs for next layer
5. **Context Preservation** - Layer 0 gives meaning to Layer 3 bindings

---

**Next Steps:**
1. Run `examples/00-design-system-audit.js` to cache design system context
2. Run `examples/04-complete-workflow.js` to see all layers working together
3. Explore individual layer examples to understand each API
