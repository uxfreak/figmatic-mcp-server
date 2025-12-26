/**
 * MCP Tools Call Handler
 *
 * Executes a tool and streams results via SSE
 * Handles tool execution, error handling, and progress updates
 */

const { executeTool } = require('../tools');
const { createSSEStream } = require('../utils/streaming');
const { createAPIContext } = require('../utils/context');

async function handleToolsCall(req, res, params) {
  const { name, arguments: args } = params;

  // Validate parameters
  if (!name) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32602,
        message: 'Missing required parameter: name'
      }
    });
  }

  // Setup SSE stream
  const stream = createSSEStream(res);

  try {
    // Create API context for tool execution
    const api = createAPIContext();

    // Check if Figma plugin is connected
    if (!api.isConnected || !api.isConnected()) {
      stream.sendEvent('error', {
        code: -32001,
        message: 'Figma plugin not connected. Please open Figma Desktop and run the "AI Agent Bridge" plugin.'
      });
      stream.close();
      return;
    }

    // Progress callback for streaming updates
    const sendProgress = (data) => {
      stream.sendEvent('progress', data);
    };

    // Execute tool
    const result = await executeTool(name, args, sendProgress, api);

    // Send result
    stream.sendEvent('result', result);
    stream.sendEvent('complete', { status: 'success' });
    stream.close();

  } catch (error) {
    // Handle errors
    stream.sendEvent('error', {
      code: error.code || -32000,
      message: error.message || 'Tool execution failed',
      data: error.stack ? { stack: error.stack } : undefined
    });
    stream.close();
  }
}

module.exports = { handleToolsCall };
