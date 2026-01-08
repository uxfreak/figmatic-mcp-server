/**
 * Figma AI Bridge WebSocket Server - Refactored
 * Clean, modular, testable architecture
 */

const WebSocket = require('ws');
const { createInitialState, setFigmaClient, removePendingRequest, clearPendingRequests } = require('./core/state');
const { processMessage } = require('./core/messageHandler');
const { executeInFigma } = require('./api/execute');
const { getFigmaContext } = require('./api/context');
const { notifyFigma, isConnected, getStatus } = require('./api/notify');
const { getAllVariables, getVariablesByType, getVariablesByCollection } = require('./api/variables');
const { createText, createStyledText, createAutoLayout, createRectangle } = require('./api/primitives');
const {
  getTextStyles,
  getPaintStyles,
  getEffectStyles,
  createTextStyle,
  createPaintStyle,
  createEffectStyle,
  applyTextStyle,
  applyFillStyle,
  applyStrokeStyle,
  applyEffectStyle
} = require('./api/styles');
const {
  createVariableCollection,
  createVariable,
  createVariableAlias,
  bindVariable,
  unbindVariable,
  bindVariableToPaint,
  getBoundVariables
} = require('./api/variablesAdvanced');

// ========================================
// STATE
// ========================================
let state = createInitialState();
let wss = null;

// ========================================
// LOGGER (stderr only - stdout is reserved for JSON-RPC)
// ========================================
const logger = {
  log: (message) => {
    process.stderr.write(`[${new Date().toLocaleTimeString()}] ${message}\n`);
  },
  error: (message, error) => {
    process.stderr.write(`[${new Date().toLocaleTimeString()}] ${message} ${error}\n`);
  }
};

// ========================================
// CONTEXT (for dependency injection)
// ========================================
function createContext() {
  return {
    state,
    setState: (newState) => { state = newState; },
    getState: () => state,
    logger
  };
}

// ========================================
// MESSAGE PROCESSOR
// ========================================
function handleMessage(ws, message) {
  const action = processMessage(message);

  if (!action) return;

  switch (action.type) {
    case 'SET_FIGMA_CLIENT':
      state = setFigmaClient(state, ws);
      logger.log('✓ Figma plugin connected successfully!');
      logger.log('✓ Bridge is now active - AI agents can send commands\n');
      break;

    case 'RESOLVE_REQUEST':
      const { state: newState, resolver } = removePendingRequest(state, action.requestId);
      state = newState;

      if (resolver) {
        if (action.success) {
          logger.log(`✓ Execution successful (request: ${action.requestId})`);
          resolver.resolve({ success: true, result: action.result });
        } else {
          logger.log(`✗ Execution failed (request: ${action.requestId}): ${action.error}`);
          resolver.reject(new Error(action.error));
        }
      }
      break;

    case 'RESOLVE_CONTEXT':
      const { state: contextState, resolver: contextResolver } = removePendingRequest(state, action.requestId);
      state = contextState;

      if (contextResolver) {
        if (action.context) {
          logger.log(`✓ Context received (request: ${action.requestId})`);
          contextResolver.resolve({ context: action.context });
        } else {
          logger.log(`✗ Context retrieval failed (request: ${action.requestId}): ${action.error}`);
          contextResolver.reject(new Error(action.error));
        }
      }
      break;

    case 'INVALID_MESSAGE':
      logger.error('Invalid JSON received');
      break;

    case 'UNKNOWN_MESSAGE':
      logger.log(`Received: ${action.data.type}`);
      break;
  }
}

// ========================================
// SERVER SETUP
// ========================================
function startServer(port = null) {
  if (wss) return; // Already started

  // Use provided port, environment variable, or default to 8080
  const wsPort = port || parseInt(process.env.FIGMA_WS_PORT || '8080', 10);

  try {
    wss = new WebSocket.Server({
      port: wsPort,
      perMessageDeflate: false
    });

    // Startup banner (to stderr - stdout is reserved for JSON-RPC)
    process.stderr.write('╔════════════════════════════════════════╗\n');
    process.stderr.write('║   Figma AI Bridge WebSocket Server    ║\n');
    process.stderr.write('╚════════════════════════════════════════╝\n');
    process.stderr.write('\n');
    process.stderr.write(`Server running on ws://localhost:${wsPort}\n`);
    process.stderr.write('Waiting for connections...\n');
    process.stderr.write('\n');
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      process.stderr.write(`\n❌ ERROR: Port ${wsPort} is already in use!\n\n`);
      process.stderr.write('To fix this, either:\n');
      process.stderr.write(`1. Stop the process using port ${wsPort}\n`);
      process.stderr.write(`2. Use a different port by setting FIGMA_WS_PORT environment variable\n\n`);
      process.stderr.write('Example:\n');
      process.stderr.write('  export FIGMA_WS_PORT=8081\n\n');
      throw error;
    }
    throw error;
  }

  // Connection handler
  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    logger.log(`New client connected from ${clientIp}`);

    // Message handler
    ws.on('message', (message) => {
      handleMessage(ws, message);
    });

    // Disconnect handler
    ws.on('close', () => {
      logger.log('Client disconnected');

      if (ws === state.figmaClient) {
        state = setFigmaClient(state, null);
        logger.log('⚠ Figma plugin disconnected - waiting for reconnection...\n');

        // Reject all pending requests
        const { state: cleanedState, resolvers } = clearPendingRequests(state);
        state = cleanedState;

        resolvers.forEach(resolver => {
          resolver.reject(new Error('Figma plugin disconnected'));
        });
      }
    });

    // Error handler
    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
  });

  // Server error handler
  wss.on('error', (error) => {
    logger.error('Server error:', error);
  });

  process.stderr.write('✓ Server initialized successfully\n\n');
}

// Start server if this is the main module
if (require.main === module) {
  startServer();
}

// ========================================
// PUBLIC API (with context injection)
// ========================================
module.exports = {
  // Core APIs
  executeInFigma: (script) => executeInFigma(createContext(), script),
  getFigmaContext: () => getFigmaContext(createContext()),
  notifyFigma: (message, timeout) => notifyFigma(createContext(), message, timeout),
  isConnected: () => isConnected(createContext()),
  getStatus: () => getStatus(createContext()),

  // Variables API
  getAllVariables: () => getAllVariables(createContext()),
  getVariablesByType: (type) => getVariablesByType(createContext(), type),
  getVariablesByCollection: (name) => getVariablesByCollection(createContext(), name),

  // Primitives API
  createText: (options) => createText(createContext(), options),
  createStyledText: (segments, options) => createStyledText(createContext(), segments, options),
  createAutoLayout: (options) => createAutoLayout(createContext(), options),
  createRectangle: (options) => createRectangle(createContext(), options),

  // Styles API
  getTextStyles: () => getTextStyles(createContext()),
  getPaintStyles: () => getPaintStyles(createContext()),
  getEffectStyles: () => getEffectStyles(createContext()),
  createTextStyle: (options) => createTextStyle(createContext(), options),
  createPaintStyle: (options) => createPaintStyle(createContext(), options),
  createEffectStyle: (options) => createEffectStyle(createContext(), options),
  applyTextStyle: (nodeId, styleId) => applyTextStyle(createContext(), nodeId, styleId),
  applyFillStyle: (nodeId, styleId) => applyFillStyle(createContext(), nodeId, styleId),
  applyStrokeStyle: (nodeId, styleId) => applyStrokeStyle(createContext(), nodeId, styleId),
  applyEffectStyle: (nodeId, styleId) => applyEffectStyle(createContext(), nodeId, styleId),

  // Variables Advanced API
  createVariableCollection: (options) => createVariableCollection(createContext(), options),
  createVariable: (options) => createVariable(createContext(), options),
  createVariableAlias: (options) => createVariableAlias(createContext(), options),
  bindVariable: (options) => bindVariable(createContext(), options),
  unbindVariable: (options) => unbindVariable(createContext(), options),
  bindVariableToPaint: (options) => bindVariableToPaint(createContext(), options),
  getBoundVariables: (nodeId) => getBoundVariables(createContext(), nodeId),

  // Server control
  startServer
};
