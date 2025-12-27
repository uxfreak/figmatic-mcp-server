/**
 * Execute API - High-level function for executing scripts in Figma
 * Handles side effects but uses pure core functions
 */

const { generateRequestId, addPendingRequest, isClientConnected } = require('../core/state');
const { createExecuteCommand } = require('../core/messageHandler');

const REQUEST_TIMEOUT = 300000; // 5 minutes

/**
 * Execute a script in Figma
 * @param {Object} context - { state, setState, logger }
 * @param {string} script - JavaScript code to execute
 * @returns {Promise<any>} Script execution result
 */
async function executeInFigma(context, script) {
  const { state, setState, logger } = context;

  // Check connection (pure function)
  if (!isClientConnected(state)) {
    throw new Error(
      'Figma plugin not connected. Please:\n' +
      '1. Open Figma Desktop App\n' +
      '2. Open any design file\n' +
      '3. Run the "AI Agent Bridge" plugin'
    );
  }

  // Generate request ID (pure function)
  const { state: newState, requestId } = generateRequestId(state);
  setState(newState);

  logger.log(`Executing script (request: ${requestId})`);
  logger.log(`Script preview: ${script.substring(0, 100)}...`);

  return new Promise((resolve, reject) => {
    // Add to pending requests (pure function)
    const stateWithRequest = addPendingRequest(
      newState,
      requestId,
      { resolve, reject }
    );
    setState(stateWithRequest);

    // Create command (pure function)
    const command = createExecuteCommand(script, requestId);

    // Send command (side effect)
    state.figmaClient.send(command);

    // Set timeout (side effect)
    setTimeout(() => {
      // Check if request is still pending
      const currentState = context.getState();
      if (currentState.pendingRequests.has(requestId)) {
        const { removePendingRequest } = require('../core/state');
        const { state: cleanedState } = removePendingRequest(currentState, requestId);
        setState(cleanedState);
        reject(new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`));
      }
    }, REQUEST_TIMEOUT);
  });
}

module.exports = { executeInFigma };
