/**
 * Notify API - Send notifications to Figma UI
 */

const { isClientConnected } = require('../core/state');
const { createNotifyCommand } = require('../core/messageHandler');

/**
 * Send notification to Figma
 * @param {Object} context - { state, logger }
 * @param {string} message - Notification message
 * @param {number} timeout - Display duration in ms
 */
function notifyFigma(context, message, timeout = 3000) {
  const { state, logger } = context;

  if (!isClientConnected(state)) {
    throw new Error('Figma plugin not connected');
  }

  const command = createNotifyCommand(message, timeout);
  state.figmaClient.send(command);

  logger.log(`Sent notification: "${message}"`);
}

/**
 * Check if Figma is connected (pure wrapper)
 * @param {Object} context - { state }
 * @returns {boolean}
 */
function isConnected(context) {
  return isClientConnected(context.state);
}

/**
 * Get server status (pure wrapper)
 * @param {Object} context - { state }
 * @returns {Object} Status information
 */
function getStatus(context) {
  const { getStats } = require('../core/state');
  return {
    ...getStats(context.state),
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  notifyFigma,
  isConnected,
  getStatus
};
