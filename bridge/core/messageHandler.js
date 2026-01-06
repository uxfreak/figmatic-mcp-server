/**
 * Message Handler - Pure functions for processing WebSocket messages
 * All functions are pure and return actions to perform
 */

/**
 * Parse incoming message (pure)
 * @param {string|Buffer} message - Raw message
 * @returns {Object|null} Parsed data or null if invalid
 */
function parseMessage(message) {
  try {
    return JSON.parse(message.toString());
  } catch (error) {
    return null;
  }
}

/**
 * Handle handshake message (pure)
 * @param {Object} data - Parsed message data
 * @returns {Object|null} Action to perform or null
 */
function handleHandshake(data) {
  if (data.type === 'handshake' && data.source === 'figma-plugin') {
    return {
      type: 'SET_FIGMA_CLIENT',
      timestamp: data.timestamp,
      version: data.version
    };
  }
  return null;
}

/**
 * Handle execution result (pure)
 * @param {Object} data - Parsed message data
 * @returns {Object|null} Action to perform or null
 */
function handleExecutionResult(data) {
  if (data.type === 'execution-result') {
    return {
      type: 'RESOLVE_REQUEST',
      requestId: data.requestId,
      success: data.success,
      result: data.result,
      error: data.error,
      stack: data.stack
    };
  }
  return null;
}

/**
 * Handle context response (pure)
 * @param {Object} data - Parsed message data
 * @returns {Object|null} Action to perform or null
 */
function handleContextResponse(data) {
  if (data.type === 'context-response') {
    return {
      type: 'RESOLVE_CONTEXT',
      requestId: data.requestId,
      context: data.context,
      error: data.error
    };
  }
  return null;
}

/**
 * Process incoming message and determine action (pure)
 * @param {string|Buffer} message - Raw message
 * @returns {Object|null} Action to perform or null
 */
function processMessage(message) {
  const data = parseMessage(message);
  if (!data) {
    return { type: 'INVALID_MESSAGE', message };
  }

  // Try each handler in sequence
  return handleHandshake(data) ||
         handleExecutionResult(data) ||
         handleContextResponse(data) ||
         { type: 'UNKNOWN_MESSAGE', data };
}

/**
 * Create execute command (pure)
 * @param {string} script - JavaScript code to execute
 * @param {string} requestId - Request identifier
 * @returns {string} JSON message to send
 */
function createExecuteCommand(script, requestId) {
  return JSON.stringify({
    type: 'execute',
    script,
    requestId
  });
}

/**
 * Create context request (pure)
 * @param {string} requestId - Request identifier
 * @returns {string} JSON message to send
 */
function createContextRequest(requestId) {
  return JSON.stringify({
    type: 'get-context',
    requestId
  });
}

/**
 * Create notify command (pure)
 * @param {string} message - Notification message
 * @param {number} timeout - Display duration in ms
 * @returns {string} JSON message to send
 */
function createNotifyCommand(message, timeout = 3000) {
  return JSON.stringify({
    type: 'notify',
    message,
    timeout
  });
}

module.exports = {
  parseMessage,
  handleHandshake,
  handleExecutionResult,
  handleContextResponse,
  processMessage,
  createExecuteCommand,
  createContextRequest,
  createNotifyCommand
};
