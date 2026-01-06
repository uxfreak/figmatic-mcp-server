/**
 * Request Logger
 *
 * Logs all MCP tool calls to JSONL file (one JSON object per line)
 * NO cleanup - all data preserved forever
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../tool-calls.jsonl');

/**
 * Log a tool call request
 * @param {Object} data - Log data
 * @param {string} data.requestId - Request ID
 * @param {string} data.toolName - Tool name
 * @param {Object} data.arguments - Tool arguments
 * @param {string} data.status - 'started' | 'success' | 'error'
 * @param {*} data.result - Tool result (if success)
 * @param {Object} data.error - Error details (if error)
 * @param {number} data.duration - Duration in ms (if completed)
 */
function logToolCall(data) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...data
  };

  // Append to JSONL file (one JSON object per line)
  const logLine = JSON.stringify(logEntry) + '\n';

  try {
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
  } catch (error) {
    console.error('[Logger] Failed to write to log file:', error.message);
  }
}

/**
 * Get log file path
 */
function getLogFilePath() {
  return LOG_FILE;
}

/**
 * Get log file stats
 */
function getLogStats() {
  try {
    const stats = fs.statSync(LOG_FILE);
    const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(l => l.trim()).length;

    return {
      exists: true,
      path: LOG_FILE,
      size: stats.size,
      sizeHuman: formatBytes(stats.size),
      totalCalls: lines,
      created: stats.birthtime,
      lastModified: stats.mtime
    };
  } catch (error) {
    return {
      exists: false,
      path: LOG_FILE,
      size: 0,
      totalCalls: 0
    };
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

module.exports = {
  logToolCall,
  getLogFilePath,
  getLogStats
};
