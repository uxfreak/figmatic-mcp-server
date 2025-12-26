# Figmatic MCP Server

**Production-ready MCP (Model Context Protocol) server for Figma design system analysis and automation.**

Exposes 10 powerful tools that enable AI agents (Claude Desktop, ChatGPT, etc.) to read and manipulate Figma designs through a standardized MCP interface.

---

## Features

✅ **10 MCP Tools** (5 READ + 5 WRITE)
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
- `tools/list` - Get catalog of all 10 tools
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

Claude will automatically discover all 10 tools. You can now ask:

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
│   ├── schemas.js         # JSON schemas (10 tools)
│   ├── read-tools.js      # 5 READ tools
│   └── write-tools.js     # 5 WRITE tools
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
- ✅ 10 MCP tools (5 READ + 5 WRITE)
- ✅ Progressive Disclosure API (Layers 0-4)
- ✅ SSE streaming with progress updates
- ✅ Layer 0 caching (15min TTL)
- ✅ Integrated WebSocket bridge
- ✅ Comprehensive test suite
- ✅ Claude Desktop integration
