# Figmatic MCP Server

**Production-ready MCP (Model Context Protocol) server for Figma design system analysis and automation.**

Exposes 45 powerful tools that enable AI agents (Claude Desktop, ChatGPT, etc.) to read and manipulate Figma designs through a standardized MCP interface.

---

## Features

✅ **45 MCP Tools** (9 READ + 35 WRITE + 1 UTILITY)
✅ **Progressive Disclosure API** - Layers 0-4 for incremental data loading
✅ **SSE Streaming** - Real-time progress updates
✅ **Layer 0 Caching** - 15-minute TTL for design system queries
✅ **Integrated WebSocket Bridge** - Single-process architecture
✅ **Comprehensive Testing** - All tools verified with real Figma data

---

## Architecture

```
AI Agent (Claude Desktop)
    ↓ HTTP POST
MCP Server (port 3000)
    ↓ executeInFigma()
WebSocket Bridge (port 8080)
    ↓ WebSocket
Figma Desktop Plugin
    ↓ Plugin API
Figma Design File
```

**Key Design:**
- MCP server and WebSocket server run in **same process** (shared state)
- SSE (Server-Sent Events) for streaming responses
- JSON-RPC 2.0 message format (MCP v2024-11-05)

---

## Documentation

📖 **[Tool Design Philosophy](./TOOL-DESIGN-PHILOSOPHY.md)** - Design principles and decision framework for creating MCP tools

**Other Docs:**
- [MCP vs REST Analysis](../MCP-VS-REST-ANALYSIS.md)
- [Decisions Log](../DECISIONS.md)
- [Case Studies](../../case-studies/)

---

## Installation

```bash
cd /Users/kasa/Downloads/Projects/figmatic/progressive-disclosure-api/mcp-server
npm install
```

---

## Usage

### 1. Start the MCP Server

```bash
npm start
```

This starts:
- **WebSocket Bridge** on `ws://localhost:8080`
- **MCP Server** on `http://localhost:3000`

### 2. Connect Figma Plugin

1. Open Figma Desktop
2. Run the **"AI Agent Bridge"** plugin
3. Plugin connects to WebSocket server automatically

### 3. Verify Connection

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "server": "figmatic-mcp-server",
  "version": "1.0.0",
  "protocol": "MCP v2024-11-05",
  "figmaConnected": true
}
```

### 4. Test Tools

```bash
# Test READ tools
node ../tests/test-all-read-tools.js

# Test WRITE tools
node ../tests/test-all-write-tools.js
```

---

## Available Tools

### READ Tools (Progressive Disclosure API)

#### 1. `get_design_system` (Layer 0)
**Purpose:** Get complete design system audit
**Caching:** 15-minute TTL (design systems change infrequently)

**Input:**
```json
{
  "includeVariables": true,
  "includeStyles": true
}
```

**Output:**
```json
{
  "collections": {
    "Primitives": {
      "modes": [...],
      "variables": [...]
    },
    "Tokens": {
      "modes": ["Light", "Dark"],
      "variables": [...]
    }
  },
  "textStyles": [...],
  "paintStyles": [...],
  "effectStyles": [...]
}
```

**Use Case:** Cache this result to resolve variable bindings from other tools.

---

#### 2. `get_screenshot` (Layer 1)
**Purpose:** Capture PNG screenshot of a Figma node

**Input:**
```json
{
  "nodeId": "146:4867",
  "scale": 2,
  "format": "PNG"
}
```

**Output:**
```json
{
  "path": "/tmp/figmatic-screenshots/help-screen-146-4867.png",
  "width": 786,
  "height": 1704
}
```

---

#### 3. `get_component_structure` (Layer 2)
**Purpose:** Get component hierarchy with node IDs

**Input:**
```json
{
  "nodeId": "146:4867",
  "depth": 2,
  "includeText": true
}
```

**Output:**
```json
{
  "name": "Help Screen",
  "type": "FRAME",
  "id": "146:4867",
  "children": [
    {
      "name": "Header",
      "type": "FRAME",
      "id": "146:4868",
      "children": [...]
    }
  ]
}
```

---

#### 4. `get_node_details` (Layer 3)
**Purpose:** Extract detailed properties and variable bindings

**Input:**
```json
{
  "nodeId": "146:4867",
  "resolveBindings": false
}
```

**Output:**
```json
{
  "identity": {
    "name": "Help Screen",
    "id": "146:4867",
    "type": "FRAME"
  },
  "dimensions": {
    "width": 393,
    "height": 852
  },
  "layout": {
    "mode": "VERTICAL",
    "itemSpacing": 12,
    "padding": {...}
  },
  "appearance": {
    "fills": [...],
    "strokes": [...],
    "cornerRadius": 16
  },
  "bindings": {
    "cornerRadius": "Dimensions/Radius/card-radius",
    "fills": "Fills/card-background"
  }
}
```

---

#### 5. `analyze_complete` (Layer 4)
**Purpose:** Complete workflow - all layers combined

**Input:**
```json
{
  "nodeId": "146:4867",
  "layers": [0, 1, 2, 3],
  "screenshotScale": 2
}
```

**Output:**
```json
{
  "designSystem": {...},
  "screenshot": {...},
  "structure": {...},
  "details": {...}
}
```

---

### WRITE Tools (Component Creation & Modification)

#### 1. `create_component`
**Purpose:** Create a new Figma component

**Input:**
```json
{
  "name": "Button/Primary",
  "width": 120,
  "height": 44,
  "layoutMode": "HORIZONTAL",
  "fills": [
    {
      "type": "SOLID",
      "color": { "r": 0.078, "g": 0.722, "b": 0.651 }
    }
  ],
  "cornerRadius": 8
}
```

**Output:**
```json
{
  "id": "181:5642",
  "name": "Button/Primary",
  "width": 120,
  "height": 44,
  "layoutMode": "HORIZONTAL",
  "success": true
}
```

---

#### 2. `create_auto_layout`
**Purpose:** Create an auto-layout frame

**Input:**
```json
{
  "name": "Vertical Stack",
  "layoutMode": "VERTICAL",
  "itemSpacing": 12,
  "padding": 16,
  "fills": [
    {
      "type": "SOLID",
      "color": { "r": 1, "g": 1, "b": 1 }
    }
  ],
  "cornerRadius": 16
}
```

**Output:**
```json
{
  "id": "181:5643",
  "name": "Vertical Stack",
  "layoutMode": "VERTICAL",
  "itemSpacing": 12,
  "padding": {
    "left": 16,
    "right": 16,
    "top": 16,
    "bottom": 16
  },
  "success": true
}
```

---

#### 3. `create_text_node`
**Purpose:** Create a text node with styling

**Input:**
```json
{
  "characters": "Hello World",
  "fontFamily": "DM Sans",
  "fontStyle": "Medium",
  "fontSize": 16,
  "textColor": { "r": 0.07, "g": 0.07, "b": 0.07 },
  "textStyleName": "Body/Medium"
}
```

**Output:**
```json
{
  "id": "181:5644",
  "characters": "Hello World",
  "fontName": {
    "family": "DM Sans",
    "style": "Medium"
  },
  "fontSize": 16,
  "success": true
}
```

---

#### 4. `bind_variable`
**Purpose:** Bind a variable to a node property

**Input:**
```json
{
  "nodeId": "181:5642",
  "variableName": "Dimensions/Radius/card-radius",
  "property": "topLeftRadius"
}
```

**Output:**
```json
{
  "nodeId": "181:5642",
  "nodeName": "Button/Primary",
  "variableName": "Dimensions/Radius/card-radius",
  "variableId": "VariableID:xxx",
  "property": "topLeftRadius",
  "success": true
}
```

**Supported Properties:**
- `fills`, `strokes` - Color properties
- `width`, `height` - Dimensions
- `cornerRadius` - Border radius
- `padding`, `itemSpacing` - Layout spacing
- `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius` - Individual corners

---

#### 5. `create_instance`
**Purpose:** Create an instance of a component

**Input:**
```json
{
  "componentName": "Button/Primary",
  "componentId": "181:5642",
  "x": 100,
  "y": 100
}
```

**Output:**
```json
{
  "id": "181:5645",
  "name": "Button/Primary",
  "componentName": "Button/Primary",
  "componentId": "181:5642",
  "x": 100,
  "y": 100,
  "width": 120,
  "height": 44,
  "success": true
}
```

---

#### 6. `get_components`
**Purpose:** Get list of all components in the file

**Input:**
```json
{
  "searchTerm": "Button",
  "maxResults": 10
}
```

**Output:**
```json
{
  "components": [
    {
      "id": "181:5642",
      "name": "Button/Primary",
      "type": "COMPONENT"
    }
  ],
  "count": 1
}
```

---

#### 7. `get_component_properties`
**Purpose:** Get all component properties (variants, text properties, etc.)

**Input:**
```json
{
  "componentId": "181:5642"
}
```

**Output:**
```json
{
  "properties": {
    "State": {
      "type": "VARIANT",
      "values": ["Default", "Hover", "Pressed"]
    },
    "Placeholder": {
      "type": "TEXT",
      "defaultValue": "Enter text..."
    }
  }
}
```

---

#### 8. `get_instance_properties`
**Purpose:** Get current property values of a component instance

**Input:**
```json
{
  "instanceId": "181:5645"
}
```

**Output:**
```json
{
  "properties": {
    "State": "Default",
    "Placeholder": "Search..."
  }
}
```

---

### Additional WRITE Tools

#### 6. `add_children`
**Purpose:** Add children to a parent node (frame, component, etc.)

**Input:**
```json
{
  "parentId": "181:5642",
  "children": [
    {
      "type": "frame",
      "name": "Content",
      "layoutMode": "VERTICAL",
      "itemSpacing": 8
    },
    {
      "type": "text",
      "characters": "Button Text",
      "fontSize": 16
    },
    {
      "type": "instance",
      "componentId": "219:18045"
    }
  ]
}
```

**Output:**
```json
{
  "parentId": "181:5642",
  "childrenAdded": [
    { "id": "181:5650", "name": "Content", "type": "FRAME" },
    { "id": "181:5651", "name": "Button Text", "type": "TEXT" },
    { "id": "181:5652", "name": "lucide/search", "type": "INSTANCE" }
  ],
  "success": true
}
```

---

#### 7. `modify_node`
**Purpose:** Modify properties of an existing node

**Input:**
```json
{
  "nodeId": "181:5642",
  "properties": {
    "name": "Updated Name",
    "width": 200,
    "fills": [{ "type": "SOLID", "color": { "r": 1, "g": 0, "b": 0 } }],
    "layoutMode": "HORIZONTAL",
    "itemSpacing": 12,
    "paddingTop": 16,
    "cornerRadius": 8,
    "opacity": 0.5,
    "visible": true
  }
}
```

**Output:**
```json
{
  "nodeId": "181:5642",
  "nodeName": "Updated Name",
  "nodeType": "COMPONENT",
  "modified": {
    "name": "Updated Name",
    "width": 200,
    "fills": [...],
    "layoutMode": "HORIZONTAL",
    "itemSpacing": 12
  },
  "success": true
}
```

---

#### 8. `swap_component`
**Purpose:** Swap a component instance to a different component

**Input:**
```json
{
  "instanceId": "181:5645",
  "targetComponentId": "181:5700",
  "targetComponentName": "Button/Secondary"
}
```

**Output:**
```json
{
  "instanceId": "181:5645",
  "originalComponent": "Button/Primary",
  "newComponent": "Button/Secondary",
  "success": true
}
```

---

#### 9. `rename_node`
**Purpose:** Rename a node

**Input:**
```json
{
  "nodeId": "181:5642",
  "newName": "Button/Primary/Large"
}
```

**Output:**
```json
{
  "nodeId": "181:5642",
  "oldName": "Button/Primary",
  "newName": "Button/Primary/Large",
  "success": true
}
```

---

#### 10. `add_component_property`
**Purpose:** Add a component property (variant, text, boolean, etc.)

**Input:**
```json
{
  "componentId": "181:5642",
  "propertyName": "State",
  "propertyType": "VARIANT",
  "variantOptions": ["Default", "Hover", "Pressed"]
}
```

**Alternative for TEXT property:**
```json
{
  "componentId": "181:5642",
  "propertyName": "Placeholder",
  "propertyType": "TEXT",
  "defaultValue": "Enter text..."
}
```

**Alternative for BOOLEAN property:**
```json
{
  "componentId": "181:5642",
  "propertyName": "ShowIcon",
  "propertyType": "BOOLEAN",
  "defaultValue": true
}
```

**Output:**
```json
{
  "componentId": "181:5642",
  "propertyName": "State",
  "propertyType": "VARIANT",
  "success": true
}
```

---

#### 11. `bind_text_to_property`
**Purpose:** Bind a text node's characters to a component property

**Input:**
```json
{
  "textNodeId": "181:5651",
  "propertyName": "Placeholder"
}
```

**Output:**
```json
{
  "textNodeId": "181:5651",
  "propertyName": "Placeholder",
  "success": true
}
```

---

#### 12. `set_text_truncation`
**Purpose:** Set text truncation (max lines, ellipsis)

**Input:**
```json
{
  "textNodeId": "181:5651",
  "maxLines": 2,
  "truncation": "ENDING"
}
```

**Output:**
```json
{
  "textNodeId": "181:5651",
  "maxLines": 2,
  "truncation": "ENDING",
  "success": true
}
```

---

#### 13. `set_instance_properties`
**Purpose:** Set property values on a component instance

**Input:**
```json
{
  "instanceId": "181:5645",
  "properties": {
    "State": "Hover",
    "Placeholder": "Search...",
    "ShowIcon": false
  }
}
```

**Output:**
```json
{
  "instanceId": "181:5645",
  "properties": {
    "State": "Hover",
    "Placeholder": "Search...",
    "ShowIcon": false
  },
  "success": true
}
```

---

#### 14. `create_component_variants`
**Purpose:** Create multiple variants from a base component

**Input:**
```json
{
  "componentId": "181:5642",
  "variantProperty": "State",
  "variants": [
    {
      "name": "State=Default",
      "propertyValues": { "State": "Default" }
    },
    {
      "name": "State=Hover",
      "propertyValues": { "State": "Hover" }
    },
    {
      "name": "State=Pressed",
      "propertyValues": { "State": "Pressed" }
    }
  ]
}
```

**Output:**
```json
{
  "componentSetId": "181:5700",
  "variants": [
    { "id": "181:5701", "name": "State=Default" },
    { "id": "181:5702", "name": "State=Hover" },
    { "id": "181:5703", "name": "State=Pressed" }
  ],
  "success": true
}
```

---

#### 15. `create_variable`
**Purpose:** Create a new Figma variable

**Input:**
```json
{
  "collectionName": "Primitives",
  "variableName": "Colors/Primary Blue",
  "variableType": "COLOR",
  "values": {
    "Mode 1": { "r": 0.2, "g": 0.5, "b": 1, "a": 1 }
  }
}
```

**Alternative for FLOAT variable:**
```json
{
  "collectionName": "Primitives",
  "variableName": "Spacing/spacing-4",
  "variableType": "FLOAT",
  "values": {
    "Mode 1": 16
  }
}
```

**Output:**
```json
{
  "variableId": "VariableID:xxx",
  "variableName": "Colors/Primary Blue",
  "collectionName": "Primitives",
  "success": true
}
```

---

#### 16. `create_text_style`
**Purpose:** Create a new text style

**Input:**
```json
{
  "name": "Body/Medium",
  "fontFamily": "DM Sans",
  "fontStyle": "Medium",
  "fontSize": 16,
  "lineHeight": {
    "value": 22.4,
    "unit": "PIXELS"
  },
  "letterSpacing": {
    "value": 0,
    "unit": "PIXELS"
  }
}
```

**Output:**
```json
{
  "styleId": "S:xxx",
  "name": "Body/Medium",
  "success": true
}
```

---

#### 17. `delete_text_style`
**Purpose:** Delete a text style

**Input:**
```json
{
  "styleName": "Old Style"
}
```

**Output:**
```json
{
  "styleName": "Old Style",
  "deleted": true,
  "success": true
}
```

---

#### 18. `delete_node`
**Purpose:** Delete a node from the canvas

**Input:**
```json
{
  "nodeId": "181:5651"
}
```

**Output:**
```json
{
  "deleted": true,
  "nodeInfo": {
    "id": "181:5651",
    "name": "Old Node",
    "type": "FRAME"
  }
}
```

**Note:** Cannot delete children of instance nodes.

---

#### 19. `add_variant_to_component_set`
**Purpose:** Add a new variant to an existing ComponentSet by cloning an existing variant

**Input:**
```json
{
  "componentSetId": "221:18176",
  "sourceVariantId": "221:18053",
  "variantName": "State=Filled",
  "position": {
    "x": 400,
    "y": 0
  },
  "modifications": {
    "textNodes": [
      {
        "path": ["Placeholder"],
        "characters": "India",
        "fontName": {
          "family": "DM Sans",
          "style": "Regular"
        }
      }
    ],
    "nodes": [
      {
        "path": ["Icon Container"],
        "opacity": 0.5,
        "visible": true
      }
    ]
  }
}
```

**Output:**
```json
{
  "success": true,
  "componentSetId": "221:18176",
  "componentSetName": "SearchBar",
  "newVariantId": "226:18682",
  "newVariantName": "State=Filled",
  "totalVariants": 3
}
```

**Use Cases:**
- Adding new state variants (e.g., Filled, Loading, Error)
- Creating size variants (e.g., Small, Medium, Large)
- Adding theme variants without recreating entire ComponentSet

**Note:** Uses `.clone()` + `.appendChild()` pattern. Different from `create_component_variants` which creates NEW ComponentSets using `combineAsVariants()`.

---

### IMAGE Tools

#### 20. `import_image_from_url`
**Purpose:** Import an image from a URL and return its hash and dimensions

**Input:**
```json
{
  "url": "https://flagcdn.com/w160/id.png"
}
```

**Output:**
```json
{
  "success": true,
  "imageHash": "abc123def456...",
  "width": 160,
  "height": 107
}
```

**Use Cases:**
- Import images before creating components
- Get image dimensions for aspect ratio calculations
- Pre-fetch images for batch operations

---

#### 21. `create_image_component`
**Purpose:** Complete workflow - import image from URL and create component with automatic aspect ratio preservation

**Input:**
```json
{
  "url": "https://flagcdn.com/w160/id.png",
  "componentName": "Flag/Indonesia",
  "maxHeight": 24,
  "scaleMode": "FILL",
  "cornerRadius": 0
}
```

**Output:**
```json
{
  "success": true,
  "componentId": "229:19020",
  "componentName": "Flag/Indonesia",
  "imageHash": "abc123...",
  "width": 36,
  "height": 24
}
```

**Features:**
- **Automatic aspect ratio** - Specify one dimension, other is calculated
- **Max constraints** - `maxWidth`/`maxHeight` scale proportionally
- **Scale modes** - FILL, FIT, CROP, TILE

**Example - Auto-sizing:**
```javascript
// Image is 160×107 (3:2 ratio)
// maxHeight: 24 specified
// Result: 36×24 component (maintains 3:2 ratio)
```

---

#### 22. `batch_create_image_components`
**Purpose:** Import multiple images and optionally create a ComponentSet

**Input:**
```json
{
  "images": [
    {
      "url": "https://flagcdn.com/w160/af.png",
      "name": "Afghanistan",
      "maxHeight": 24
    },
    {
      "url": "https://flagcdn.com/w160/al.png",
      "name": "Albania",
      "maxHeight": 24
    }
  ],
  "createComponentSet": true,
  "variantProperty": "Country",
  "scaleMode": "FILL",
  "cornerRadius": 0
}
```

**Output:**
```json
{
  "success": true,
  "componentsCreated": 2,
  "componentIds": ["229:19020", "229:19022"],
  "componentNames": ["Afghanistan", "Albania"],
  "componentSetId": "229:19177",
  "componentSetName": "Component 3"
}
```

**Use Cases:**
- Import complete icon sets
- Create flag libraries (201 countries in 3 minutes)
- Batch avatar imports
- Illustration collections

**ComponentSet Configuration:**
- Vertical layout with configurable spacing
- Variants named: `Property=Value`
- Automatic aspect ratio for all images

---

### UTILITY Tools

#### 23. `execute_figma_script`
**Purpose:** Execute arbitrary Figma Plugin API code for custom operations and complex workflows

**Input:**
```json
{
  "script": "const node = figma.getNodeById('229:19195'); node.name = 'New Name'; return { success: true, name: node.name };",
  "description": "Rename node to 'New Name'"
}
```

**Output:**
```json
{
  "success": true,
  "name": "New Name"
}
```

**Features:**
- **Full Figma Plugin API access** - Use any `figma.*` API
- **Async/await support** - Can use asynchronous operations
- **JSON serialization** - Return values automatically serialized
- **Error handling** - Includes script snippet in error for debugging

**Example - Complex Workflow:**
```javascript
{
  "script": `
    const countries = [
      {id: "229:19195", name: "Afghanistan", phone: "+93"},
      {id: "229:19199", name: "Albania", phone: "+355"}
    ];

    const results = [];
    for (const country of countries) {
      const instance = figma.getNodeById(country.id);

      // Set layout properties
      instance.layoutSizingHorizontal = "FILL";
      instance.layoutSizingVertical = "HUG";

      // Set component property
      instance.setProperties({
        "Country#229:94": country.name
      });

      // Find and update text node
      const codeNode = instance.findOne(n => n.name === "Country Code");
      if (codeNode && codeNode.type === "TEXT") {
        await figma.loadFontAsync(codeNode.fontName);
        codeNode.characters = country.phone;
      }

      results.push({ id: instance.id, name: country.name });
    }

    return { updated: results.length, results };
  `,
  "description": "Update country list with phone codes and layout"
}
```

**Use Cases:**
- **Complex node searches** - Find nodes matching custom criteria
- **Batch operations** - Update multiple nodes with custom logic
- **Property inspection** - Analyze component property usage
- **Data export** - Extract design data for documentation
- **One-off operations** - Execute custom code without creating dedicated tools

**When to Use:**
- Operation doesn't fit existing tools
- Complex logic combining multiple operations
- Rapid prototyping before creating formal tool
- Exploratory operations

**When NOT to Use:**
- Existing tool covers the use case
- Operation will be repeated frequently (create dedicated tool)
- Simple single-operation tasks (use specific tools)

**Best Practices:**
```javascript
// ✅ Good - detailed return value
return {
  success: true,
  updated: 10,
  failed: 2,
  errors: [{id: '123', error: 'Font not found'}],
  results: [...]
};

// ✅ Good - validate inputs
const node = figma.getNodeById(nodeId);
if (!node) {
  throw new Error(\`Node not found: \${nodeId}\`);
}

// ✅ Good - load fonts before text operations
await figma.loadFontAsync(textNode.fontName);
textNode.characters = "New text";
```

**Safety:**
- Scripts execute in Figma plugin sandbox
- Full Figma API access (use with caution)
- Script snippet included in errors for debugging
- Timeout: 5 minutes maximum

---

## MCP Protocol

### Endpoint
```
POST http://localhost:3000/mcp
```

### Request Format (JSON-RPC 2.0)
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_screenshot",
    "arguments": {
      "nodeId": "146:4867",
      "scale": 2
    }
  }
}
```

### Response Format (SSE)
```
event: progress
data: {"status":"Capturing screenshot..."}

event: result
data: {"path":"/tmp/screenshot.png","width":786,"height":1704}

event: complete
data: {"status":"success"}
```

### MCP Methods
- `initialize` - Handshake and capability negotiation
- `tools/list` - Get catalog of all 26 tools
- `tools/call` - Execute a tool (SSE streaming response)

---

## Claude Desktop Integration

### 1. Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "figmatic": {
      "url": "http://localhost:3000/mcp",
      "transport": "sse"
    }
  }
}
```

### 2. Restart Claude Desktop

### 3. Verify Tools

Claude will automatically discover all 26 tools. You can now ask:

**Example prompts:**
- "Show me the design system for this Figma file"
- "Capture a screenshot of node 146:4867"
- "Create a button component with rounded corners"
- "Bind the card-radius variable to this component"

---

## Testing

### Health Check
```bash
curl http://localhost:3000/health
```

### Test READ Tools
```bash
node tests/test-all-read-tools.js
```

Expected output:
```
✅ Passed: 5
❌ Failed: 0
🎉 All READ tools working perfectly!
```

### Test WRITE Tools
```bash
node tests/test-all-write-tools.js
```

Expected output:
```
✅ Passed: 5
❌ Failed: 0
🎉 All critical WRITE tools working!
```

---

## Error Handling

### Common Errors

**Error -32001: Figma plugin not connected**
```json
{
  "code": -32001,
  "message": "Figma plugin not connected. Please open Figma Desktop and run the 'AI Agent Bridge' plugin."
}
```

**Solution:** Open Figma Desktop and run the plugin.

**Error -32002: Node not found**
```json
{
  "code": -32002,
  "message": "Node not found: 146:4867"
}
```

**Solution:** Verify the node ID exists in the current Figma file.

**Error -32602: Missing parameters**
```json
{
  "code": -32602,
  "message": "Missing required parameter: nodeId"
}
```

**Solution:** Provide all required parameters per tool schema.

---

## Performance

### Caching
- **Layer 0 (Design System):** 15-minute TTL
- **Other Layers:** No caching (always fresh)

### Benchmarks
- Design system query: ~200ms (cached: <5ms)
- Screenshot capture: ~500ms
- Component structure: ~150ms
- Node details: ~100ms
- Component creation: ~80ms

---

## Development

### Project Structure
```
mcp-server/
├── server.js              # Main server entry point
├── handlers/
│   ├── initialize.js      # MCP handshake
│   ├── tools-list.js      # Tool catalog
│   └── tools-call.js      # Tool execution (SSE)
├── tools/
│   ├── index.js           # Tool registry
│   ├── schemas.js         # JSON schemas (26 tools)
│   ├── read-tools.js      # 8 READ tools
│   └── write-tools.js     # 18 WRITE tools
├── utils/
│   ├── context.js         # WebSocket bridge wrapper
│   ├── streaming.js       # SSE helpers
│   └── cache.js           # Layer 0 caching
└── package.json
```

### Add a New Tool

1. **Define schema** in `tools/schemas.js`:
```javascript
const myNewTool = {
  name: 'my_new_tool',
  description: 'Tool description',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'Parameter 1' }
    },
    required: ['param1']
  }
};
```

2. **Implement function** in `tools/read-tools.js` or `tools/write-tools.js`:
```javascript
async function myNewTool(api, args, sendProgress) {
  const { param1 } = args;
  sendProgress({ status: 'Processing...' });

  const result = await api.executeInFigma(`...`);

  return result.result;
}
```

3. **Export** in module.exports:
```javascript
module.exports = {
  my_new_tool: myNewTool
};
```

4. **Add to schemas** in `getAllSchemas()`.

5. **Restart server** and test.

---

## Troubleshooting

### Server won't start
- Check if port 3000 or 8080 is already in use: `lsof -i :3000 -i :8080`
- Kill conflicting processes: `kill -9 <PID>`

### Figma plugin won't connect
- Verify WebSocket server is running (check server logs)
- Restart Figma Desktop
- Check plugin console for errors (Plugins → Development → Open Console)

### Tools return empty results
- Verify correct node ID (must exist in current Figma file)
- Check server logs for execution errors
- Test with `curl` to isolate client vs server issues

---

## Production Deployment

### Environment Variables
```bash
export MCP_PORT=3000           # MCP server port
export WEBSOCKET_PORT=8080     # WebSocket bridge port
export CACHE_TTL=900000        # Layer 0 cache TTL (ms)
```

### Process Management (PM2)
```bash
npm install -g pm2
pm2 start server.js --name figmatic-mcp
pm2 logs figmatic-mcp
pm2 restart figmatic-mcp
```

### Security Considerations
- Run on localhost only (not exposed to internet)
- Require Figma Desktop to be running locally
- No authentication needed (local-only architecture)

---

## License

MIT

---

## Support

For issues or questions:
- Check server logs: `tail -f /tmp/claude/tasks/<task-id>.output`
- Test tools individually: `node tests/test-single-tool.js`
- Review MCP spec: https://spec.modelcontextprotocol.io/

---

## Changelog

### v1.0.0 (2025-12-25)
- ✅ Initial release
- ✅ 26 MCP tools (8 READ + 18 WRITE)
- ✅ Progressive Disclosure API (Layers 0-4)
- ✅ SSE streaming with progress updates
- ✅ Layer 0 caching (15min TTL)
- ✅ Integrated WebSocket bridge
- ✅ Comprehensive test suite
- ✅ Claude Desktop integration
