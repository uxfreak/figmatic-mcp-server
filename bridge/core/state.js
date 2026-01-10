/**
 * State Management - Pure functions for managing server state
 * No side effects, fully testable
 */

/**
 * Create initial state
 * @returns {Object} Initial state object
 */
function createInitialState() {
  return {
    figmaClient: null,
    requestCounter: 0,
    pendingRequests: new Map(),
    serverStartTime: Date.now()
  };
}

/**
 * Update Figma client connection (pure)
 * @param {Object} state - Current state
 * @param {WebSocket|null} client - New client connection
 * @returns {Object} New state
 */
function setFigmaClient(state, client) {
  return {
    ...state,
    figmaClient: client
  };
}

/**
 * Generate next request ID (pure)
 * @param {Object} state - Current state
 * @returns {Object} { state: newState, requestId: string }
 */
function generateRequestId(state) {
  const counter = state.requestCounter + 1;
  const requestId = `req-${counter}-${Date.now()}`;

  return {
    state: { ...state, requestCounter: counter },
    requestId
  };
}

/**
 * Add pending request (pure)
 * @param {Object} state - Current state
 * @param {string} requestId - Request identifier
 * @param {Object} resolver - { resolve, reject } functions
 * @returns {Object} New state
 */
function addPendingRequest(state, requestId, resolver) {
  const newPendingRequests = new Map(state.pendingRequests);
  newPendingRequests.set(requestId, resolver);

  return {
    ...state,
    pendingRequests: newPendingRequests
  };
}

/**
 * Remove pending request (pure)
 * @param {Object} state - Current state
 * @param {string} requestId - Request identifier
 * @returns {Object} { state: newState, resolver: object|undefined }
 */
function removePendingRequest(state, requestId) {
  const resolver = state.pendingRequests.get(requestId);
  const newPendingRequests = new Map(state.pendingRequests);
  newPendingRequests.delete(requestId);

  return {
    state: {
      ...state,
      pendingRequests: newPendingRequests
    },
    resolver
  };
}

/**
 * Clear all pending requests (pure)
 * @param {Object} state - Current state
 * @returns {Object} { state: newState, resolvers: Array }
 */
function clearPendingRequests(state) {
  const resolvers = Array.from(state.pendingRequests.values());

  return {
    state: {
      ...state,
      pendingRequests: new Map()
    },
    resolvers
  };
}

/**
 * Check if Figma client is connected (pure)
 * @param {Object} state - Current state
 * @returns {boolean}
 */
function isClientConnected(state) {
  if (state.figmaClient === null) return false;

  // Handle PartyKit proxy object (has isPartyKit flag)
  if (state.figmaClient.isPartyKit) {
    // PartyKit proxy is connected if it has a send function
    return typeof state.figmaClient.send === 'function';
  }

  // Handle regular WebSocket (check readyState)
  return state.figmaClient.readyState === 1; // WebSocket.OPEN
}

/**
 * Get server statistics (pure)
 * @param {Object} state - Current state
 * @returns {Object} Statistics object
 */
function getStats(state) {
  return {
    connected: isClientConnected(state),
    pendingRequests: state.pendingRequests.size,
    totalRequests: state.requestCounter,
    uptime: Date.now() - state.serverStartTime
  };
}

module.exports = {
  createInitialState,
  setFigmaClient,
  generateRequestId,
  addPendingRequest,
  removePendingRequest,
  clearPendingRequests,
  isClientConnected,
  getStats
};
