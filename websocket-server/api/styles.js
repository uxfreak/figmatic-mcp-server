/**
 * Styles API - Text, Paint, and Effect Styles
 * Based on official Figma Plugin API research
 *
 * References:
 * - TextStyle: https://www.figma.com/plugin-docs/api/TextStyle/
 * - PaintStyle: https://www.figma.com/plugin-docs/api/PaintStyle/
 * - EffectStyle: https://www.figma.com/plugin-docs/api/EffectStyle/
 * - BaseStyle: https://www.figma.com/plugin-docs/api/BaseStyle/
 */

const { executeInFigma } = require('./execute');

// ============================================
// GET STYLES
// ============================================

/**
 * Get all local text styles
 * @param {Object} context - Execution context
 * @returns {Promise<Array>} Array of text styles with { id, name, type, ...properties }
 */
async function getTextStyles(context) {
  const script = `
    const styles = await figma.getLocalTextStylesAsync();

    return styles.map(style => ({
      id: style.id,
      name: style.name,
      type: style.type,
      fontSize: style.fontSize,
      fontName: style.fontName,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      textCase: style.textCase,
      textDecoration: style.textDecoration,
      paragraphIndent: style.paragraphIndent,
      paragraphSpacing: style.paragraphSpacing,
      description: style.description,
      remote: style.remote
    }));
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

/**
 * Get all local paint styles (for fills and strokes)
 * @param {Object} context - Execution context
 * @returns {Promise<Array>} Array of paint styles with { id, name, type, paints }
 */
async function getPaintStyles(context) {
  const script = `
    const styles = await figma.getLocalPaintStylesAsync();

    return styles.map(style => ({
      id: style.id,
      name: style.name,
      type: style.type,
      paints: style.paints,
      description: style.description,
      remote: style.remote
    }));
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

/**
 * Get all local effect styles (shadows, blurs)
 * @param {Object} context - Execution context
 * @returns {Promise<Array>} Array of effect styles with { id, name, type, effects }
 */
async function getEffectStyles(context) {
  const script = `
    const styles = await figma.getLocalEffectStylesAsync();

    return styles.map(style => ({
      id: style.id,
      name: style.name,
      type: style.type,
      effects: style.effects,
      description: style.description,
      remote: style.remote
    }));
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

// ============================================
// CREATE STYLES
// ============================================

/**
 * Create a text style
 * @param {Object} context - Execution context
 * @param {Object} options - Text style options
 * @param {string} options.name - Style name (can include folders: 'Typography/Heading/H1')
 * @param {number} options.fontSize - Font size in pixels
 * @param {Object} options.fontName - Font { family, style } (e.g., { family: 'Inter', style: 'Bold' })
 * @param {Object} options.lineHeight - Line height { value, unit: 'PIXELS'|'PERCENT'|'AUTO' }
 * @param {Object} options.letterSpacing - Letter spacing { value, unit: 'PIXELS'|'PERCENT' }
 * @param {string} options.textCase - 'ORIGINAL'|'UPPER'|'LOWER'|'TITLE'|'SMALL_CAPS'
 * @param {string} options.textDecoration - 'NONE'|'UNDERLINE'|'STRIKETHROUGH'
 * @param {number} options.paragraphIndent - First line indent
 * @param {number} options.paragraphSpacing - Space between paragraphs
 * @param {string} options.description - Optional description
 * @returns {Promise<Object>} Created text style { id, name, type }
 */
async function createTextStyle(context, options = {}) {
  const {
    name,
    fontSize = 16,
    fontName = { family: 'Inter', style: 'Regular' },
    lineHeight = { value: 100, unit: 'PERCENT' },
    letterSpacing = { value: 0, unit: 'PERCENT' },
    textCase = 'ORIGINAL',
    textDecoration = 'NONE',
    paragraphIndent = 0,
    paragraphSpacing = 0,
    description = ''
  } = options;

  if (!name) {
    throw new Error('Text style name is required');
  }

  const script = `
    const style = figma.createTextStyle();
    style.name = ${JSON.stringify(name)};
    style.fontSize = ${fontSize};
    style.fontName = ${JSON.stringify(fontName)};
    style.lineHeight = ${JSON.stringify(lineHeight)};
    style.letterSpacing = ${JSON.stringify(letterSpacing)};
    style.textCase = ${JSON.stringify(textCase)};
    style.textDecoration = ${JSON.stringify(textDecoration)};
    style.paragraphIndent = ${paragraphIndent};
    style.paragraphSpacing = ${paragraphSpacing};
    ${description ? `style.description = ${JSON.stringify(description)};` : ''}

    return {
      id: style.id,
      name: style.name,
      type: style.type
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

/**
 * Create a paint style (for fills or strokes)
 * @param {Object} context - Execution context
 * @param {Object} options - Paint style options
 * @param {string} options.name - Style name (can include folders: 'Colors/Brand/Primary')
 * @param {Array} options.paints - Array of Paint objects
 * @param {string} options.description - Optional description
 * @returns {Promise<Object>} Created paint style { id, name, type }
 *
 * @example
 * // Solid color
 * createPaintStyle(context, {
 *   name: 'Colors/Primary',
 *   paints: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 1 }, opacity: 1 }]
 * })
 *
 * @example
 * // Gradient
 * createPaintStyle(context, {
 *   name: 'Colors/Gradient',
 *   paints: [{
 *     type: 'GRADIENT_LINEAR',
 *     gradientStops: [
 *       { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
 *       { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
 *     ],
 *     gradientTransform: [[1, 0, 0], [0, 1, 0]]
 *   }]
 * })
 */
async function createPaintStyle(context, options = {}) {
  const {
    name,
    paints = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }],
    description = ''
  } = options;

  if (!name) {
    throw new Error('Paint style name is required');
  }

  const script = `
    const style = figma.createPaintStyle();
    style.name = ${JSON.stringify(name)};
    style.paints = ${JSON.stringify(paints)};
    ${description ? `style.description = ${JSON.stringify(description)};` : ''}

    return {
      id: style.id,
      name: style.name,
      type: style.type
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

/**
 * Create an effect style (shadows, blurs)
 * @param {Object} context - Execution context
 * @param {Object} options - Effect style options
 * @param {string} options.name - Style name (can include folders: 'Shadows/Card/Elevated')
 * @param {Array} options.effects - Array of Effect objects
 * @param {string} options.description - Optional description
 * @returns {Promise<Object>} Created effect style { id, name, type }
 *
 * @example
 * // Drop shadow
 * createEffectStyle(context, {
 *   name: 'Shadows/Card',
 *   effects: [{
 *     type: 'DROP_SHADOW',
 *     color: { r: 0, g: 0, b: 0, a: 0.15 },
 *     offset: { x: 0, y: 4 },
 *     radius: 8,
 *     spread: 0,
 *     visible: true,
 *     blendMode: 'NORMAL'
 *   }]
 * })
 *
 * @example
 * // Multiple shadows (up to 8 drop + 8 inner)
 * createEffectStyle(context, {
 *   name: 'Shadows/Complex',
 *   effects: [
 *     { type: 'DROP_SHADOW', color: {...}, offset: {...}, radius: 4 },
 *     { type: 'DROP_SHADOW', color: {...}, offset: {...}, radius: 16 },
 *     { type: 'INNER_SHADOW', color: {...}, offset: {...}, radius: 2 }
 *   ]
 * })
 */
async function createEffectStyle(context, options = {}) {
  const {
    name,
    effects = [{
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.25 },
      offset: { x: 0, y: 2 },
      radius: 4,
      visible: true,
      blendMode: 'NORMAL'
    }],
    description = ''
  } = options;

  if (!name) {
    throw new Error('Effect style name is required');
  }

  const script = `
    const style = figma.createEffectStyle();
    style.name = ${JSON.stringify(name)};
    style.effects = ${JSON.stringify(effects)};
    ${description ? `style.description = ${JSON.stringify(description)};` : ''}

    return {
      id: style.id,
      name: style.name,
      type: style.type
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

// ============================================
// APPLY STYLES TO NODES
// ============================================

/**
 * Apply text style to a text node
 * @param {Object} context - Execution context
 * @param {string} nodeId - ID of the text node
 * @param {string} styleId - ID of the text style (or style name to look up)
 * @returns {Promise<Object>} Result { success: true, nodeId, styleId }
 */
async function applyTextStyle(context, nodeId, styleId) {
  if (!nodeId || !styleId) {
    throw new Error('Both nodeId and styleId are required');
  }

  const script = `
    const node = figma.getNodeById(${JSON.stringify(nodeId)});
    if (!node) {
      throw new Error('Node not found: ${nodeId}');
    }

    if (node.type !== 'TEXT') {
      throw new Error('Node is not a text node (type: ' + node.type + ')');
    }

    // styleId can be an ID or a style name
    let resolvedStyleId = ${JSON.stringify(styleId)};

    // If it doesn't look like an ID, search for style by name
    if (!resolvedStyleId.includes(':')) {
      const styles = await figma.getLocalTextStylesAsync();
      const style = styles.find(s => s.name === resolvedStyleId);
      if (!style) {
        throw new Error('Text style not found: ' + resolvedStyleId);
      }
      resolvedStyleId = style.id;
    }

    await node.setTextStyleIdAsync(resolvedStyleId);

    return {
      success: true,
      nodeId: node.id,
      styleId: resolvedStyleId,
      styleName: node.textStyleId
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

/**
 * Apply fill style to a node
 * @param {Object} context - Execution context
 * @param {string} nodeId - ID of the node
 * @param {string} styleId - ID of the paint style (or style name to look up)
 * @returns {Promise<Object>} Result { success: true, nodeId, styleId }
 */
async function applyFillStyle(context, nodeId, styleId) {
  if (!nodeId || !styleId) {
    throw new Error('Both nodeId and styleId are required');
  }

  const script = `
    const node = figma.getNodeById(${JSON.stringify(nodeId)});
    if (!node) {
      throw new Error('Node not found: ${nodeId}');
    }

    // styleId can be an ID or a style name
    let resolvedStyleId = ${JSON.stringify(styleId)};

    // If it doesn't look like an ID, search for style by name
    if (!resolvedStyleId.includes(':')) {
      const styles = await figma.getLocalPaintStylesAsync();
      const style = styles.find(s => s.name === resolvedStyleId);
      if (!style) {
        throw new Error('Paint style not found: ' + resolvedStyleId);
      }
      resolvedStyleId = style.id;
    }

    await node.setFillStyleIdAsync(resolvedStyleId);

    return {
      success: true,
      nodeId: node.id,
      styleId: resolvedStyleId
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

/**
 * Apply stroke style to a node
 * @param {Object} context - Execution context
 * @param {string} nodeId - ID of the node
 * @param {string} styleId - ID of the paint style (or style name to look up)
 * @returns {Promise<Object>} Result { success: true, nodeId, styleId }
 */
async function applyStrokeStyle(context, nodeId, styleId) {
  if (!nodeId || !styleId) {
    throw new Error('Both nodeId and styleId are required');
  }

  const script = `
    const node = figma.getNodeById(${JSON.stringify(nodeId)});
    if (!node) {
      throw new Error('Node not found: ${nodeId}');
    }

    // styleId can be an ID or a style name
    let resolvedStyleId = ${JSON.stringify(styleId)};

    // If it doesn't look like an ID, search for style by name
    if (!resolvedStyleId.includes(':')) {
      const styles = await figma.getLocalPaintStylesAsync();
      const style = styles.find(s => s.name === resolvedStyleId);
      if (!style) {
        throw new Error('Paint style not found: ' + resolvedStyleId);
      }
      resolvedStyleId = style.id;
    }

    await node.setStrokeStyleIdAsync(resolvedStyleId);

    return {
      success: true,
      nodeId: node.id,
      styleId: resolvedStyleId
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

/**
 * Apply effect style to a node
 * @param {Object} context - Execution context
 * @param {string} nodeId - ID of the node
 * @param {string} styleId - ID of the effect style (or style name to look up)
 * @returns {Promise<Object>} Result { success: true, nodeId, styleId }
 */
async function applyEffectStyle(context, nodeId, styleId) {
  if (!nodeId || !styleId) {
    throw new Error('Both nodeId and styleId are required');
  }

  const script = `
    const node = figma.getNodeById(${JSON.stringify(nodeId)});
    if (!node) {
      throw new Error('Node not found: ${nodeId}');
    }

    // styleId can be an ID or a style name
    let resolvedStyleId = ${JSON.stringify(styleId)};

    // If it doesn't look like an ID, search for style by name
    if (!resolvedStyleId.includes(':')) {
      const styles = await figma.getLocalEffectStylesAsync();
      const style = styles.find(s => s.name === resolvedStyleId);
      if (!style) {
        throw new Error('Effect style not found: ' + resolvedStyleId);
      }
      resolvedStyleId = style.id;
    }

    await node.setEffectStyleIdAsync(resolvedStyleId);

    return {
      success: true,
      nodeId: node.id,
      styleId: resolvedStyleId
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

module.exports = {
  // Get styles
  getTextStyles,
  getPaintStyles,
  getEffectStyles,

  // Create styles
  createTextStyle,
  createPaintStyle,
  createEffectStyle,

  // Apply styles
  applyTextStyle,
  applyFillStyle,
  applyStrokeStyle,
  applyEffectStyle
};
