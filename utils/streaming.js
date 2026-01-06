/**
 * SSE Streaming Utilities
 *
 * Provides helpers for Server-Sent Events streaming used in MCP protocol
 */

/**
 * Creates an SSE stream wrapper for response object
 * @param {Response} res - Express response object
 * @returns {Object} Stream helper with sendEvent and close methods
 */
function createSSEStream(res) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  return {
    /**
     * Send an SSE event
     * @param {string} event - Event type
     * @param {Object} data - Event data (will be JSON stringified)
     */
    sendEvent(event, data) {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    },

    /**
     * Close the SSE stream
     */
    close() {
      res.end();
    }
  };
}

module.exports = { createSSEStream };
