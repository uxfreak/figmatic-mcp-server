/**
 * Variable Helpers
 *
 * Functional utilities for working with Figma variables:
 * - Caching to prevent duplicate API calls
 * - Safe getters with error handling
 * - Batch operations
 */

/**
 * Create a variable cache instance
 * Caches getAllVariables() result to prevent duplicate API calls
 *
 * @returns {Object} Cache instance with getter methods
 *
 * @example
 * const varCache = createVariableCache();
 * const spacing4 = await varCache.get('Spacing/spacing-4', api.getAllVariables);
 */
function createVariableCache() {
  let cache = null;

  /**
   * Get all variables (cached)
   */
  async function getAll(getAllVariablesFn) {
    if (!cache) {
      cache = await getAllVariablesFn();
    }
    return cache;
  }

  /**
   * Get a single variable by name
   * Throws error if not found
   */
  async function get(name, getAllVariablesFn) {
    const allVars = await getAll(getAllVariablesFn);
    const variable = allVars.variables.find(v => v.name === name);

    if (!variable) {
      throw new Error(`Variable "${name}" not found. Available variables: ${allVars.variables.map(v => v.name).join(', ')}`);
    }

    return variable;
  }

  /**
   * Get multiple variables by name
   * Returns object with variable names as keys
   */
  async function getMany(names, getAllVariablesFn) {
    const allVars = await getAll(getAllVariablesFn);
    const result = {};
    const missing = [];

    for (const name of names) {
      const variable = allVars.variables.find(v => v.name === name);
      if (!variable) {
        missing.push(name);
      } else {
        result[name] = variable;
      }
    }

    if (missing.length > 0) {
      throw new Error(`Variables not found: ${missing.join(', ')}`);
    }

    return result;
  }

  /**
   * Clear the cache
   * Useful if variables are created/modified during script execution
   */
  function clear() {
    cache = null;
  }

  return {
    getAll,
    get,
    getMany,
    clear
  };
}

/**
 * Get a single variable by name (non-cached)
 * Functional helper without cache instance
 *
 * @param {string} name - Variable name (e.g., 'Spacing/spacing-4')
 * @param {Function} getAllVariablesFn - getAllVariables function
 * @returns {Promise<Object>} Variable object
 */
async function getVariable(name, getAllVariablesFn) {
  const allVars = await getAllVariablesFn();
  const variable = allVars.variables.find(v => v.name === name);

  if (!variable) {
    throw new Error(`Variable "${name}" not found`);
  }

  return variable;
}

/**
 * Get multiple variables by name (non-cached)
 *
 * @param {string[]} names - Array of variable names
 * @param {Function} getAllVariablesFn - getAllVariables function
 * @returns {Promise<Object>} Object with variable names as keys
 */
async function getVariables(names, getAllVariablesFn) {
  const allVars = await getAllVariablesFn();
  const result = {};
  const missing = [];

  for (const name of names) {
    const variable = allVars.variables.find(v => v.name === name);
    if (!variable) {
      missing.push(name);
    } else {
      result[name] = variable;
    }
  }

  if (missing.length > 0) {
    throw new Error(`Variables not found: ${missing.join(', ')}`);
  }

  return result;
}

module.exports = {
  createVariableCache,
  getVariable,
  getVariables
};
