/**
 * Transport Factory
 * Selects and creates the appropriate transport based on FIGMATIC_MODE environment variable
 */

const { createLocalTransport } = require('./local');
const { createPartyKitTransport } = require('./partykit');

/**
 * Create transport based on environment configuration
 * @param {Object} options - Transport options
 * @param {Function} options.onConnection - Called when client connects
 * @param {Function} options.onDisconnection - Called when client disconnects
 * @param {Function} options.onMessage - Called when message received
 * @param {Object} options.logger - Logger instance
 * @returns {Object} Transport instance
 */
function createTransport(options) {
  const mode = (process.env.FIGMATIC_MODE || 'local').toLowerCase();

  if (mode === 'partykit') {
    return createPartyKitTransport(options);
  } else if (mode === 'local') {
    return createLocalTransport(options);
  } else {
    throw new Error(`Invalid FIGMATIC_MODE: ${mode}. Must be 'local' or 'partykit'.`);
  }
}

/**
 * Get current transport mode
 * @returns {string} 'local' or 'partykit'
 */
function getTransportMode() {
  return (process.env.FIGMATIC_MODE || 'local').toLowerCase();
}

module.exports = {
  createTransport,
  getTransportMode
};
