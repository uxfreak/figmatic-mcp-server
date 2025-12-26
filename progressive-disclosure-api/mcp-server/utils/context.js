/**
 * WebSocket Bridge Context Wrapper
 *
 * Creates API context for tools to use the existing WebSocket bridge
 * Imports WebSocket server as module to reuse executeInFigma, getAllVariables, etc.
 */

// Import the WebSocket server (runs independently)
const path = require('path');
const wsServerPath = path.join(__dirname, '../../../websocket-server/server.js');

// Note: WebSocket server must be started separately before MCP server
// We just import it as a module to access its API functions

/**
 * Creates API context for tools
 * @returns {Object} API object with executeInFigma, lib functions, etc.
 */
function createAPIContext() {
  // Import lib functions
  const lib = require('../../../lib');

  // Import WebSocket server functions
  // Note: These require the WebSocket server to be running separately
  const wsServer = require(wsServerPath);

  return {
    // WebSocket bridge functions
    executeInFigma: wsServer.executeInFigma,
    getAllVariables: wsServer.getAllVariables,
    isConnected: wsServer.isConnected,

    // All lib helper functions
    ...lib
  };
}

module.exports = { createAPIContext };
