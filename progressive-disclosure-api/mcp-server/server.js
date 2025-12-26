/**
 * Figmatic MCP Server
 *
 * Model Context Protocol server for Progressive Disclosure API
 * Exposes Figma design system analysis and automation as MCP tools
 *
 * Protocol: MCP v2024-11-05 (SSE transport)
 * Port: 3000 (default)
 *
 * Usage:
 *   npm start
 *
 * Prerequisites:
 *   - WebSocket server running on localhost:8080
 *   - Figma Desktop with "AI Agent Bridge" plugin active
 */

const express = require('express');
const { handleInitialize } = require('./handlers/initialize');
const { handleToolsList } = require('./handlers/tools-list');
const { handleToolsCall } = require('./handlers/tools-call');

// Import and start WebSocket server in the same process
const wsServer = require('../../websocket-server/server.js');

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  const { createAPIContext } = require('./utils/context');
  const api = createAPIContext();

  res.json({
    status: 'ok',
    server: 'figmatic-mcp-server',
    version: '1.0.0',
    protocol: 'MCP v2024-11-05',
    figmaConnected: api.isConnected ? api.isConnected() : false
  });
});

// Main MCP endpoint
app.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;

  // Validate JSON-RPC 2.0 format
  if (!method || !id) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: id || null,
      error: {
        code: -32600,
        message: 'Invalid Request - missing method or id'
      }
    });
  }

  try {
    switch (method) {
      case 'initialize':
        return handleInitialize(req, res, params);

      case 'tools/list':
        return handleToolsList(req, res);

      case 'tools/call':
        return handleToolsCall(req, res, params);

      default:
        res.status(400).json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        });
    }
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: { error: error.message }
      }
    });
  }
});

// Start WebSocket server first (port 8080)
console.log('Starting WebSocket server...');
wsServer.startServer();

// Start MCP server (port 3000)
const PORT = process.env.MCP_PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Figmatic MCP Server (2024-11-05)    ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ WebSocket Bridge: ws://localhost:8080`);
  console.log(`✅ MCP Server: http://localhost:${PORT}`);
  console.log('');
  console.log(`Protocol: MCP v2024-11-05 (SSE transport)`);
  console.log(`Endpoint: POST /mcp`);
  console.log(`Health: GET /health`);
  console.log('');
  console.log('📋 Tools Available: 10');
  console.log('   READ (5): get_design_system, get_screenshot, get_component_structure,');
  console.log('             get_node_details, analyze_complete');
  console.log('   WRITE (5): create_component, create_auto_layout, create_text_node,');
  console.log('              bind_variable, create_instance');
  console.log('');
  console.log('⚠️  Prerequisites:');
  console.log('   - Figma Desktop with "AI Agent Bridge" plugin active');
  console.log('');
  console.log('✅ MCP Server ready for tool calls');
  console.log('');
});

module.exports = { app };
