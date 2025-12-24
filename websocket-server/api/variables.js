/**
 * Variables API - Get all variables with modes and values
 * Based on Figma Plugin API documentation:
 * - https://developers.figma.com/docs/plugins/working-with-variables/
 * - https://www.figma.com/plugin-docs/api/Variable/
 * - https://www.figma.com/plugin-docs/api/VariableCollection/
 */

const { executeInFigma } = require('./execute');

/**
 * Get all local variables with complete details including modes and values
 * @param {Object} context - { state, setState, getState, logger }
 * @returns {Promise<Object>} Complete variables data
 */
async function getAllVariables(context) {
  const script = `
    // Get all local variables and collections
    const variables = await figma.variables.getLocalVariablesAsync();
    const collections = await figma.variables.getLocalVariableCollectionsAsync();

    // Helper function to check if value is an alias
    function isAlias(value) {
      return value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS';
    }

    // Helper function to resolve alias to variable name
    function resolveAliasName(aliasId, variablesMap) {
      const aliasedVar = variablesMap.get(aliasId);
      return aliasedVar ? aliasedVar.name : aliasId;
    }

    // Create a map for quick variable lookup
    const variablesMap = new Map(variables.map(v => [v.id, v]));

    // Process collections with their modes
    const collectionsData = collections.map(collection => {
      // Get variables in this collection
      const collectionVars = variables.filter(v => v.variableCollectionId === collection.id);

      return {
        id: collection.id,
        name: collection.name,
        modes: collection.modes.map(mode => ({
          modeId: mode.modeId,
          name: mode.name
        })),
        defaultModeId: collection.defaultModeId,
        variableCount: collectionVars.length,
        // Include info about extended collections (new Nov 2025 feature)
        remote: collection.remote || false,
        hiddenFromPublishing: collection.hiddenFromPublishing || false
      };
    });

    // Process variables with all mode values
    const variablesData = variables.map(variable => {
      const collection = collections.find(c => c.id === variable.variableCollectionId);

      // Get values for each mode
      const modeValues = {};

      if (collection) {
        collection.modes.forEach(mode => {
          const value = variable.valuesByMode[mode.modeId];

          // Handle different value types
          if (isAlias(value)) {
            // Value is an alias to another variable
            modeValues[mode.name] = {
              type: 'ALIAS',
              aliasTo: resolveAliasName(value.id, variablesMap),
              aliasId: value.id
            };
          } else if (value !== undefined) {
            // Direct value
            modeValues[mode.name] = {
              type: 'VALUE',
              value: value
            };
          }
        });
      }

      return {
        id: variable.id,
        name: variable.name,
        resolvedType: variable.resolvedType, // 'BOOLEAN' | 'COLOR' | 'FLOAT' | 'STRING'
        description: variable.description || '',
        collectionId: variable.variableCollectionId,
        collectionName: collection ? collection.name : 'Unknown',
        modeValues: modeValues,
        scopes: variable.scopes || [], // Where variable can be applied (e.g., ['ALL_FILLS'])
        hiddenFromPublishing: variable.hiddenFromPublishing || false,
        // Code syntax for referring to this variable
        codeSyntax: variable.codeSyntax || {}
      };
    });

    return {
      collections: collectionsData,
      variables: variablesData,
      summary: {
        totalCollections: collections.length,
        totalVariables: variables.length,
        variablesByType: {
          boolean: variables.filter(v => v.resolvedType === 'BOOLEAN').length,
          color: variables.filter(v => v.resolvedType === 'COLOR').length,
          float: variables.filter(v => v.resolvedType === 'FLOAT').length,
          string: variables.filter(v => v.resolvedType === 'STRING').length
        }
      }
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

/**
 * Get variables filtered by type
 * @param {Object} context - { state, setState, getState, logger }
 * @param {string} type - 'BOOLEAN' | 'COLOR' | 'FLOAT' | 'STRING'
 * @returns {Promise<Array>} Filtered variables
 */
async function getVariablesByType(context, type) {
  const allVars = await getAllVariables(context);
  return allVars.variables.filter(v => v.resolvedType === type);
}

/**
 * Get variables in a specific collection
 * @param {Object} context - { state, setState, getState, logger }
 * @param {string} collectionName - Name of the collection
 * @returns {Promise<Object>} Collection with its variables
 */
async function getVariablesByCollection(context, collectionName) {
  const allVars = await getAllVariables(context);
  const collection = allVars.collections.find(c => c.name === collectionName);

  if (!collection) {
    throw new Error(`Collection "${collectionName}" not found`);
  }

  const variables = allVars.variables.filter(v => v.collectionId === collection.id);

  return {
    collection,
    variables
  };
}

module.exports = {
  getAllVariables,
  getVariablesByType,
  getVariablesByCollection
};
