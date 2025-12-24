# Changelog

All notable changes to the Figma AI Agent Bridge project.

## [Unreleased]

### Planned
- Unit test suite
- More shape primitives (ellipse, polygon, star, vector)
- Design system automation workflows
- Export API implementation (screenshot API wrapper functions)

---

## [1.3.0] - 2024-12-24 - SCREENSHOT & EXPORT API 📸

### ✨ Research Completed

**Question:** Can we take screenshots of components/frames/nodes by ID?
**Answer:** ✅ **YES** - Figma Plugin API provides complete screenshot/export capabilities

### 🔍 API Discovery

**exportAsync() Method:**
- Works on **35+ node types**: COMPONENT, COMPONENT_SET, INSTANCE, FRAME, GROUP, RECTANGLE, TEXT, PAGE, etc.
- Returns `Promise<Uint8Array>` for images, `Promise<string>` for SVG, `Promise<Object>` for JSON
- Fully async - must be awaited
- Can export by node ID using `figma.getNodeById(id)`

**Supported Export Formats:**
```javascript
// Image formats (Uint8Array)
node.exportAsync({ format: 'PNG' })    // Lossless, supports transparency
node.exportAsync({ format: 'JPG' })    // Lossy, smaller file size

// Vector format (string)
node.exportAsync({ format: 'SVG_STRING' })  // SVG markup as text

// Document format (Uint8Array)
node.exportAsync({ format: 'PDF' })    // Print-ready

// Data format (Object)
node.exportAsync({ format: 'JSON_REST_V1' })  // REST API response equivalent
```

**Constraint Types:**
```javascript
// Proportional scaling (retina displays)
{ type: 'SCALE', value: 2 }    // 2x resolution (200%)
{ type: 'SCALE', value: 3 }    // 3x resolution (300%)

// Fixed dimensions
{ type: 'WIDTH', value: 1200 }   // 1200px wide, height scales
{ type: 'HEIGHT', value: 800 }   // 800px tall, width scales
```

### 🧪 Scripts Created

**`screenshot-component.js`** - Single component screenshot
- Screenshot component by ID or name
- Configurable format (PNG, JPG, SVG_STRING)
- Configurable scale (1x, 2x, 3x)
- Auto-saves to `~/Downloads` with timestamp
- Shows component metadata and export stats

**`screenshot-all-components.js`** - Batch component export
- Exports all components on current page
- Creates timestamped output directory
- Saves all screenshots with sanitized filenames
- Option to include/exclude COMPONENT_SETs
- Shows total components, total size, output path

### 📚 Documentation

**Added to `docs/FIGMA-API-RESEARCH.md` (450+ lines):**
- Method signatures for all three overloads
- Complete ExportSettings reference table
- All export format options (PNG, JPG, SVG, PDF, JSON)
- Constraint types (SCALE, WIDTH, HEIGHT)
- SVG-specific settings (outline text, ID attributes, stroke simplification)
- Common properties (contentsOnly, useAbsoluteBounds, colorProfile)
- 4 complete working examples:
  1. Screenshot component by ID and save
  2. Export multiple formats (PNG 1x/2x/3x, SVG, PDF)
  3. Screenshot all components in a page
  4. Export frame with fixed dimensions
- Best practices and limitations
- Memory considerations for large exports
- File size vs quality tradeoffs
- Use cases: Design systems, asset pipeline, version control, AI training

### 🎓 Key Learnings

**1. Getting Node by ID:**
```javascript
const node = figma.getNodeById('123:456');
const bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } });
```

**2. SVG Export Options:**
```javascript
// Editable SVG with IDs
const svg = await node.exportAsync({
  format: 'SVG_STRING',
  svgOutlineText: false,   // Keep text editable
  svgIdAttribute: true     // Add element IDs
});

// Pixel-perfect SVG (outlined text)
const svg = await node.exportAsync({
  format: 'SVG_STRING',
  svgOutlineText: true     // Convert text to paths
});
```

**3. Batch Export Pattern:**
```javascript
async function exportAllComponents(page, scale = 2) {
  function findComponents(node, results = []) {
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      results.push(node);
    }
    if ('children' in node) {
      for (const child of node.children) findComponents(child, results);
    }
    return results;
  }

  const components = findComponents(page);

  for (const component of components) {
    const bytes = await component.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: scale }
    });
    // Save bytes to file...
  }
}
```

**4. Dynamic Pages:**
```javascript
// For pages with dynamic access enabled
await page.loadAsync();
const bytes = await page.exportAsync();
```

### 💡 Use Cases Identified

**1. Design System Documentation:**
- Export all components as PNG thumbnails for component library
- Generate SVG assets for web usage
- Create PDF spec sheets for handoff

**2. Asset Pipeline:**
- Export icons at 1x, 2x, 3x for iOS/Android
- Generate responsive image sets
- Create favicons and app icons at multiple sizes

**3. Version Control:**
- Screenshot components for visual regression testing
- Export snapshots before/after design changes
- Generate visual diffs for PR reviews

**4. Presentation & Communication:**
- Export high-resolution PNGs for slide decks
- Create PDFs for client reviews
- Generate SVGs for interactive prototypes

**5. AI & Machine Learning:**
- Export component screenshots for computer vision training
- Generate design pattern datasets
- Create thumbnail previews for search/discovery

### 📖 References

**Official Figma Plugin API Documentation:**
- [exportAsync Method](https://developers.figma.com/docs/plugins/api/properties/nodes-exportasync/)
- [ExportSettings Types](https://developers.figma.com/docs/plugins/api/ExportSettings/)

**Web Research Sources:**
- Figma Plugin API Forum discussions
- Community plugin examples
- GitHub gists with exportAsync patterns

### ✅ Next Steps (Potential)

- Implement export API wrapper functions in `api/export.js`
- Add helper methods: `screenshotNode()`, `exportMultipleFormats()`, `batchExportComponents()`
- Create file-saving utilities for Uint8Array → filesystem
- Add base64 encoding for web transfer
- Implement progress tracking for batch exports
- Add error handling for unsupported node types

---

## [1.2.0] - 2024-12-24 - PROOF OF CONCEPT 🎯

### ✨ Practical Implementation

**Component Instance Creation with Full Integration**
- Successfully created production-ready component instance demonstration
- End-to-end workflow: discovery → introspection → creation → styling → variable binding

**What Was Built:**
```javascript
// Settings List Container
- Auto layout: VERTICAL (hugs content)
- Size: 333px × 200px
- Padding: 16px (all sides) → Spacing/spacing-4 variable ✅ BOUND
- Corner Radius: 16px → Dimensions/Radius/card-radius variable ✅ BOUND
- Fill: Glass Card Store gradient style ✅ APPLIED
- Children: 3 × SettingsListItem instances (first, middle, last variants)
```

### 🔧 Scripts Created

**Component Discovery & Introspection:**
- `list-all-components.js` - Inventory all components in file (54 found)
- `find-component.js` - Deep introspection with all properties, variants, children
  - Discovers COMPONENT_SET structure
  - Extracts component property definitions (VARIANT, TEXT, BOOLEAN types)
  - Shows layout properties, visual properties, bound variables
  - Lists all children with their properties

**Practical Implementation:**
- `create-settings-list.js` - Create auto layout with component instances
  - Find component by name (recursive search)
  - Create instances from COMPONENT_SET.defaultVariant
  - Set variant properties (order: first/middle/last)
  - Set text properties (Title, Help Text)
  - Apply paint style (Glass Card Store gradient)
  - Apply variable values (spacing-4, card-radius)

- `bind-variables-to-container.js` - Bind design tokens to properties
  - Find node by name (recursive search)
  - Bind spacing-4 to all 4 padding properties
  - Bind card-radius to all 4 corner radius properties
  - Verify bindings with getBoundVariables

### 📚 Documentation

**Case Study Created:** `docs/CASE-STUDY-Settings-List.md`
- Complete implementation walkthrough (450+ lines)
- Discovery phase: How to find components
- Implementation details: Step-by-step code and decisions
- Key learnings: Variable binding vs value setting
- Best practices: Two-phase creation pattern, error-first design
- Complexity analysis: What was hard, what was easy
- Future applications: AI-driven design, design system automation

**Key Insight Documented:**
```javascript
// ❌ Setting values (hardcoded - doesn't update with variable changes)
container.paddingLeft = 16;

// ✅ Binding variables (dynamic - updates when variable changes)
container.setBoundVariable('paddingLeft', spacingVariable);
```

**Critical Distinction:** This is the difference between applying design token VALUES vs creating true design token BINDINGS.

### 🎓 Technical Learnings

**1. COMPONENT_SET Structure:**
- Use `componentSet.defaultVariant.createInstance()` to create instances
- Component property definitions accessed via `componentPropertyDefinitions`
- Property keys include internal IDs (e.g., `Title#54:30`)

**2. Variable Binding:**
- Setting `cornerRadius` actually binds all 4 individual corner properties
- Setting `padding` binds all 4 individual padding properties
- Total: 8 bindings for what looks like 2 properties

**3. Component Property Types:**
- VARIANT: String values matching variant options
- TEXT: String values with property IDs
- BOOLEAN: true/false values with property IDs

**4. Style Application:**
- All style setters are async: `setFillStyleIdAsync()`, etc.
- Can search styles by name or use style.id directly

### ✅ Results

**Functional:**
- ✅ 100% of requirements met
- ✅ Zero manual intervention required
- ✅ Variables properly bound (not just values applied)
- ✅ Styles correctly applied
- ✅ Component variants working as expected

**Visual:**
- ✅ Perfect Glass Card gradient background
- ✅ Proper list styling with first/middle/last variants
- ✅ 16px padding creating nice spacing
- ✅ Rounded corners (16px radius)
- ✅ Three perfectly stacked settings items

**User Feedback:**
> "I'm actually thoroughly impressed. Can you make a note of this as a case study about how you did it?"

### 🔮 Implications

This proof of concept demonstrates:
1. **Design System Automation** - Programmatically create screens from component libraries
2. **AI-Driven Design** - AI can query components, understand properties, create instances
3. **Design Token Integration** - Variables bound correctly enable true theming
4. **Batch Operations** - Pattern scales to creating 10s or 100s of instances

---

## [1.1.0] - 2024-12-24 - PRIMITIVES API 🎨

### ✨ New Features

**Primitives API** (`websocket-server/api/primitives.js`)
- **Text Operations**
  - `createText(options)` - Create text nodes with full styling
    - Font loading (family, style)
    - Font size, alignment (horizontal, vertical)
    - Auto-resize modes (WIDTH_AND_HEIGHT, HEIGHT, TRUNCATE, NONE)
    - Fills, letter spacing, line height
    - Position control
  - `createStyledText(segments, options)` - Mixed text formatting
    - Range-based styling (different fonts, sizes, colors per segment)
    - Automatic font loading for all unique fonts
- **Auto Layout Operations**
  - `createAutoLayout(options)` - Complete auto layout frame support
    - Layout modes: HORIZONTAL, VERTICAL
    - Sizing modes: FIXED, AUTO (hug contents)
    - Item spacing, padding (individual or uniform)
    - Alignment: primary axis, counter axis
    - Wrapping support with counter-axis spacing
    - Visual properties: fills, corner radius
- **Shape Operations**
  - `createRectangle(options)` - Styled rectangles
    - Size, position, fills, strokes
    - Stroke weight, corner radius
    - Custom naming

### 🔥 Critical Fixes
- **Text font loading workflow**
  - Issue: Text nodes default to "Inter Regular" and require loading default font first
  - Error: "Cannot write to node with unloaded font 'Inter Regular'"
  - Solution: Load `text.fontName` (default font) before loading target font
  - Implementation: `await figma.loadFontAsync(text.fontName); await figma.loadFontAsync(targetFont);`

### 🧪 Testing
- Created comprehensive test suite `test-primitives.js`
  - Simple text creation (blue, bold, 32px)
  - Styled text with mixed formatting (bold + regular + colored)
  - Horizontal auto layout (hug contents, centered)
  - Vertical auto layout (fixed width)
  - Wrapping auto layout (horizontal wrap with spacing)
  - Styled rectangle (green with stroke)
- All 6 tests passing ✓

### 📚 Documentation
- Added Primitives API section to CLAUDE.md
  - Complete function signatures
  - All options with types and defaults
  - Example usage code
- Created `docs/FIGMA-API-RESEARCH.md`
  - Text API research and best practices
  - Auto layout properties and patterns
  - Paint types reference
- Updated Recent Changes with Primitives milestone
- Updated Error Patterns with font loading solution

### Added to API Exports
```javascript
// server.js public API
createText(options)
createStyledText(segments, options)
createAutoLayout(options)
createRectangle(options)
```

### Research References
- [Figma Text API](https://www.figma.com/plugin-docs/working-with-text/)
- [Auto Layout Properties](https://www.figma.com/plugin-docs/api/properties/nodes-layoutmode/)
- [Paint API](https://developers.figma.com/docs/plugins/api/Paint/)
- [Frame Node API](https://www.figma.com/plugin-docs/api/FrameNode/)

---

## [1.0.0] - 2024-12-24 - PRODUCTION READY 🎉

### 🏗️ Major Refactor: Modular Architecture

**Breaking Changes:**
- Server architecture completely refactored
- Old `server-old.js.backup` available for reference

**Added:**
- **Core Module** (`websocket-server/core/`)
  - `state.js` - Pure state management functions
  - `messageHandler.js` - Pure message processing functions
- **API Module** (`websocket-server/api/`)
  - `execute.js` - Script execution
  - `context.js` - Context retrieval
  - `notify.js` - Notifications and status
  - `variables.js` - Complete variables API
- **Variables API** - Research-based implementation
  - `getAllVariables()` - Extract all variables with modes, aliases, types
  - `getVariablesByType(type)` - Filter by BOOLEAN, COLOR, FLOAT, STRING
  - `getVariablesByCollection(name)` - Get specific collection
  - Handles variable aliases and multi-mode values
  - Based on official Figma API: valuesByMode, resolveForConsumer, VariableAlias
- **Export Functionality**
  - JSON export with full structured data
  - Markdown export with human-readable tables
  - Saves to ~/Downloads with timestamps
  - `export-variables-full.js` script

**Architecture Improvements:**
- Pure functions with no side effects in core/
- Dependency injection via context pattern
- API layer properly handles side effects
- Fully testable and modular
- Easy to extend with new operations

**Testing:**
- `test-variables.js` - Variables API testing
- `export-variables-full.js` - Export functionality
- All tests passing with 56 variables, 2 collections, Light/Dark modes

**Documentation:**
- Updated CLAUDE.md with complete API reference
- Added architecture diagrams
- Documented all new patterns and lessons learned
- Created CHANGELOG.md for milestone tracking

---

## [0.5.0] - 2024-12-24 - BREAKTHROUGH: eval() Solution

### Fixed
- **Critical Bug:** AsyncFunction constructor blocked by Figma's QuickJS sandbox
  - Error: "Not available" when executing scripts
  - Root cause: Figma blocks Function/AsyncFunction constructors for security
  - Solution: Use `eval()` with IIFE wrapper
  - Implementation: `eval(\`(async function() { ${script} })()\`)`

### Research
- Investigated Figma's plugin security architecture
- QuickJS sandbox restrictions documented
- eval() confirmed working in Figma environment

### Testing
- All execution tests passing
- Simple returns ✓
- Figma API access ✓
- Shape creation ✓
- Full system functional end-to-end

**References:**
- [How Figma Built Their Plugin System](https://www.figma.com/blog/how-we-built-the-figma-plugin-system/)
- [How Plugins Run](https://www.figma.com/plugin-docs/how-plugins-run/)

---

## [0.4.0] - 2024-12-24 - Core System Complete

### Added
- WebSocket server (localhost:8080)
- Figma plugin with dual-thread architecture
- UI iframe WebSocket client
- Main thread Plugin API execution
- Auto-reconnection logic
- Activity logging in plugin UI

### APIs Implemented
- `executeInFigma(script)` - Execute Plugin API code
- `getFigmaContext()` - Get page, selection, variables metadata
- `notifyFigma(message, timeout)` - Show notifications
- `isConnected()` - Check connection status
- `getStatus()` - Server statistics

### Plugin Features
- Connection status indicator (green/red/orange)
- Activity log with timestamps
- Concurrent execution prevention
- Detailed error reporting

---

## [0.3.0] - 2024-12-24 - Connection Established

### Fixed
- Manifest network permissions
- WebSocket URL must include port: `ws://localhost:8080`
- Removed invalid `capabilities` field

### Added
- Handshake protocol
- Message routing (UI ↔ Main thread)
- Request/response correlation with unique IDs
- Timeout handling (60 seconds)

---

## [0.2.0] - 2024-12-24 - Plugin Architecture

### Added
- TypeScript plugin with compilation
- Main thread (code.ts) - Plugin API access
- UI iframe (ui.html) - WebSocket client
- postMessage communication between threads
- Manifest configuration

---

## [0.1.0] - 2024-12-24 - Initial Setup

### Added
- Project structure
- WebSocket server foundation
- Basic connection handling
- Process architecture (server + plugin)

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/):
- **MAJOR** - Breaking changes to API
- **MINOR** - New features, backwards compatible
- **PATCH** - Bug fixes, backwards compatible

---

## Legend

- 🎉 Major milestone
- 🏗️ Architecture changes
- 🔥 Critical fixes
- ✨ New features
- 🐛 Bug fixes
- 📚 Documentation
- 🧪 Testing
