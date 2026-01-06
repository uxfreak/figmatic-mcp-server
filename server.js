/**
 * Figmatic MCP Server (Standalone)
 *
 * Model Context Protocol server for Progressive Disclosure API
 * Exposes Figma design system analysis and automation as MCP tools
 *
 * This is a STANDALONE package that bundles:
 *   - MCP Server (HTTP + SSE) on port 3000
 *   - WebSocket Bridge to Figma on port 8080
 *   - Figma Helper Functions (analysis, bindings, components, etc.)
 *
 * Protocol: MCP v2024-11-05 (SSE transport)
 * Ports: 3000 (MCP) + 8080 (WebSocket Bridge)
 *
 * Usage:
 *   cd progressive-disclosure-api/mcp-server
 *   npm install
 *   npm start
 *
 * Prerequisites:
 *   - Figma Desktop with "AI Agent Bridge" plugin active
 *   - Plugin configured to connect to ws://localhost:8080
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { handleInitialize } = require('./handlers/initialize');
const { handleToolsList } = require('./handlers/tools-list');
const { handleToolsCall } = require('./handlers/tools-call');

// Import and start local WebSocket bridge (bundled standalone)
const wsServer = require('./bridge/server.js');

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  const { createAPIContext } = require('./utils/context');
  const { getLogStats } = require('./utils/logger');
  const api = createAPIContext();

  res.json({
    status: 'ok',
    server: 'figmatic-mcp-server',
    version: '1.0.0',
    protocol: 'MCP v2024-11-05',
    figmaConnected: api.isConnected ? api.isConnected() : false,
    logging: getLogStats()
  });
});

// Logs endpoint - view logging statistics
app.get('/logs', (req, res) => {
  const { getLogStats, getLogFilePath } = require('./utils/logger');
  const stats = getLogStats();

  res.json({
    ...stats,
    instructions: {
      view: `cat ${getLogFilePath()}`,
      tail: `tail -f ${getLogFilePath()}`,
      parse: `cat ${getLogFilePath()} | jq '.'`
    }
  });
});

// Dashboard - live monitoring UI
app.get('/dashboard', (req, res) => {
  const dashboardPath = path.join(__dirname, 'dashboard.html');
  res.sendFile(dashboardPath);
});

// Stream logs via Server-Sent Events
app.get('/logs/stream', (req, res) => {
  const { getLogFilePath } = require('./utils/logger');
  const logPath = getLogFilePath();

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Watch log file for changes
  let lastSize = 0;
  try {
    const stats = fs.statSync(logPath);
    lastSize = stats.size;
  } catch (error) {
    // File doesn't exist yet
  }

  const watcher = fs.watch(logPath, (eventType) => {
    if (eventType === 'change') {
      try {
        const stats = fs.statSync(logPath);
        if (stats.size > lastSize) {
          // Read new content
          const stream = fs.createReadStream(logPath, {
            start: lastSize,
            encoding: 'utf8'
          });

          stream.on('data', (chunk) => {
            const lines = chunk.split('\n').filter(l => l.trim());
            lines.forEach(line => {
              try {
                const logEntry = JSON.parse(line);
                res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
              } catch (e) {
                // Skip invalid JSON
              }
            });
          });

          lastSize = stats.size;
        }
      } catch (error) {
        // Handle error silently
      }
    }
  });

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    watcher.close();
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
  // Dynamically count tools
  const { countAndCategorizeTools } = require('./scripts/count-tools');
  const toolCounts = countAndCategorizeTools();

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
  console.log(`Dashboard: GET /dashboard`);
  console.log(`Logs: GET /logs`);
  console.log('');
  console.log('📝 Logging: ENABLED (tool-calls.jsonl)');
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log('');
  console.log(`📋 Tools Available: ${toolCounts.total} (${toolCounts.read} READ + ${toolCounts.write} WRITE)`);
  console.log('');
  console.log('⚠️  Prerequisites:');
  console.log('   - Figma Desktop with "AI Agent Bridge" plugin active');
  console.log('');
  console.log('✅ MCP Server ready for tool calls');
  console.log('');
});

module.exports = { app };
