/**
 * MCP Initialize Handler
 *
 * Handles the initialize handshake for MCP protocol
 * Validates protocol version and returns server capabilities
 */

function handleInitialize(req, res, params) {
  const { protocolVersion, capabilities, clientInfo } = params || {};

  // Validate protocol version
  if (protocolVersion !== '2024-11-05') {
    return res.status(400).json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32602,
        message: `Unsupported protocol version: ${protocolVersion}. Server supports: 2024-11-05`
      }
    });
  }

  // Return successful initialization
  res.json({
    jsonrpc: '2.0',
    id: req.body.id,
    result: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}, // Server provides tools
        streaming: true // Server supports SSE streaming
      },
      serverInfo: {
        name: 'figmatic-progressive-disclosure',
        version: '1.0.0',
        description: 'Progressive Disclosure API for Figma design system analysis and automation'
      }
    }
  });
}

module.exports = { handleInitialize };
