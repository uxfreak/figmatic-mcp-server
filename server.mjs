#!/usr/bin/env node
/**
 * Figmatic MCP Server - Official SDK Implementation
 *
 * Production-ready MCP server using @modelcontextprotocol/sdk:
 * - Official SDK Server and StdioServerTransport
 * - Embedded WebSocket bridge for Figma Plugin API
 * - Production-ready error handling
 * - Proper logging to stderr (never stdout)
 * - Graceful shutdown
 *
 * Protocol: MCP v2024-11-05 (stdio transport)
 * Architecture:
 *   - Stdin: JSON-RPC requests from Claude Code (via SDK)
 *   - Stdout: JSON-RPC responses to Claude Code (via SDK)
 *   - Stderr: Server logs and diagnostics
 *   - Port 8080: WebSocket bridge to Figma Plugin
 *
 * This uses the official SDK pattern from:
 *   @modelcontextprotocol/server-github
 *   @modelcontextprotocol/server-postgres
 *   @modelcontextprotocol/server-filesystem
 *   chrome-devtools-mcp
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Note: Using dynamic imports for CommonJS modules
let getToolCatalog, executeTool, createAPIContext, logToolCall, wsServer;

/**
 * Log to stderr (never stdout - that's reserved for JSON-RPC)
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
  process.stderr.write(`[${timestamp}] ${prefix} ${message}\n`);
}

/**
 * Main server initialization
 */
async function main() {
  try {
    // Import CommonJS modules (they expose exports via default)
    const toolsModule = await import('./tools/index.js');
    getToolCatalog = toolsModule.default?.getToolCatalog || toolsModule.getToolCatalog;
    executeTool = toolsModule.default?.executeTool || toolsModule.executeTool;

    const contextModule = await import('./utils/context.js');
    createAPIContext = contextModule.default?.createAPIContext || contextModule.createAPIContext;

    const loggerModule = await import('./utils/logger.js');
    logToolCall = loggerModule.default?.logToolCall || loggerModule.logToolCall;

    // Start embedded WebSocket bridge
    const wsServerModule = await import('./bridge/server.js');
    wsServer = wsServerModule.default || wsServerModule;

    // Startup banner (to stderr)
    log('╔════════════════════════════════════════╗');
    log('║   Figmatic MCP Server (Official SDK)  ║');
    log('╚════════════════════════════════════════╝');
    log('');
    log('Transport: Official @modelcontextprotocol/sdk');

    // Get configured WebSocket port
    const wsPort = parseInt(process.env.FIGMA_WS_PORT || '8080', 10);
    log(`WebSocket Bridge: Starting on port ${wsPort}...`);

    // Start WebSocket bridge for Figma communication
    wsServer.startServer();

    log(`WebSocket Bridge: ✅ Running on ws://localhost:${wsPort}`);
    log('');

    // Count available tools
    const countToolsModule = await import('./scripts/count-tools.js');
    const countAndCategorizeTools = countToolsModule.default?.countAndCategorizeTools || countToolsModule.countAndCategorizeTools;
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

    // Create MCP server instance
    const server = new Server(
      {
        name: 'figmatic-mcp-server',
        version: '1.0.0',
        description: 'Figma AI Agent Bridge - Progressive Disclosure API for design system automation'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Register tools/list handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = getToolCatalog();
      log(`Listing ${tools.length} available tools`);

      return {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });

    // Register tools/call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();

      log(`Executing tool: ${name}`);

      // Log tool call start
      logToolCall({
        requestId: request.params._meta?.requestId || 'unknown',
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
            requestId: request.params._meta?.requestId || 'unknown',
            toolName: name,
            arguments: args,
            status: 'error',
            error: {
              code: -32001,
              message: 'Figma plugin not connected'
            },
            duration
          });

          throw new Error(
            'Figma plugin not connected. Please open Figma Desktop and run the "AI Agent Bridge" plugin.'
          );
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
          requestId: request.params._meta?.requestId || 'unknown',
          toolName: name,
          arguments: args,
          status: 'success',
          result,
          duration
        });

        log(`Tool ${name} completed in ${duration}ms`);

        // Return result in MCP format
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ],
          isError: false
        };

      } catch (error) {
        const duration = Date.now() - startTime;

        // Log error
        logToolCall({
          requestId: request.params._meta?.requestId || 'unknown',
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

        // Re-throw error - SDK will handle JSON-RPC error formatting
        throw error;
      }
    });

    // Connect to stdio transport
    log('MCP Server ready - connecting to stdio transport...');
    log('');

    const transport = new StdioServerTransport();
    await server.connect(transport);

    log('✅ Connected to stdio transport - ready for requests');

  } catch (error) {
    log(`Failed to start server: ${error.message}`, 'error');
    log(error.stack, 'error');
    process.exit(1);
  }
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

// Start the server
main().catch((error) => {
  log(`Fatal error during startup: ${error.message}`, 'error');
  log(error.stack, 'error');
  process.exit(1);
});
