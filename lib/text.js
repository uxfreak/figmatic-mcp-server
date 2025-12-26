/**
 * Text Helpers
 *
 * Functional utilities for creating and configuring text nodes:
 * - Safe font loading
 * - Text style application
 * - Common text configurations
 */

/**
 * Create a text node with a text style
 * Handles font loading complexity automatically
 *
 * Returns Figma script code to be used inside executeInFigma
 *
 * @param {string} textContent - Text content
 * @param {string} styleId - Text style ID
 * @param {Object} options - Configuration options
 * @param {string} options.layoutAlign - Layout align value
 * @param {string} options.textAlign - Text alignment ('LEFT' | 'CENTER' | 'RIGHT')
 * @param {string} options.name - Node name (default: 'Text')
 * @returns {string} Figma script code
 *
 * @example
 * // Inside executeInFigma:
 * const code = createTextWithStyle('Help', titleStyleId, {
 *   layoutAlign: 'STRETCH',
 *   textAlign: 'CENTER'
 * });
 * eval(code); // Creates 'text' variable
 */
function createTextWithStyle(textContent, styleId, options = {}) {
  const {
    layoutAlign = 'INHERIT',
    textAlign = 'LEFT',
    name = 'Text'
  } = options;

  const escapedText = textContent.replace(/'/g, "\\'").replace(/\n/g, '\\n');

  return `
const text = figma.createText();

// Load default font (text nodes default to Inter Regular)
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
text.characters = '${escapedText}';

// Get text style and load its font
const style = figma.getStyleById('${styleId}');
if (style && style.fontName) {
  await figma.loadFontAsync(style.fontName);
}

// Apply text style
text.textStyleId = '${styleId}';
text.name = '${name}';
text.layoutAlign = '${layoutAlign}';
text.textAlignHorizontal = '${textAlign}';
`.trim();
}

/**
 * Create a text node with manual font configuration
 * For when you don't have a text style
 *
 * @param {string} textContent - Text content
 * @param {Object} fontConfig - Font configuration
 * @param {string} fontConfig.family - Font family (e.g., 'DM Sans')
 * @param {string} fontConfig.style - Font style (e.g., 'SemiBold')
 * @param {number} fontConfig.size - Font size in pixels
 * @param {Object} options - Configuration options
 * @returns {string} Figma script code
 */
function createTextWithFont(textContent, fontConfig, options = {}) {
  const {
    layoutAlign = 'INHERIT',
    textAlign = 'LEFT',
    name = 'Text'
  } = options;

  const { family, style, size } = fontConfig;
  const escapedText = textContent.replace(/'/g, "\\'").replace(/\n/g, '\\n');

  return `
const text = figma.createText();

// Load the specified font
await figma.loadFontAsync({ family: '${family}', style: '${style}' });

text.characters = '${escapedText}';
text.fontName = { family: '${family}', style: '${style}' };
text.fontSize = ${size};
text.name = '${name}';
text.layoutAlign = '${layoutAlign}';
text.textAlignHorizontal = '${textAlign}';
`.trim();
}

/**
 * Update text in an existing text node
 * Handles font loading for the existing font
 *
 * @param {string} nodeId - Text node ID
 * @param {string} newText - New text content
 * @param {Function} executeInFigmaFn - executeInFigma function
 * @returns {Promise<void>}
 */
async function updateText(nodeId, newText, executeInFigmaFn) {
  const escapedText = newText.replace(/'/g, "\\'").replace(/\n/g, '\\n');

  await executeInFigmaFn(`
    const textNode = figma.getNodeById('${nodeId}');

    if (!textNode || textNode.type !== 'TEXT') {
      throw new Error('Node is not a text node');
    }

    // Load the existing font
    await figma.loadFontAsync(textNode.fontName);

    // Update text
    textNode.characters = '${escapedText}';

    return { success: true };
  `);
}

/**
 * Find and update text in a component instance
 * Useful for updating button labels, etc.
 *
 * @param {string} instanceId - Instance ID
 * @param {string} newText - New text content
 * @param {Function} executeInFigmaFn - executeInFigma function
 * @returns {Promise<void>}
 */
async function updateInstanceText(instanceId, newText, executeInFigmaFn) {
  const escapedText = newText.replace(/'/g, "\\'").replace(/\n/g, '\\n');

  await executeInFigmaFn(`
    const instance = figma.getNodeById('${instanceId}');

    if (!instance) {
      throw new Error('Instance not found');
    }

    // Find first text node in instance
    const textNode = instance.findOne(n => n.type === 'TEXT');

    if (!textNode) {
      throw new Error('No text node found in instance');
    }

    // Load the existing font
    await figma.loadFontAsync(textNode.fontName);

    // Update text
    textNode.characters = '${escapedText}';

    return { success: true };
  `);
}

module.exports = {
  createTextWithStyle,
  createTextWithFont,
  updateText,
  updateInstanceText
};
