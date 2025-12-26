/**
 * Context API - Get current Figma file context
 */

const { generateRequestId, addPendingRequest, isClientConnected } = require('../core/state');
const { createContextRequest } = require('../core/messageHandler');

const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Get current Figma context
 * @param {Object} context - { state, setState, getState, logger }
 * @returns {Promise<Object>} Context data
 */
async function getFigmaContext(context) {
  const { state, setState, getState, logger } = context;

  if (!isClientConnected(state)) {
    throw new Error('Figma plugin not connected. Please open the plugin in Figma Desktop.');
  }

  const { state: newState, requestId } = generateRequestId(state);
  setState(newState);

  logger.log(`Requesting Figma context (request: ${requestId})`);

  return new Promise((resolve, reject) => {
    const stateWithRequest = addPendingRequest(
      newState,
      requestId,
      { resolve, reject }
    );
    setState(stateWithRequest);

    const command = createContextRequest(requestId);
    state.figmaClient.send(command);

    setTimeout(() => {
      const currentState = getState();
      if (currentState.pendingRequests.has(requestId)) {
        const { removePendingRequest } = require('../core/state');
        const { state: cleanedState } = removePendingRequest(currentState, requestId);
        setState(cleanedState);
        reject(new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`));
      }
    }, REQUEST_TIMEOUT);
  });
}

module.exports = { getFigmaContext };
