/**
 * Session Config File Watcher
 * Watches ~/.figmatic/session.json for changes to switch active Figma file
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.figmatic');
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');
const DEBOUNCE_MS = 100; // Debounce rapid file changes

/**
 * Create session watcher
 * @param {Object} options - Watcher options
 * @param {Function} options.onSessionChange - Called when session changes (fileId, fileName)
 * @param {Object} options.logger - Logger instance
 * @returns {Object} Watcher instance
 */
function createSessionWatcher(options) {
  const { onSessionChange, logger } = options;

  let watcher = null;
  let debounceTimer = null;
  let lastFileId = null;

  /**
   * Read and parse session config
   * @returns {Object|null} Config object or null on error
   */
  function readSessionConfig() {
    try {
      if (!fs.existsSync(SESSION_FILE)) {
        return null;
      }

      const content = fs.readFileSync(SESSION_FILE, 'utf-8');
      const config = JSON.parse(content);

      // Validate required fields
      if (!config.activeFileId) {
        logger.log('⚠️ Session config missing activeFileId');
        return null;
      }

      return config;
    } catch (error) {
      // Ignore parse errors (file may be mid-write)
      return null;
    }
  }

  /**
   * Handle config file change (with debouncing)
   */
  function handleFileChange() {
    // Clear existing debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce to avoid thrashing on rapid changes
    debounceTimer = setTimeout(() => {
      const config = readSessionConfig();

      if (!config) {
        return;
      }

      const { activeFileId, activeFileName } = config;

      // Only switch if fileId actually changed
      if (activeFileId !== lastFileId) {
        lastFileId = activeFileId;
        logger.log(`📄 Session config changed: ${activeFileName || 'Unknown'} (${activeFileId})`);

        if (onSessionChange) {
          onSessionChange(activeFileId, activeFileName);
        }
      }
    }, DEBOUNCE_MS);
  }

  /**
   * Ensure config directory exists
   */
  function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
      try {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
        logger.log(`✓ Created config directory: ${CONFIG_DIR}`);
      } catch (error) {
        logger.error('Failed to create config directory:', error);
      }
    }
  }

  return {
    /**
     * Start watching session config file
     */
    start() {
      ensureConfigDir();

      // Read initial config if it exists
      const initialConfig = readSessionConfig();
      if (initialConfig) {
        lastFileId = initialConfig.activeFileId;
        logger.log(`📄 Initial session: ${initialConfig.activeFileName || 'Unknown'} (${lastFileId})`);
      } else {
        logger.log(`📄 No session config found at ${SESSION_FILE}`);
        logger.log(`   Waiting for Swift app to write session file...`);
      }

      // Watch for file changes
      try {
        // Watch the directory since the file might not exist yet
        watcher = fs.watch(CONFIG_DIR, (eventType, filename) => {
          // Only respond to changes to session.json
          // Handle both 'change' (file modified) and 'rename' (file created/deleted)
          if (filename === 'session.json' && (eventType === 'change' || eventType === 'rename')) {
            handleFileChange();
          }
        });

        logger.log(`✓ Session watcher started: ${SESSION_FILE}`);
      } catch (error) {
        logger.error('Failed to start session watcher:', error);
      }
    },

    /**
     * Stop watching session config file
     */
    stop() {
      if (watcher) {
        watcher.close();
        watcher = null;
        logger.log('✓ Session watcher stopped');
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    },

    /**
     * Get current session config
     * @returns {Object|null} Current config or null
     */
    getCurrentSession() {
      return readSessionConfig();
    }
  };
}

module.exports = { createSessionWatcher, SESSION_FILE, CONFIG_DIR };
