/**
 * Local WebSocket Transport
 * Creates a WebSocket server on localhost for direct plugin connections
 */

const WebSocket = require('ws');

/**
 * Create local WebSocket transport
 * @param {Object} options - Transport options
 * @param {Function} options.onConnection - Called when client connects (ws)
 * @param {Function} options.onDisconnection - Called when client disconnects (ws)
 * @param {Function} options.onMessage - Called when message received (ws, message)
 * @param {Object} options.logger - Logger instance
 * @param {number} options.port - Port to listen on (default: 8080)
 * @returns {Object} Transport instance
 */
function createLocalTransport(options) {
  const {
    onConnection,
    onDisconnection,
    onMessage,
    logger,
    port
  } = options;

  // Use provided port, environment variable, or default to 8080
  const wsPort = port || parseInt(process.env.FIGMA_WS_PORT || '8080', 10);

  let wss = null;

  return {
    /**
     * Start the local WebSocket server
     */
    async start() {
      if (wss) {
        logger.log('Local transport already started');
        return;
      }

      try {
        wss = new WebSocket.Server({
          port: wsPort,
          perMessageDeflate: false
        });

        // Startup banner
        process.stderr.write('╔════════════════════════════════════════╗\n');
        process.stderr.write('║   Figma AI Bridge - LOCAL MODE        ║\n');
        process.stderr.write('╚════════════════════════════════════════╝\n');
        process.stderr.write('\n');
        process.stderr.write(`WebSocket server running on ws://localhost:${wsPort}\n`);
        process.stderr.write('Waiting for Figma plugin connections...\n');
        process.stderr.write('\n');

        // Connection handler
        wss.on('connection', (ws, req) => {
          const clientIp = req.socket.remoteAddress;
          logger.log(`New client connected from ${clientIp}`);

          // Set flag for state handling
          ws.isPartyKit = false;

          // Notify parent of connection
          if (onConnection) onConnection(ws);

          // Message handler
          ws.on('message', (message) => {
            if (onMessage) onMessage(ws, message);
          });

          // Disconnect handler
          ws.on('close', () => {
            logger.log('Client disconnected');
            if (onDisconnection) onDisconnection(ws);
          });

          // Error handler
          ws.on('error', (error) => {
            logger.error('WebSocket error:', error);
          });
        });

        // Server error handler
        wss.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            process.stderr.write(`\n❌ ERROR: Port ${wsPort} is already in use!\n\n`);
            process.stderr.write('To fix this, either:\n');
            process.stderr.write(`1. Stop the process using port ${wsPort}\n`);
            process.stderr.write(`2. Use a different port by setting FIGMA_WS_PORT environment variable\n\n`);
            process.stderr.write('Example:\n');
            process.stderr.write('  export FIGMA_WS_PORT=8081\n\n');
            throw error;
          }
          logger.error('Server error:', error);
        });

        logger.log('✓ Local transport initialized successfully\n');
      } catch (error) {
        logger.error('Failed to start local transport:', error);
        throw error;
      }
    },

    /**
     * Stop the local WebSocket server
     */
    stop() {
      if (wss) {
        logger.log('Stopping local transport...');
        wss.close();
        wss = null;
        logger.log('✓ Local transport stopped');
      }
    }
  };
}

module.exports = { createLocalTransport };
