#!/usr/bin/env node
/**
 * Figmatic MCP Server - Native Stdio Implementation
 *
 * World-class MCP server following industry best practices:
 * - Native stdio transport (stdin/stdout communication)
 * - Embedded WebSocket bridge for Figma Plugin API
 * - Production-ready error handling
 * - Proper logging to stderr (never stdout)
 * - Graceful shutdown
 *
 * Protocol: MCP v2024-11-05 (stdio transport)
 * Architecture:
 *   - Stdin: JSON-RPC requests from Claude Code
 *   - Stdout: JSON-RPC responses to Claude Code
 *   - Stderr: Server logs and diagnostics
 *   - Port 8080: WebSocket bridge to Figma Plugin
 *
 * This follows the exact same pattern as official MCP servers:
 *   @modelcontextprotocol/server-github
 *   @modelcontextprotocol/server-postgres
 *   @modelcontextprotocol/server-filesystem
 */

const { getToolCatalog, executeTool } = require('./tools');
const { createAPIContext } = require('./utils/context');
const { logToolCall } = require('./utils/logger');

// Start embedded WebSocket bridge
const wsServer = require('./bridge/server.js');

// Server state
let initialized = false;
let clientInfo = null;

/**
 * Log to stderr (never stdout - that's reserved for JSON-RPC)
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
  process.stderr.write(`[${timestamp}] ${prefix} ${message}\n`);
}

/**
 * Send JSON-RPC response to stdout
 */
function sendResponse(id, result) {
  const response = {
    jsonrpc: '2.0',
    id,
    result
  };
  process.stdout.write(JSON.stringify(response) + '\n');
}

/**
 * Send JSON-RPC error to stdout
 */
function sendError(id, code, message, data = undefined) {
  const response = {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data && { data })
    }
  };
  process.stdout.write(JSON.stringify(response) + '\n');
}

/**
 * Handle initialize request
 */
function handleInitialize(id, params) {
  const { protocolVersion, capabilities, clientInfo: client } = params || {};

  // Support multiple protocol versions (backward compatible)
  const supportedVersions = ['2024-11-05', '2025-11-25'];

  if (!supportedVersions.includes(protocolVersion)) {
    sendError(
      id,
      -32602,
      `Unsupported protocol version: ${protocolVersion}. Server supports: ${supportedVersions.join(', ')}`
    );
    return;
  }

  initialized = true;
  clientInfo = client;

  log(`Initialized by ${client?.name || 'unknown'} v${client?.version || 'unknown'}`);
  log(`Protocol version: ${protocolVersion}`);

  sendResponse(id, {
    protocolVersion: protocolVersion, // Echo back the client's version
    capabilities: {
      tools: {} // Server provides tools
    },
    serverInfo: {
      name: 'figmatic-mcp-server',
      version: '1.0.0',
      description: 'Figma AI Agent Bridge - Progressive Disclosure API for design system automation'
    }
  });
}

/**
 * Handle tools/list request
 */
function handleToolsList(id) {
  const tools = getToolCatalog();

  log(`Listing ${tools.length} available tools`);

  sendResponse(id, {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  });
}

/**
 * Handle tools/call request
 */
async function handleToolsCall(id, params) {
  const { name, arguments: args } = params || {};
  const startTime = Date.now();

  // Validate required parameter
  if (!name) {
    sendError(id, -32602, 'Missing required parameter: name');
    return;
  }

  log(`Executing tool: ${name}`);

  // Log tool call start
  logToolCall({
    requestId: id,
    toolName: name,
    arguments: args,
    status: 'started'
  });

  try {
    // Create API context
    const api = createAPIContext();

    // Check Figma connection
    if (!api.isConnected || !api.isConnected()) {
      const duration = Date.now() - startTime;

      logToolCall({
        requestId: id,
        toolName: name,
        arguments: args,
        status: 'error',
        error: {
          code: -32001,
          message: 'Figma plugin not connected'
        },
        duration
      });

      sendError(
        id,
        -32001,
        'Figma plugin not connected. Please open Figma Desktop and run the "AI Agent Bridge" plugin.',
        { hint: 'Start the Figma plugin first, then retry this tool call' }
      );
      return;
    }

    // Progress callback (for future streaming support)
    const sendProgress = (data) => {
      log(`Progress: ${JSON.stringify(data)}`);
    };

    // Execute tool
    const result = await executeTool(name, args, sendProgress, api);
    const duration = Date.now() - startTime;

    // Log success
    logToolCall({
      requestId: id,
      toolName: name,
      arguments: args,
      status: 'success',
      result,
      duration
    });

    log(`Tool ${name} completed in ${duration}ms`);

    // Send result
    sendResponse(id, {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }
      ],
      isError: false
    });

  } catch (error) {
    const duration = Date.now() - startTime;

    // Log error
    logToolCall({
      requestId: id,
      toolName: name,
      arguments: args,
      status: 'error',
      error: {
        code: error.code || -32000,
        message: error.message || 'Tool execution failed',
        stack: error.stack
      },
      duration
    });

    log(`Tool ${name} failed: ${error.message}`, 'error');

    sendError(
      id,
      error.code || -32000,
      error.message || 'Tool execution failed',
      error.stack ? { stack: error.stack } : undefined
    );
  }
}

/**
 * Process a JSON-RPC request
 */
async function processRequest(request) {
  const { method, params, id } = request;

  // Validate JSON-RPC format
  if (!method || id === undefined) {
    sendError(null, -32600, 'Invalid Request - missing method or id');
    return;
  }

  // Route to handler
  switch (method) {
    case 'initialize':
      handleInitialize(id, params);
      break;

    case 'tools/list':
      handleToolsList(id);
      break;

    case 'tools/call':
      await handleToolsCall(id, params);
      break;

    case 'ping':
      // Health check
      sendResponse(id, { status: 'ok' });
      break;

    default:
      sendError(id, -32601, `Method not found: ${method}`);
  }
}

/**
 * Main stdin processor
 */
function startStdioServer() {
  let buffer = '';

  process.stdin.setEncoding('utf8');

  process.stdin.on('data', async (chunk) => {
    buffer += chunk;

    // Process complete JSON-RPC messages (newline-delimited)
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const request = JSON.parse(line);
        await processRequest(request);
      } catch (error) {
        log(`Failed to parse request: ${error.message}`, 'error');
        sendError(null, -32700, 'Parse error', { details: error.message });
      }
    }
  });

  process.stdin.on('end', () => {
    log('Stdin closed, shutting down gracefully');
    cleanup();
    process.exit(0);
  });

  process.stdin.on('error', (error) => {
    log(`Stdin error: ${error.message}`, 'error');
    cleanup();
    process.exit(1);
  });
}

/**
 * Cleanup on shutdown
 */
function cleanup() {
  log('Shutting down MCP server');
  // WebSocket server cleanup is handled by its own process handlers
}

/**
 * Graceful shutdown handlers
 */
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully');
  cleanup();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully');
  cleanup();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'error');
  log(error.stack, 'error');
  cleanup();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at ${promise}: ${reason}`, 'error');
  cleanup();
  process.exit(1);
});

/**
 * Startup
 */
(async () => {
  try {
    // Startup banner (to stderr)
    log('╔════════════════════════════════════════╗');
    log('║   Figmatic MCP Server (2024-11-05)    ║');
    log('╚════════════════════════════════════════╝');
    log('');
    log('Transport: Native stdio (industry standard)');

    // Get configured WebSocket port
    const wsPort = parseInt(process.env.FIGMA_WS_PORT || '8080', 10);
    log(`WebSocket Bridge: Starting on port ${wsPort}...`);

    // Start WebSocket bridge for Figma communication
    wsServer.startServer();

    log(`WebSocket Bridge: ✅ Running on ws://localhost:${wsPort}`);
    log('');

    // Count available tools
    const { countAndCategorizeTools } = require('./scripts/count-tools');
    const toolCounts = countAndCategorizeTools();
    log(`Tools Available: ${toolCounts.total} (${toolCounts.read} READ + ${toolCounts.write} WRITE)`);
    log('');
    log('Prerequisites:');
    log('  - Figma Desktop with "AI Agent Bridge" plugin active');
    log(`  - Plugin configured to connect to ws://localhost:${wsPort}`);
    log('');
    if (wsPort !== 8080) {
      log(`⚙️  Using custom port: ${wsPort} (set via FIGMA_WS_PORT)`);
      log('');
    }
    log('MCP Server ready - waiting for stdin...');
    log('');

    // Start stdio processor
    startStdioServer();

  } catch (error) {
    log(`Failed to start server: ${error.message}`, 'error');
    log(error.stack, 'error');
    process.exit(1);
  }
})();

module.exports = { processRequest };
