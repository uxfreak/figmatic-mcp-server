/**
 * WebSocket Bridge Context Wrapper
 *
 * Creates API context for tools to use the local WebSocket bridge
 * All dependencies are bundled within the MCP server (standalone)
 */

const path = require('path');

/**
 * Creates API context for tools
 * @returns {Object} API object with executeInFigma, lib functions, etc.
 */
function createAPIContext() {
  // Import local helper functions
  const lib = require('../helpers');

  // Import local WebSocket bridge functions
  const wsServer = require('../bridge/server');

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
