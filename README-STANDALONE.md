# Figmatic MCP Server (Standalone)

**Complete, self-contained MCP server for Figma AI Agent Bridge**

✅ **54 Production-Ready MCP Tools** (13 READ + 41 WRITE)

This is a standalone package that bundles everything needed to run an MCP server with Figma Plugin API integration - no external dependencies required.

---

## 🎯 What's Included

This standalone package contains:

1. **MCP Server** - Model Context Protocol server (HTTP + SSE) on port 3000
2. **WebSocket Bridge** - Bidirectional bridge to Figma Desktop on port 8080
3. **Figma Helper Functions** - 50+ utility functions for common Figma operations
4. **54 Production-Ready Tools** - Complete CRUD operations for Figma design systems (13 READ + 41 WRITE)

**Everything runs in a single process** - no external servers or dependencies needed.

---

## 📦 Package Structure

```
mcp-server/
├── server.js                   # Main entry point (starts both MCP + WebSocket)
├── package.json                # Standalone dependencies
│
├── bridge/                     # WebSocket bridge to Figma
│   ├── server.js              # WebSocket server (port 8080)
│   ├── core/                  # Pure state management
│   └── api/                   # Figma API wrappers
│
├── helpers/                    # Figma helper functions
│   ├── index.js               # Main exports
│   ├── analysis.js            # Node analysis & extraction
│   ├── bindings.js            # Variable binding helpers
│   ├── components.js          # Component utilities
│   ├── autolayout.js          # Auto-layout frames
│   ├── text.js                # Text node helpers
│   └── variables.js           # Variable cache
│
├── handlers/                   # MCP request handlers
│   ├── initialize.js          # MCP initialization
│   ├── tools-list.js          # Tool discovery
│   └── tools-call.js          # Tool execution
│
├── tools/                      # 26 MCP tools
│   ├── read-tools.js          # 8 read operations
│   ├── write-tools.js         # 18 write operations
│   └── schemas.js             # Tool schemas
│
└── utils/                      # Utilities
    ├── context.js             # API context creation
    ├── logger.js              # JSON logging
    └── streaming.js           # SSE streaming
```

---

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+**
2. **Figma Desktop** with "AI Agent Bridge" plugin installed
3. Plugin configured to connect to `ws://localhost:8080`

### Installation

```bash
cd progressive-disclosure-api/mcp-server
npm install
```

### Start Server

```bash
npm start
```

You should see:

```
╔════════════════════════════════════════╗
║   Figma AI Bridge WebSocket Server    ║
╚════════════════════════════════════════╝

Server running on ws://localhost:8080
Waiting for connections...

╔════════════════════════════════════════╗
║   Figmatic MCP Server (2024-11-05)    ║
╚════════════════════════════════════════╝

✅ WebSocket Bridge: ws://localhost:8080
✅ MCP Server: http://localhost:3000

📋 Tools Available: 26
✅ MCP Server ready for tool calls
```

---

## 🔌 Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

Returns:
```json
{
  "status": "ok",
  "server": "figmatic-mcp-server",
  "version": "1.0.0",
  "protocol": "MCP v2024-11-05",
  "figmaConnected": true,
  "logging": { ... }
}
```

### Dashboard
Open in browser: `http://localhost:3000/dashboard`

Live monitoring UI showing:
- Connected status
- Tool call statistics
- Real-time logs

### MCP Endpoint
```bash
POST http://localhost:3000/mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

---

## 🛠️ Available Tools

**Total: 54 tools** - All tool counts are dynamically generated from `/tools/schemas.js`

### Read Operations (13 tools)

| Tool | Description |
|------|-------------|
| `get_design_system` | Get complete design system (components + variables) |
| `get_screenshot` | Export component/frame as PNG/SVG |
| `get_component_structure` | Get component hierarchy and properties |
| `get_node_details` | Deep analysis of any node |
| `analyze_complete` | Complete node analysis with bindings |
| `get_components` | List all components in file |
| `get_component_metadata` | Get comprehensive component metadata |
| `get_component_variants` | Get all variants from ComponentSet |
| `get_nested_instance_tree` | Get complete nested instance hierarchy |
| `find_nodes_by_name` | Search nodes by name pattern (wildcards/regex) |
| `validate_responsive_layout` | Validate responsive sizing patterns |
| `get_component_properties` | Get component property definitions |
| `get_instance_properties` | Get instance property values |

### Write Operations (41 tools)

| Tool | Description |
|------|-------------|
| `create_component` | Create component with variants |
| `create_auto_layout` | Create auto-layout frame |
| `create_text_node` | Create styled text |
| `bind_variable` | Bind variable to node property |
| `create_instance` | Create component instance |
| `add_children` | Add children to node |
| `modify_node` | Modify node properties |
| `swap_component` | Swap component instance |
| `rename_node` | Rename node |
| `add_component_property` | Add component property |
| `bind_text_to_property` | Bind text to property |
| `set_text_truncation` | Set text truncation |
| `set_instance_properties` | Set instance property values |
| `create_component_variants` | Create variants for component |
| `create_variable` | Create design token variable |
| `create_text_style` | Create text style |
| `delete_text_style` | Delete text style |
| `delete_node` | Delete node |

---

## 🧪 Testing

### Test MCP Initialization

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

### Test Tool List

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

### Test Tool Call (Get Components)

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_components",
      "arguments": {}
    }
  }'
```

---

## 📚 Development

### Project Structure Philosophy

This is a **standalone package** designed for:
- ✅ Independent development and testing
- ✅ Easy deployment (single directory)
- ✅ No external path dependencies
- ✅ Self-contained with all dependencies bundled

### Key Files

**`server.js`** - Main entry point
- Starts WebSocket bridge (port 8080)
- Starts MCP server (port 3000)
- Registers all endpoints

**`utils/context.js`** - API Context
- Creates unified API object for tools
- Exposes `executeInFigma`, `getAllVariables`, etc.
- Includes all helper functions

**`bridge/server.js`** - WebSocket Bridge
- Manages Figma plugin connection
- Executes code in Figma via eval()
- Handles bidirectional communication

**`helpers/index.js`** - Helper Functions
- 50+ utility functions
- Variable caching, component finding, text styling
- Auto-layout creation, bindings, analysis

### Adding New Tools

1. Define tool schema in `tools/schemas.js`:
```javascript
{
  name: 'my_new_tool',
  description: 'Does something useful',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: { type: 'string', description: 'Node ID' }
    },
    required: ['nodeId']
  }
}
```

2. Implement tool in `tools/read-tools.js` or `tools/write-tools.js`:
```javascript
async function myNewTool(args, api) {
  const { nodeId } = args;

  const result = await api.executeInFigma(`
    const node = figma.getNodeById('${nodeId}');
    return { name: node.name };
  `);

  return result;
}
```

3. Export in `tools/index.js`:
```javascript
module.exports = {
  // ... existing tools
  my_new_tool: myNewTool
};
```

### Logging

All tool calls are logged to `tool-calls.jsonl`:

```json
{"timestamp":"2026-01-06T09:08:45.123Z","requestId":"1","toolName":"get_components","arguments":{},"status":"success","duration":234}
```

View logs:
```bash
# Real-time
tail -f tool-calls.jsonl

# Pretty print
cat tool-calls.jsonl | jq '.'

# Stream via HTTP
curl -N http://localhost:3000/logs/stream
```

---

## 🔧 Configuration

### Environment Variables

```bash
# MCP server port (default: 3000)
export MCP_PORT=3000

# Development mode (more verbose logging)
export NODE_ENV=development

# Start server
npm start
```

### Custom WebSocket Port

Edit `bridge/server.js`:
```javascript
const PORT = process.env.WS_PORT || 8080;
```

---

## 🚢 Deployment

### Local Development
```bash
cd progressive-disclosure-api/mcp-server
npm install
npm start
```

### Production (Future)
See `PRODUCTION_DEPLOYMENT_RESEARCH.md` in project root for:
- Cloud deployment guide (AWS/GCP/Azure)
- OAuth authentication setup
- Multi-user session management
- Load balancing and scaling

---

## 🐛 Troubleshooting

### Server won't start

**Error:** `EADDRINUSE: address already in use :::8080`

**Solution:**
```bash
# Kill processes on ports 8080 and 3000
lsof -ti :8080 :3000 | xargs kill -9
npm start
```

### Figma plugin won't connect

**Error:** `WebSocket connection failed`

**Solutions:**
1. Check Figma plugin is running (Plugins → Development → AI Agent Bridge)
2. Check manifest.json has correct WebSocket URL:
   ```json
   {
     "networkAccess": {
       "devAllowedDomains": ["ws://localhost:8080"]
     }
   }
   ```
3. Rebuild plugin: `cd figma-plugin && npm run build`

### Tool calls fail

**Error:** `Figma plugin not connected`

**Solution:**
1. Check health endpoint: `curl http://localhost:3000/health`
2. Verify `figmaConnected: true`
3. If false, check Figma plugin is active

### Import errors

**Error:** `Cannot find module '../../../lib'`

**Solution:** You're using the old MCP server. This standalone version has everything bundled locally. All imports use relative paths within `mcp-server/`.

---

## 📖 Documentation

### Additional Resources

- **`README.md`** - Original MCP server docs
- **`TESTING-OBSERVATIONS.md`** - Testing notes and learnings
- **`TOOL-DESIGN-PHILOSOPHY.md`** - Tool design principles
- **`case-studies/`** - Real-world implementation examples

### External Documentation

- [MCP Specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [Figma Plugin API](https://developers.figma.com/docs/plugins/api/)
- [Production Deployment Guide](../../PRODUCTION_DEPLOYMENT_RESEARCH.md)

---

## 🎓 Key Concepts

### Progressive Disclosure

Tools are designed with progressive disclosure:
1. Start with minimal required parameters
2. Return structured data with next steps
3. Guide users to more advanced operations

Example:
```javascript
// 1. Get components (minimal)
await tools.get_components()

// 2. Get component structure (targeted)
await tools.get_component_structure({ componentId: 'abc' })

// 3. Get full analysis (comprehensive)
await tools.analyze_complete({ nodeId: 'abc' })
```

### Standalone Architecture

Unlike the original setup with separate directories, this version:
- ✅ Bundles all dependencies locally
- ✅ No `../../` imports to external directories
- ✅ Self-contained in single directory
- ✅ Can be moved, copied, or deployed independently

### WebSocket Bridge

The bridge pattern enables:
- ✅ Real-time bidirectional communication
- ✅ Full Figma Plugin API access (not just REST API)
- ✅ Write operations (create, modify, delete)
- ✅ Variable binding and design tokens

---

## 📝 License

MIT

---

## 🙏 Credits

Built on top of:
- [Model Context Protocol](https://modelcontextprotocol.io) by Anthropic
- [Figma Plugin API](https://www.figma.com/plugin-docs/) by Figma
- [Express.js](https://expressjs.com/) for HTTP server
- [ws](https://github.com/websockets/ws) for WebSocket

---

**Version:** 1.0.0 (Standalone)
**Last Updated:** 2026-01-06
