/**
 * Variables API - Advanced Operations (Create, Bind)
 * Based on official Figma Plugin API research
 *
 * References:
 * - Working with Variables: https://developers.figma.com/docs/plugins/working-with-variables/
 * - setBoundVariable: https://developers.figma.com/docs/plugins/api/properties/nodes-setboundvariable/
 * - Variable: https://developers.figma.com/docs/plugins/api/Variable/
 */

const { executeInFigma } = require('./execute');

// ============================================
// CREATE VARIABLE COLLECTIONS & VARIABLES
// ============================================

/**
 * Create a variable collection with modes
 * @param {Object} context - Execution context
 * @param {Object} options - Collection options
 * @param {string} options.name - Collection name
 * @param {Array<string>} options.modes - Array of mode names (default: ['Mode 1'])
 * @returns {Promise<Object>} Created collection { id, name, modes: [{ modeId, name }] }
 *
 * @example
 * createVariableCollection(context, {
 *   name: 'Design Tokens',
 *   modes: ['Light', 'Dark']
 * })
 */
async function createVariableCollection(context, options = {}) {
  const {
    name,
    modes = ['Mode 1']
  } = options;

  if (!name) {
    throw new Error('Collection name is required');
  }

  const script = `
    const collection = figma.variables.createVariableCollection(${JSON.stringify(name)});

    // Rename first mode and add additional modes
    const modeNames = ${JSON.stringify(modes)};
    collection.renameMode(collection.modes[0].modeId, modeNames[0]);

    // Add additional modes if specified
    for (let i = 1; i < modeNames.length; i++) {
      const newMode = collection.addMode(modeNames[i]);
    }

    return {
      id: collection.id,
      name: collection.name,
      modes: collection.modes.map(m => ({ modeId: m.modeId, name: m.name }))
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

/**
 * Create a variable
 * @param {Object} context - Execution context
 * @param {Object} options - Variable options
 * @param {string} options.name - Variable name (can include slashes: 'colors/primary')
 * @param {string} options.collectionId - Collection ID or name
 * @param {string} options.type - 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'
 * @param {Object} options.values - Object mapping mode names to values
 * @param {string} options.description - Optional description
 * @returns {Promise<Object>} Created variable { id, name, type, values }
 *
 * @example
 * // Single mode variable
 * createVariable(context, {
 *   name: 'colors/primary',
 *   collectionId: 'collection-id',
 *   type: 'COLOR',
 *   values: { 'Light': { r: 0.2, g: 0.5, b: 1, a: 1 } }
 * })
 *
 * @example
 * // Multi-mode variable
 * createVariable(context, {
 *   name: 'spacing/base',
 *   collectionId: 'collection-id',
 *   type: 'FLOAT',
 *   values: { 'Light': 8, 'Dark': 8 }
 * })
 */
async function createVariable(context, options = {}) {
  const {
    name,
    collectionId,
    type,
    values = {},
    description = ''
  } = options;

  if (!name || !collectionId || !type) {
    throw new Error('name, collectionId, and type are required');
  }

  if (!['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'].includes(type)) {
    throw new Error('type must be COLOR, FLOAT, STRING, or BOOLEAN');
  }

  const script = `
    // Find collection by ID or name
    let collection;
    const collectionRef = ${JSON.stringify(collectionId)};

    if (collectionRef.includes(':')) {
      // It's an ID
      collection = figma.variables.getVariableCollectionById(collectionRef);
    } else {
      // It's a name - search for it
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      collection = collections.find(c => c.name === collectionRef);
    }

    if (!collection) {
      throw new Error('Collection not found: ' + collectionRef);
    }

    // Create variable
    const variable = figma.variables.createVariable(
      ${JSON.stringify(name)},
      collection,
      ${JSON.stringify(type)}
    );

    ${description ? `variable.description = ${JSON.stringify(description)};` : ''}

    // Set values for each mode
    const values = ${JSON.stringify(values)};

    for (const mode of collection.modes) {
      const value = values[mode.name];
      if (value !== undefined) {
        variable.setValueForMode(mode.modeId, value);
      }
    }

    return {
      id: variable.id,
      name: variable.name,
      type: variable.resolvedType,
      collectionId: variable.variableCollectionId,
      values: variable.valuesByMode
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

/**
 * Create a variable alias (reference to another variable)
 * @param {Object} context - Execution context
 * @param {Object} options - Alias options
 * @param {string} options.name - New variable name
 * @param {string} options.collectionId - Collection ID or name
 * @param {string} options.type - Variable type (must match target variable)
 * @param {string} options.targetVariableId - ID of variable to reference
 * @param {Object} options.modeMapping - Object mapping mode names to target variable ID
 * @returns {Promise<Object>} Created alias variable
 *
 * @example
 * createVariableAlias(context, {
 *   name: 'colors/secondary',
 *   collectionId: 'collection-id',
 *   type: 'COLOR',
 *   targetVariableId: 'primary-color-id',
 *   modeMapping: { 'Light': 'primary-color-id', 'Dark': 'primary-color-id' }
 * })
 */
async function createVariableAlias(context, options = {}) {
  const {
    name,
    collectionId,
    type,
    targetVariableId,
    modeMapping = {}
  } = options;

  if (!name || !collectionId || !type) {
    throw new Error('name, collectionId, and type are required');
  }

  const script = `
    // Find collection
    let collection;
    const collectionRef = ${JSON.stringify(collectionId)};

    if (collectionRef.includes(':')) {
      collection = figma.variables.getVariableCollectionById(collectionRef);
    } else {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      collection = collections.find(c => c.name === collectionRef);
    }

    if (!collection) {
      throw new Error('Collection not found: ' + collectionRef);
    }

    // Create variable
    const variable = figma.variables.createVariable(
      ${JSON.stringify(name)},
      collection,
      ${JSON.stringify(type)}
    );

    // Set alias values for each mode
    const modeMapping = ${JSON.stringify(modeMapping)};
    const defaultTargetId = ${JSON.stringify(targetVariableId)};

    for (const mode of collection.modes) {
      const targetId = modeMapping[mode.name] || defaultTargetId;
      const aliasValue = {
        type: 'VARIABLE_ALIAS',
        id: targetId
      };
      variable.setValueForMode(mode.modeId, aliasValue);
    }

    return {
      id: variable.id,
      name: variable.name,
      type: variable.resolvedType,
      isAlias: true
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

// ============================================
// BIND VARIABLES TO NODE PROPERTIES
// ============================================

/**
 * Bind a variable to a simple node field
 * @param {Object} context - Execution context
 * @param {Object} options - Binding options
 * @param {string} options.nodeId - Node ID
 * @param {string} options.field - Field name (width, height, opacity, itemSpacing, etc.)
 * @param {string} options.variableId - Variable ID or name
 * @returns {Promise<Object>} Result { success: true, nodeId, field, variableId }
 *
 * @example
 * bindVariable(context, {
 *   nodeId: 'rect-id',
 *   field: 'width',
 *   variableId: 'width-variable-id'
 * })
 */
async function bindVariable(context, options = {}) {
  const { nodeId, field, variableId } = options;

  if (!nodeId || !field || !variableId) {
    throw new Error('nodeId, field, and variableId are required');
  }

  const script = `
    const node = figma.getNodeById(${JSON.stringify(nodeId)});
    if (!node) {
      throw new Error('Node not found: ${nodeId}');
    }

    // Find variable by ID or name
    let variable;
    const variableRef = ${JSON.stringify(variableId)};

    if (variableRef.includes(':')) {
      variable = figma.variables.getVariableById(variableRef);
    } else {
      const variables = await figma.variables.getLocalVariablesAsync();
      variable = variables.find(v => v.name === variableRef);
    }

    if (!variable) {
      throw new Error('Variable not found: ' + variableRef);
    }

    // Bind variable to field
    node.setBoundVariable(${JSON.stringify(field)}, variable);

    return {
      success: true,
      nodeId: node.id,
      field: ${JSON.stringify(field)},
      variableId: variable.id,
      variableName: variable.name
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

/**
 * Unbind a variable from a node field
 * @param {Object} context - Execution context
 * @param {Object} options - Unbind options
 * @param {string} options.nodeId - Node ID
 * @param {string} options.field - Field name to unbind
 * @returns {Promise<Object>} Result { success: true, nodeId, field }
 */
async function unbindVariable(context, options = {}) {
  const { nodeId, field } = options;

  if (!nodeId || !field) {
    throw new Error('nodeId and field are required');
  }

  const script = `
    const node = figma.getNodeById(${JSON.stringify(nodeId)});
    if (!node) {
      throw new Error('Node not found: ${nodeId}');
    }

    node.setBoundVariable(${JSON.stringify(field)}, null);

    return {
      success: true,
      nodeId: node.id,
      field: ${JSON.stringify(field)}
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

/**
 * Bind a variable to a fill or stroke color
 * @param {Object} context - Execution context
 * @param {Object} options - Binding options
 * @param {string} options.nodeId - Node ID
 * @param {number} options.paintIndex - Index in fills or strokes array (default: 0)
 * @param {string} options.variableId - Variable ID or name (must be COLOR type)
 * @param {boolean} options.isFill - true for fills, false for strokes (default: true)
 * @returns {Promise<Object>} Result { success: true, nodeId, variableId }
 *
 * @example
 * bindVariableToPaint(context, {
 *   nodeId: 'rect-id',
 *   paintIndex: 0,
 *   variableId: 'color-variable-id',
 *   isFill: true
 * })
 */
async function bindVariableToPaint(context, options = {}) {
  const {
    nodeId,
    paintIndex = 0,
    variableId,
    isFill = true
  } = options;

  if (!nodeId || !variableId) {
    throw new Error('nodeId and variableId are required');
  }

  const script = `
    const node = figma.getNodeById(${JSON.stringify(nodeId)});
    if (!node) {
      throw new Error('Node not found: ${nodeId}');
    }

    // Find variable
    let variable;
    const variableRef = ${JSON.stringify(variableId)};

    if (variableRef.includes(':')) {
      variable = figma.variables.getVariableById(variableRef);
    } else {
      const variables = await figma.variables.getLocalVariablesAsync();
      variable = variables.find(v => v.name === variableRef);
    }

    if (!variable) {
      throw new Error('Variable not found: ' + variableRef);
    }

    if (variable.resolvedType !== 'COLOR') {
      throw new Error('Variable must be COLOR type, got: ' + variable.resolvedType);
    }

    // Get paints array (fills or strokes)
    const isFill = ${isFill};
    const paintsArray = isFill ? node.fills : node.strokes;

    if (!Array.isArray(paintsArray) || paintsArray.length === 0) {
      throw new Error('Node has no ' + (isFill ? 'fills' : 'strokes'));
    }

    const paintIndex = ${paintIndex};
    if (paintIndex >= paintsArray.length) {
      throw new Error('Paint index out of bounds: ' + paintIndex + ' (length: ' + paintsArray.length + ')');
    }

    // Clone paints array (immutable)
    const paintsCopy = [...paintsArray];

    // Bind variable to paint
    paintsCopy[paintIndex] = figma.variables.setBoundVariableForPaint(
      paintsCopy[paintIndex],
      'color',
      variable
    );

    // Apply back to node
    if (isFill) {
      node.fills = paintsCopy;
    } else {
      node.strokes = paintsCopy;
    }

    return {
      success: true,
      nodeId: node.id,
      variableId: variable.id,
      variableName: variable.name,
      paintType: isFill ? 'fill' : 'stroke',
      paintIndex: paintIndex
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

/**
 * Get all bound variables for a node
 * @param {Object} context - Execution context
 * @param {string} nodeId - Node ID
 * @returns {Promise<Object>} Object mapping field names to { variableId, variableName, type }
 *
 * @example
 * // Returns: { width: { variableId: '...', variableName: 'spacing/width', type: 'FLOAT' } }
 * getBoundVariables(context, 'node-id')
 */
async function getBoundVariables(context, nodeId) {
  if (!nodeId) {
    throw new Error('nodeId is required');
  }

  const script = `
    const node = figma.getNodeById(${JSON.stringify(nodeId)});
    if (!node) {
      throw new Error('Node not found: ${nodeId}');
    }

    const boundVars = node.boundVariables || {};
    const result = {};

    for (const [field, binding] of Object.entries(boundVars)) {
      if (binding && binding.id) {
        const variable = figma.variables.getVariableById(binding.id);
        if (variable) {
          result[field] = {
            variableId: variable.id,
            variableName: variable.name,
            type: variable.resolvedType
          };
        }
      }
    }

    return result;
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

module.exports = {
  // Create collections & variables
  createVariableCollection,
  createVariable,
  createVariableAlias,

  // Bind variables
  bindVariable,
  unbindVariable,
  bindVariableToPaint,
  getBoundVariables
};
