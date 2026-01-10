/**
 * PartyKit WebSocket Transport
 * Connects to PartyKit cloud relay for multi-file and cross-network support
 */

const { PartySocket } = require('partysocket');

const FILE_TIMEOUT_MS = 30000; // 30 seconds - remove files that haven't announced

/**
 * Create PartyKit transport
 * @param {Object} options - Transport options
 * @param {Function} options.onConnection - Called when connected to session (proxy)
 * @param {Function} options.onDisconnection - Called when disconnected from session (proxy)
 * @param {Function} options.onMessage - Called when message received (proxy, message)
 * @param {Object} options.logger - Logger instance
 * @param {string} options.host - PartyKit host (default: env or figmatic-relay-experiment.uxfreak.partykit.dev)
 * @returns {Object} Transport instance
 */
function createPartyKitTransport(options) {
  const {
    onConnection,
    onDisconnection,
    onMessage,
    logger,
    host = process.env.PARTYKIT_HOST || 'figmatic-relay-experiment.uxfreak.partykit.dev'
  } = options;

  // State
  let discoverySocket = null;
  let sessionSocket = null;
  let activeFileId = null;
  let discoveredFiles = new Map(); // fileId -> { fileName, lastSeen }
  let sessionProxy = null; // Proxy object that looks like WebSocket

  /**
   * Create a proxy object that mimics WebSocket interface
   * This allows the rest of the code to treat PartyKit and local WS the same
   */
  function createSessionProxy(socket) {
    return {
      send: (data) => socket.send(data),
      close: () => socket.close(),
      isPartyKit: true, // Flag for state.js to recognize
      _socket: socket
    };
  }

  /**
   * Connect to session room for the active file
   */
  function connectToSessionRoom(fileId) {
    if (sessionSocket) {
      logger.log(`Disconnecting from previous session room...`);
      sessionSocket.close();
      sessionSocket = null;
    }

    const sessionRoomId = `session-${fileId}`;
    const sessionUrl = `wss://${host}/parties/main/${sessionRoomId}`;

    logger.log(`📡 Connecting to session room: ${sessionRoomId}`);

    sessionSocket = new PartySocket({
      host,
      party: 'main',
      room: sessionRoomId
    });

    // Create proxy for state management
    sessionProxy = createSessionProxy(sessionSocket);

    sessionSocket.addEventListener('open', () => {
      logger.log(`✅ Connected to session room for file: ${fileId}`);

      // Notify parent of connection
      if (onConnection) onConnection(sessionProxy);

      // Send handshake
      sessionSocket.send(JSON.stringify({
        type: 'handshake',
        source: 'mcp-server'
      }));
    });

    sessionSocket.addEventListener('message', (event) => {
      // Forward to message handler
      if (onMessage) onMessage(sessionProxy, event.data);
    });

    sessionSocket.addEventListener('close', () => {
      logger.log(`Session room disconnected for file: ${fileId}`);

      // Notify parent of disconnection
      if (onDisconnection) onDisconnection(sessionProxy);

      sessionProxy = null;
    });

    sessionSocket.addEventListener('error', (error) => {
      logger.error('Session room error:', error);
    });
  }

  /**
   * Handle file announcement from discovery room
   */
  function handleFileAnnouncement(fileId, fileName) {
    const now = Date.now();
    const isNewFile = !discoveredFiles.has(fileId);

    // Update discovered files
    discoveredFiles.set(fileId, { fileName, lastSeen: now });

    if (isNewFile) {
      logger.log(`📢 New Figma file discovered: ${fileName} (${fileId})`);

      // If no active file, auto-select this one
      if (!activeFileId) {
        logger.log(`🔄 Auto-selecting file: ${fileName} (${fileId})`);
        activeFileId = fileId;
        connectToSessionRoom(fileId);
      }
    }
  }

  /**
   * Remove stale files that haven't announced recently
   */
  function pruneStaleFiles() {
    const now = Date.now();
    let removed = 0;

    for (const [fileId, fileInfo] of discoveredFiles.entries()) {
      if (now - fileInfo.lastSeen > FILE_TIMEOUT_MS) {
        logger.log(`⏱ Removing stale file: ${fileInfo.fileName} (${fileId})`);
        discoveredFiles.delete(fileId);
        removed++;

        // If this was the active file, disconnect and select another
        if (fileId === activeFileId) {
          activeFileId = null;
          if (sessionSocket) {
            sessionSocket.close();
            sessionSocket = null;
            sessionProxy = null;
          }

          // Try to select another file
          const files = Array.from(discoveredFiles.entries());
          if (files.length > 0) {
            const [newFileId, newFileInfo] = files[0];
            logger.log(`🔄 Switching to file: ${newFileInfo.fileName} (${newFileId})`);
            activeFileId = newFileId;
            connectToSessionRoom(newFileId);
          } else {
            logger.log(`⚠️ No active files available`);
          }
        }
      }
    }

    return removed;
  }

  /**
   * Connect to discovery room
   */
  function connectToDiscoveryRoom() {
    const discoveryRoomId = 'discovery';

    logger.log(`📡 Connecting to discovery room: wss://${host}/parties/main/${discoveryRoomId}`);

    discoverySocket = new PartySocket({
      host,
      party: 'main',
      room: discoveryRoomId
    });

    discoverySocket.addEventListener('open', () => {
      logger.log(`✅ Connected to PartyKit discovery room`);
      logger.log(`Listening for Figma file announcements...\n`);
    });

    discoverySocket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);

        // Handle file announcements
        if (message.type === 'figma-file-announce') {
          handleFileAnnouncement(message.fileId, message.fileName);
        }
      } catch (error) {
        logger.error('Failed to parse discovery message:', error);
      }
    });

    discoverySocket.addEventListener('close', () => {
      logger.log(`⚠️ Discovery room disconnected - reconnecting in 5s...`);

      setTimeout(() => {
        if (discoverySocket) {
          connectToDiscoveryRoom();
        }
      }, 5000);
    });

    discoverySocket.addEventListener('error', (error) => {
      logger.error('Discovery room error:', error);
    });

    // Start pruning stale files every 15 seconds
    setInterval(() => {
      pruneStaleFiles();
    }, 15000);
  }

  return {
    /**
     * Start the PartyKit transport
     */
    async start() {
      // Startup banner
      process.stderr.write('╔════════════════════════════════════════╗\n');
      process.stderr.write('║   Figma AI Bridge - PARTYKIT MODE     ║\n');
      process.stderr.write('╚════════════════════════════════════════╝\n');
      process.stderr.write('\n');
      process.stderr.write(`PartyKit host: ${host}\n`);
      process.stderr.write('Waiting for Figma file announcements...\n');
      process.stderr.write('\n');

      // Connect to discovery room
      connectToDiscoveryRoom();

      logger.log('✓ PartyKit transport initialized successfully\n');
    },

    /**
     * Stop the PartyKit transport
     */
    stop() {
      logger.log('Stopping PartyKit transport...');

      if (discoverySocket) {
        discoverySocket.close();
        discoverySocket = null;
      }

      if (sessionSocket) {
        sessionSocket.close();
        sessionSocket = null;
        sessionProxy = null;
      }

      discoveredFiles.clear();
      activeFileId = null;

      logger.log('✓ PartyKit transport stopped');
    },

    /**
     * Get current state (for debugging)
     */
    getState() {
      return {
        activeFileId,
        discoveredFiles: Array.from(discoveredFiles.entries()).map(([fileId, info]) => ({
          fileId,
          fileName: info.fileName,
          lastSeen: new Date(info.lastSeen).toLocaleTimeString()
        }))
      };
    }
  };
}

module.exports = { createPartyKitTransport };
