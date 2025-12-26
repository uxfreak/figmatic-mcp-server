# MCP Server vs REST/SSE API: Architecture Analysis

## Executive Summary

After analyzing the Figmatic codebase and researching MCP (Model Context Protocol), **MCP Server is the better long-term architecture** for this project because:

1. ✅ **Bidirectional by design** - Supports both READ and WRITE operations natively
2. ✅ **AI-native protocol** - Built specifically for AI agents (Claude, ChatGPT, etc.)
3. ✅ **Tool-based architecture** - Perfect fit for Progressive Disclosure layers as tools
4. ✅ **Native client support** - Claude Desktop, IDEs already support MCP
5. ✅ **Future-proof** - Growing ecosystem (16,000+ servers, OpenAI adopted in 2025)

**Recommendation:** Build as **MCP Server first**, add REST API later for web clients.

---

## Current Figmatic Capabilities

### READ Operations (Information Retrieval)

**From `/lib` analysis:**
```javascript
// Analysis functions (READ)
- extractBasicProps()        → Get node properties
- extractLayoutProps()        → Get auto-layout settings
- extractFills()              → Get fill colors/bindings
- extractStrokes()            → Get stroke properties
- analyzeNode()               → Complete node analysis
- createScreenshotHelper()    → Capture screenshots

// Component finding (READ)
- findComponent()             → Locate components by name
- findTextStyle()             → Locate text styles

// Variable operations (READ)
- getVariable()               → Get variable by name
- getVariables()              → Get multiple variables
- createVariableCache()       → Cache for performance
```

**Examples from scripts:**
- `audit-design-system.js` - Extract all variables, styles, effects
- `component-map.js` - Generate component hierarchy
- Progressive Disclosure Layers 0-3

### WRITE Operations (Creation/Modification)

**From `/lib` analysis:**
```javascript
// Component creation (WRITE)
- createComponentInstance()   → Instance components
- createVerticalFrame()       → Auto-layout frames
- createHorizontalFrame()     → Auto-layout frames
- createCardFrame()           → Preset card frames

// Text operations (WRITE)
- createTextWithStyle()       → Create text nodes
- createTextWithFont()        → Create text with font
- updateText()                → Modify text content
- updateInstanceText()        → Update instance text

// Bindings (WRITE)
- bindCornerRadii()           → Bind radius variables
- bindPadding()               → Bind padding variables
- bindTextColor()             → Bind text fill
- bindFillColor()             → Bind background fill
- bindStrokeColor()           → Bind stroke color
```

**Examples from scripts:**
- `create-badge-component.js` - Create badge with variants
- `create-back-button.js` - Create button components
- `create-help-screen.js` - Build complete screens
- `create-account-info-card.js` - Create card components

### Current Architecture Gap

**Problem:** Scripts execute operations but aren't exposed as an API
- ✅ Logic exists for both READ and WRITE
- ❌ No programmatic API to call these operations
- ❌ Can't be used by external AI agents
- ❌ Requires running Node.js scripts manually

---

## MCP Server Architecture

### What is MCP?

**Model Context Protocol** - Open standard by Anthropic (donated to Linux Foundation in Dec 2024) for connecting AI models to tools and data sources.

**Core Concept:** AI agents discover and invoke **tools** exposed by MCP servers.

### MCP Tool Model

An MCP server exposes **tools** that AI can call:

```json
{
  "name": "get_node_details",
  "description": "Extract detailed properties and bindings for a Figma node",
  "inputSchema": {
    "type": "object",
    "properties": {
      "nodeId": { "type": "string", "description": "Figma node ID (e.g., 146:4867)" },
      "resolve": { "type": "boolean", "description": "Auto-resolve variable bindings" }
    },
    "required": ["nodeId"]
  }
}
```

AI agent sees this tool and calls:
```json
{
  "name": "get_node_details",
  "arguments": {
    "nodeId": "146:4867",
    "resolve": true
  }
}
```

MCP server executes and returns result.

### How Our Progressive Disclosure Maps to MCP Tools

**Perfect 1:1 mapping:**

| Layer | MCP Tool | Type | Description |
|-------|----------|------|-------------|
| Layer 0 | `get_design_system` | READ | Get all variables, styles, effects |
| Layer 1 | `get_screenshot` | READ | Capture node screenshot |
| Layer 2 | `get_component_structure` | READ | Get component map with IDs |
| Layer 3 | `get_node_details` | READ | Get properties + bindings |
| Layer 4 | `analyze_node_complete` | READ | All layers combined |

**Plus WRITE tools:**

| Operation | MCP Tool | Type | Description |
|-----------|----------|------|-------------|
| Create component | `create_component` | WRITE | Create new component |
| Create frame | `create_auto_layout` | WRITE | Create auto-layout frame |
| Create text | `create_text_node` | WRITE | Create text element |
| Bind variable | `bind_variable` | WRITE | Bind variable to property |
| Create instance | `create_instance` | WRITE | Instance a component |
| Update text | `update_text` | WRITE | Modify text content |

### MCP Transport: Streamable HTTP (2025 Standard)

**Modern MCP uses Streamable HTTP** (not stdio, not old SSE):

```http
POST /mcp HTTP/1.1
Content-Type: application/json

{
  "method": "tools/call",
  "params": {
    "name": "get_node_details",
    "arguments": { "nodeId": "146:4867" }
  }
}
```

**Response (can stream):**
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream

event: progress
data: {"status":"fetching node..."}

event: result
data: {"identity":{...},"appearance":{...}}

event: complete
data: {"status":"success"}
```

**Benefits:**
- ✅ Single endpoint for all operations
- ✅ Supports streaming (like our SSE idea!)
- ✅ Standard protocol (not custom REST)
- ✅ Built-in tool discovery
- ✅ Works with any MCP client

---

## Architecture Comparison

### Option 1: REST/SSE API (Web-First)

```javascript
// REST endpoints
GET  /api/design-system
GET  /api/nodes/:nodeId/screenshot
GET  /api/nodes/:nodeId/structure
GET  /api/nodes/:nodeId/details
POST /api/components/create
POST /api/frames/create
POST /api/text/create

// SSE streaming
GET  /api/nodes/:nodeId/stream
```

**Pros:**
- ✅ Simple, well-understood
- ✅ Works in browsers directly
- ✅ Easy to test with curl/Postman
- ✅ Standard HTTP caching

**Cons:**
- ❌ Custom protocol (not standard)
- ❌ AI agents need custom integration
- ❌ No tool discovery mechanism
- ❌ More work to integrate with Claude Desktop

### Option 2: MCP Server (AI-First)

```javascript
// Single MCP endpoint
POST /mcp

// Tools (discovered automatically)
{
  "tools": [
    { "name": "get_design_system", ... },
    { "name": "get_screenshot", ... },
    { "name": "get_node_details", ... },
    { "name": "create_component", ... },
    { "name": "create_auto_layout", ... }
  ]
}
```

**Pros:**
- ✅ Standard protocol (MCP spec)
- ✅ Native AI agent support (Claude Desktop, ChatGPT, etc.)
- ✅ Built-in tool discovery
- ✅ Bidirectional by design
- ✅ Growing ecosystem
- ✅ Can still add REST later

**Cons:**
- ❌ Less familiar to web developers
- ❌ Requires MCP client (not raw HTTP)
- ❌ Smaller community (but growing fast)

### Option 3: Hybrid (Both)

```
MCP Server (primary)
├─ Tools for AI agents
└─ Progressive Disclosure tools

REST API (secondary)
├─ Web-friendly endpoints
└─ Browser access
```

**Pros:**
- ✅ Best of both worlds
- ✅ AI-native + web-accessible

**Cons:**
- ❌ Maintain two interfaces
- ❌ More complexity

---

## Detailed MCP Server Design

### Tool Catalog

#### READ Tools (Progressive Disclosure)

**1. get_design_system**
```json
{
  "name": "get_design_system",
  "description": "Layer 0: Get complete design system audit including variables, text styles, paint styles, and effect styles",
  "inputSchema": {
    "type": "object",
    "properties": {
      "includeVariables": { "type": "boolean", "default": true },
      "includeStyles": { "type": "boolean", "default": true }
    }
  }
}
```

**2. get_screenshot**
```json
{
  "name": "get_screenshot",
  "description": "Layer 1: Capture screenshot of a Figma node",
  "inputSchema": {
    "type": "object",
    "properties": {
      "nodeId": { "type": "string", "description": "Node ID" },
      "scale": { "type": "number", "default": 2, "description": "Retina scale (1-3)" },
      "format": { "type": "string", "enum": ["PNG", "JPG"], "default": "PNG" }
    },
    "required": ["nodeId"]
  }
}
```

**3. get_component_structure**
```json
{
  "name": "get_component_structure",
  "description": "Layer 2: Get component hierarchy map with node IDs for navigation",
  "inputSchema": {
    "type": "object",
    "properties": {
      "nodeId": { "type": "string" },
      "depth": { "type": "number", "default": 2, "description": "Traversal depth" },
      "includeInstances": { "type": "boolean", "default": true }
    },
    "required": ["nodeId"]
  }
}
```

**4. get_node_details**
```json
{
  "name": "get_node_details",
  "description": "Layer 3: Extract detailed properties, dimensions, layout, and variable bindings",
  "inputSchema": {
    "type": "object",
    "properties": {
      "nodeId": { "type": "string" },
      "resolveBindings": { "type": "boolean", "default": true, "description": "Auto-resolve variable references" }
    },
    "required": ["nodeId"]
  }
}
```

**5. analyze_node_complete**
```json
{
  "name": "analyze_node_complete",
  "description": "Layer 4: Complete workflow - all layers combined with cross-reference resolution",
  "inputSchema": {
    "type": "object",
    "properties": {
      "nodeId": { "type": "string" },
      "layers": { "type": "array", "items": { "type": "number" }, "default": [0,1,2,3] }
    },
    "required": ["nodeId"]
  }
}
```

#### WRITE Tools (Creation/Modification)

**6. create_component**
```json
{
  "name": "create_component",
  "description": "Create a new Figma component with specified properties",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "width": { "type": "number" },
      "height": { "type": "number" },
      "layoutMode": { "type": "string", "enum": ["NONE", "HORIZONTAL", "VERTICAL"] }
    },
    "required": ["name"]
  }
}
```

**7. create_auto_layout**
```json
{
  "name": "create_auto_layout",
  "description": "Create an auto-layout frame with specified properties",
  "inputSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "direction": { "type": "string", "enum": ["VERTICAL", "HORIZONTAL"] },
      "itemSpacing": { "type": "number" },
      "padding": { "type": "number" },
      "fills": { "type": "array" }
    },
    "required": ["name", "direction"]
  }
}
```

**8. create_text_node**
```json
{
  "name": "create_text_node",
  "description": "Create a text node with specified content and styling",
  "inputSchema": {
    "type": "object",
    "properties": {
      "text": { "type": "string" },
      "fontFamily": { "type": "string", "default": "DM Sans" },
      "fontSize": { "type": "number" },
      "textStyleName": { "type": "string", "description": "Optional text style to apply" }
    },
    "required": ["text"]
  }
}
```

**9. bind_variable**
```json
{
  "name": "bind_variable",
  "description": "Bind a variable to a node property",
  "inputSchema": {
    "type": "object",
    "properties": {
      "nodeId": { "type": "string" },
      "property": { "type": "string", "enum": ["fills", "strokes", "width", "height", "cornerRadius", "padding"] },
      "variableName": { "type": "string", "description": "Variable name (e.g., 'Fills/card-background')" }
    },
    "required": ["nodeId", "property", "variableName"]
  }
}
```

**10. create_instance**
```json
{
  "name": "create_instance",
  "description": "Create an instance of a component",
  "inputSchema": {
    "type": "object",
    "properties": {
      "componentName": { "type": "string", "description": "Name of component to instance" },
      "parentNodeId": { "type": "string", "description": "Optional parent node ID" }
    },
    "required": ["componentName"]
  }
}
```

---

## Implementation: MCP Server with Express

### Server Structure

```javascript
const express = require('express');
const { runScript } = require('./lib');

const app = express();
app.use(express.json());

// MCP endpoint
app.post('/mcp', async (req, res) => {
  const { method, params } = req.body;

  switch (method) {
    case 'initialize':
      return handleInitialize(res);
    case 'tools/list':
      return handleToolsList(res);
    case 'tools/call':
      return handleToolCall(params, res);
    default:
      res.status(400).json({ error: 'Unknown method' });
  }
});

// MCP: Initialize handshake
function handleInitialize(res) {
  res.json({
    protocolVersion: '2025-06-18',
    capabilities: {
      tools: {},
      streaming: true
    },
    serverInfo: {
      name: 'figma-progressive-disclosure',
      version: '1.0.0'
    }
  });
}

// MCP: List available tools
function handleToolsList(res) {
  res.json({
    tools: [
      {
        name: 'get_design_system',
        description: 'Layer 0: Get complete design system audit',
        inputSchema: { /* ... */ }
      },
      {
        name: 'get_screenshot',
        description: 'Layer 1: Capture node screenshot',
        inputSchema: { /* ... */ }
      },
      {
        name: 'get_component_structure',
        description: 'Layer 2: Get component hierarchy',
        inputSchema: { /* ... */ }
      },
      {
        name: 'get_node_details',
        description: 'Layer 3: Get node properties and bindings',
        inputSchema: { /* ... */ }
      },
      {
        name: 'create_component',
        description: 'Create a new Figma component',
        inputSchema: { /* ... */ }
      },
      {
        name: 'create_auto_layout',
        description: 'Create auto-layout frame',
        inputSchema: { /* ... */ }
      },
      // ... more tools
    ]
  });
}

// MCP: Execute tool
async function handleToolCall(params, res) {
  const { name, arguments: args } = params;

  // Set headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    switch (name) {
      case 'get_design_system':
        const designSystem = await getDesignSystem();
        sendEvent('result', designSystem);
        break;

      case 'get_screenshot':
        sendEvent('progress', { status: 'Capturing screenshot...' });
        const screenshot = await getScreenshot(args.nodeId, args);
        sendEvent('result', screenshot);
        break;

      case 'get_component_structure':
        sendEvent('progress', { status: 'Mapping structure...' });
        const structure = await getComponentStructure(args.nodeId, args);
        sendEvent('result', structure);
        break;

      case 'get_node_details':
        sendEvent('progress', { status: 'Extracting details...' });
        const details = await getNodeDetails(args.nodeId, args);
        sendEvent('result', details);
        break;

      case 'create_component':
        sendEvent('progress', { status: 'Creating component...' });
        const component = await createComponent(args);
        sendEvent('result', component);
        break;

      case 'create_auto_layout':
        sendEvent('progress', { status: 'Creating auto-layout...' });
        const frame = await createAutoLayout(args);
        sendEvent('result', frame);
        break;

      // ... more tool handlers
    }

    sendEvent('complete', { status: 'success' });
    res.end();

  } catch (error) {
    sendEvent('error', { message: error.message });
    res.end();
  }
}

// Tool implementation functions (reuse existing lib functions)
async function getDesignSystem() {
  // Use existing Layer 0 script logic
  const result = await executeInFigma(/* ... */);
  return result;
}

async function createComponent(args) {
  // Use existing lib/components.js logic
  const result = await executeInFigma(`
    const component = figma.createComponent();
    component.name = "${args.name}";
    // ... rest of creation logic
  `);
  return result;
}

app.listen(3000, () => {
  console.log('MCP Server running on http://localhost:3000');
});
```

### Client Usage (Claude Desktop)

**1. Install MCP Server in Claude Desktop:**

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "figma-progressive-disclosure": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

**2. Claude automatically discovers tools:**

```
User: "Analyze the Help Screen in Figma (node 146:4867)"

Claude: Let me use the analyze_node_complete tool...
[Calls: analyze_node_complete with nodeId: "146:4867"]

Result: {
  designSystem: { ... },
  screenshot: { ... },
  structure: { ... },
  details: { ... }
}

Claude: "The Help Screen is a 393x852 frame with a dark background
(bound to Fills/page-background). It contains 4 main sections:
Background Glow, Status Bar, Header, and Content..."
```

**3. User requests creation:**

```
User: "Create a new badge component with the text 'VERIFIED'"

Claude: Let me create that badge component...
[Calls: create_component with name: "Badge/Verified"]
[Calls: create_text_node with text: "VERIFIED"]
[Calls: bind_variable to bind colors]

Result: { componentId: "123:456", created: true }

Claude: "I've created a new Badge component with 'VERIFIED' text,
using the design system's badge styling."
```

---

## Comparison Matrix

| Feature | REST API | SSE API | MCP Server |
|---------|----------|---------|------------|
| **Bidirectional** | ⚠️ POST only | ❌ Read-only | ✅ Native |
| **AI Integration** | ⚠️ Custom | ⚠️ Custom | ✅ Standard |
| **Tool Discovery** | ❌ Manual | ❌ Manual | ✅ Automatic |
| **Streaming** | ❌ | ✅ | ✅ |
| **Browser Support** | ✅ Native | ✅ Native | ⚠️ Via client |
| **Claude Desktop** | ❌ Custom | ❌ Custom | ✅ Native |
| **Standard Protocol** | ⚠️ REST | ⚠️ SSE | ✅ MCP Spec |
| **Read Operations** | ✅ | ✅ | ✅ |
| **Write Operations** | ✅ | ❌ | ✅ |
| **Caching** | ✅ HTTP | ❌ | ⚠️ Custom |
| **Testing** | ✅ Easy | ⚠️ Medium | ⚠️ Medium |
| **Ecosystem** | 🔥 Huge | ⚠️ Medium | 📈 Growing |
| **Future-Proof** | ✅ | ⚠️ | 🚀 High |

---

## Recommendation: Build MCP Server First

### Why MCP Server is the Right Choice

1. **Perfect Use Case Match**
   - ✅ Bidirectional operations (read + write)
   - ✅ AI agent interaction (Claude, ChatGPT)
   - ✅ Tool-based architecture (natural fit)
   - ✅ Progressive disclosure as tools

2. **Native Integration**
   - ✅ Claude Desktop built-in support
   - ✅ Claude Code can use as MCP server
   - ✅ No custom client code needed
   - ✅ Automatic tool discovery

3. **Ecosystem Growth**
   - 📈 16,000+ MCP servers exist
   - 🚀 OpenAI adopted MCP in 2025
   - 🏛️ Linux Foundation stewardship
   - 🌐 Growing adoption

4. **Code Reuse**
   - ✅ Use existing `/lib` functions
   - ✅ Wrap in MCP tool interface
   - ✅ Same business logic
   - ✅ Add REST later if needed

### Implementation Plan

**Phase 1: MCP Server MVP (Week 1)**
```
✅ Setup MCP server with Express
✅ Implement handshake (initialize, tools/list)
✅ 5 READ tools (Layers 0-3 + complete)
✅ Test with Claude Desktop
```

**Phase 2: WRITE Tools (Week 2)**
```
✅ 5 WRITE tools (create component, frame, text, bind, instance)
✅ Error handling and validation
✅ Progress streaming
```

**Phase 3: Enhancement (Week 3)**
```
✅ Caching for Layer 0
✅ Batch operations
✅ Tool composition (multi-step workflows)
```

**Phase 4: REST Compatibility (Optional)**
```
✅ Add REST endpoints for web clients
✅ Both MCP and REST use same functions
✅ Best of both worlds
```

---

## Sources

Research based on:
- [Stytch: MCP comprehensive introduction](https://stytch.com/blog/model-context-protocol-introduction/)
- [Descope: What is MCP](https://www.descope.com/learn/post/mcp)
- [Phil Schmid: MCP overview](https://www.philschmid.de/mcp-introduction)
- [MCP Official Architecture](https://modelcontextprotocol.io/docs/learn/architecture)
- [Anthropic: Introducing MCP](https://www.anthropic.com/news/model-context-protocol)
- [MCPcat: Transport Protocols Comparison](https://mcpcat.io/guides/comparing-stdio-sse-streamablehttp/)
- [Roo Code: Server Transports](https://docs.roocode.com/features/mcp/server-transports)
- [MCP Specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18)
- [GitHub: MCP Reference Servers](https://github.com/modelcontextprotocol/servers)
- [Why MCP Deprecated SSE](https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/)

---

## Next Steps

**Ready to build the MCP Server?**

1. Create MCP server skeleton with Express
2. Implement tool catalog (5 READ tools)
3. Test with Claude Desktop
4. Add WRITE tools
5. Document and publish

**Alternatively:**

Want to see a side-by-side prototype of both REST and MCP to compare developer experience?
