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
// LOGGER
// ========================================
const logger = {
  log: (message) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
  },
  error: (message, error) => {
    console.error(`[${new Date().toLocaleTimeString()}] ${message}`, error);
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
function startServer() {
  if (wss) return; // Already started

  wss = new WebSocket.Server({
    port: 8080,
    perMessageDeflate: false
  });

  // Startup banner
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Figma AI Bridge WebSocket Server    ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log('Server running on ws://localhost:8080');
  console.log('Waiting for connections...');
  console.log('');

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

  console.log('✓ Server initialized successfully\n');
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
