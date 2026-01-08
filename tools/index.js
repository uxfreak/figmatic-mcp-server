/**
 * Tool Catalog Registry
 *
 * Central registry of all MCP tools
 * Provides tool definitions and execution routing
 */

// Tool schemas
const schemas = require('./schemas');

// Tool implementations
const readTools = require('./read-tools');
const writeTools = require('./write-tools');
const iconTools = require('./icon-tools');

/**
 * Get complete tool catalog
 * @returns {Array} Array of tool definitions
 */
function getToolCatalog() {
  return schemas.getAllSchemas();
}

/**
 * Execute a tool by name
 * @param {string} name - Tool name
 * @param {Object} args - Tool arguments
 * @param {Function} sendProgress - Progress callback
 * @param {Object} api - API context
 * @returns {Promise<Object>} Tool result
 */
async function executeTool(name, args, sendProgress, api) {
  // Route to READ tools
  if (readTools[name]) {
    return await readTools[name](api, args, sendProgress);
  }

  // Route to WRITE tools (Phase 3)
  if (writeTools[name]) {
    return await writeTools[name](api, args, sendProgress);
  }

  // Route to ICON tools
  if (iconTools[name]) {
    return await iconTools[name](api, args, sendProgress);
  }

  // Tool not found
  throw {
    code: -32601,
    message: `Tool not found: ${name}`
  };
}

module.exports = {
  getToolCatalog,
  executeTool
};
