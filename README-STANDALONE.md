# Figmatic MCP Server (Standalone)

**World-Class MCP Server for Figma AI Agent Bridge**

✅ **54 Production-Ready MCP Tools** (13 READ + 41 WRITE)
✅ **Native Stdio Transport** (Industry Standard)
✅ **Auto-Start with Claude Code** (Zero Manual Setup)

This is a cutting-edge, standalone MCP server following the exact same architecture as official MCP servers like @modelcontextprotocol/server-github and @modelcontextprotocol/server-postgres.

---

## 🎯 What's Included

This standalone package contains:

1. **MCP Server** - Native stdio transport (stdin/stdout communication)
2. **WebSocket Bridge** - Embedded bridge to Figma Desktop on port 8080
3. **Figma Helper Functions** - 50+ utility functions for common Figma operations
4. **54 Production-Ready Tools** - Complete CRUD operations for Figma design systems (13 READ + 41 WRITE)

**Everything runs in a single process** - Claude Code manages the lifecycle automatically.

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
2. **Claude Code CLI** installed
3. **Figma Desktop** with "AI Agent Bridge" plugin installed
4. Plugin configured to connect to `ws://localhost:8080`

### Installation

```bash
cd progressive-disclosure-api/mcp-server
npm install
```

### Setup with Claude Code (One-Time)

```bash
# Navigate to project root
cd /Users/kasa/Downloads/Projects/figmatic

# Add MCP server (auto-start enabled)
claude mcp add --transport stdio figmatic-api --scope project \
  -- node /Users/kasa/Downloads/Projects/figmatic/progressive-disclosure-api/mcp-server/server.js
```

This creates `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "figmatic-api": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/Users/kasa/Downloads/Projects/figmatic/progressive-disclosure-api/mcp-server/server.js"
      ],
      "env": {}
    }
  }
}
```

### Using the Server

**That's it!** The server auto-starts when you run Claude Code:

```bash
claude
```

Within Claude Code, check available tools:

```bash
/mcp
```

You'll see 54 tools ready to use. The server runs in the background and automatically shuts down when you exit Claude Code.

### Verify It's Working

Server logs go to **stderr** (visible in terminal):

```
[2024-01-06T...] ℹ️ ╔════════════════════════════════════════╗
[2024-01-06T...] ℹ️ ║   Figmatic MCP Server (2024-11-05)    ║
[2024-01-06T...] ℹ️ ╚════════════════════════════════════════╝
[2024-01-06T...] ℹ️
[2024-01-06T...] ℹ️ Transport: Native stdio (industry standard)
[2024-01-06T...] ℹ️ WebSocket Bridge: ✅ Running on ws://localhost:8080
[2024-01-06T...] ℹ️ Tools Available: 54 (13 READ + 41 WRITE)
[2024-01-06T...] ℹ️ MCP Server ready - waiting for stdin...
```

---

## 🔗 Integration Details

### Native Stdio Transport

This server uses **native stdio transport** - the industry standard for MCP servers. It communicates with Claude Code via stdin/stdout, exactly like official MCP servers.

**Architecture:**
```
Claude Code (CLI)
    ↕ stdin/stdout (JSON-RPC)
MCP Server (server.js)
    ↓ WebSocket
Figma Plugin (Figma Desktop)
```

**Key Features:**
- ✅ **Auto-start**: Claude Code launches server automatically
- ✅ **Auto-shutdown**: Gracefully terminates when Claude Code exits
- ✅ **Zero configuration**: Works out-of-the-box with `.mcp.json`
- ✅ **Team-shareable**: Commit `.mcp.json` to git
- ✅ **Production-ready**: Same architecture as @modelcontextprotocol/* servers

### Management Commands

```bash
# List all configured MCP servers
claude mcp list

# Get server details
claude mcp get figmatic-api

# Remove server (if needed)
claude mcp remove figmatic-api

# Re-add with different settings
claude mcp add --transport stdio figmatic-api --scope project \
  -- node /path/to/server.js
```

### Team Setup

The `.mcp.json` file is already configured for your project. Team members just need to:

```bash
# 1. Clone the repo
git clone <your-repo>

# 2. Install dependencies
cd progressive-disclosure-api/mcp-server
npm install

# 3. Start Claude Code (server auto-starts)
claude
```

No additional configuration needed! 🎉

---

## ⚙️ Configuration

### Port Configuration

The WebSocket bridge uses **port 8080** by default. If this port is already in use on your system, you can configure a different port via environment variable.

**Option 1: Via `.mcp.json` (Recommended)**

Edit `.mcp.json` to set a custom port:

```json
{
  "mcpServers": {
    "figmatic-api": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/Users/kasa/Downloads/Projects/figmatic/progressive-disclosure-api/mcp-server/server.js"
      ],
      "env": {
        "FIGMA_WS_PORT": "8081"
      }
    }
  }
}
```

**Option 2: Via Shell Environment**

```bash
export FIGMA_WS_PORT=8081
claude
```

**Option 3: Inline (One-time)**

```bash
FIGMA_WS_PORT=8081 claude
```

### Port Conflict Error Handling

If you see this error:
```
❌ ERROR: Port 8080 is already in use!
```

The server will automatically provide helpful instructions:
1. Stop the process using port 8080
2. Or use a different port by setting `FIGMA_WS_PORT`

**Find what's using the port:**
```bash
lsof -i :8080
```

**Kill the process:**
```bash
lsof -ti :8080 | xargs kill -9
```

**Or use a different port:**
```bash
# Edit .mcp.json and change FIGMA_WS_PORT to 8081
# Then update Figma plugin to connect to ws://localhost:8081
```

### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `FIGMA_WS_PORT` | `8080` | WebSocket server port for Figma plugin connection |

**Important:** If you change the port, you must also update the Figma plugin configuration to connect to the new port (e.g., `ws://localhost:8081`).

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
