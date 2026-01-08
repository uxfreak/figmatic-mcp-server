/**
 * Text Helpers
 *
 * Functional utilities for creating and configuring text nodes:
 * - Safe font loading
 * - Text style application
 * - Common text configurations
 * - Font weight name normalization
 */

/**
 * Normalize font style/weight names to match Figma's available styles
 *
 * Maps common UI-friendly weight names (like "SemiBold") to actual font style
 * names that exist in fonts. Handles the UX friction where designers/developers
 * expect names they see in Figma's UI dropdown to work in the API.
 *
 * @param {string} styleName - Font style/weight name (e.g., "SemiBold", "Bold")
 * @returns {Array<string>} Array of possible style names to try, in order of preference
 *
 * @example
 * normalizeFontStyle('SemiBold')
 * // => ['SemiBold', 'Semi Bold', 'Semibold', 'Medium', 'Demi Bold']
 *
 * @example
 * normalizeFontStyle('ExtraBold')
 * // => ['ExtraBold', 'Extra Bold', 'Extrabold', 'Black', 'Heavy']
 */
function normalizeFontStyle(styleName) {
  if (!styleName || typeof styleName !== 'string') {
    return ['Regular'];
  }

  // Normalize input: trim and handle case variations
  const normalized = styleName.trim();

  // If it's already a standard style, return it with common aliases
  const standardStyles = {
    'Thin': ['Thin', 'Hairline', 'Extra Thin'],
    'ExtraLight': ['ExtraLight', 'Extra Light', 'Extralight', 'Ultra Light', 'UltraLight'],
    'Light': ['Light'],
    'Regular': ['Regular', 'Normal', 'Book'],
    'Medium': ['Medium'],
    'SemiBold': ['SemiBold', 'Semi Bold', 'Semibold', 'Medium', 'Demi Bold', 'DemiBold'],
    'Bold': ['Bold'],
    'ExtraBold': ['ExtraBold', 'Extra Bold', 'Extrabold', 'Black', 'Heavy', 'Ultra Bold', 'UltraBold'],
    'Black': ['Black', 'Heavy', 'Extra Black', 'ExtraBlack', 'Ultra Black', 'UltraBlack']
  };

  // Check for exact match first (case-insensitive)
  for (const [standard, aliases] of Object.entries(standardStyles)) {
    if (standard.toLowerCase() === normalized.toLowerCase()) {
      return aliases;
    }
  }

  // Check if input matches any alias
  for (const [standard, aliases] of Object.entries(standardStyles)) {
    for (const alias of aliases) {
      if (alias.toLowerCase() === normalized.toLowerCase()) {
        return aliases;
      }
    }
  }

  // If no match, return the original with some common variations
  const originalLower = normalized.toLowerCase();
  const variations = [
    normalized,                                    // Original as-is
    normalized.replace(/\s+/g, ''),               // Remove spaces: "Semi Bold" -> "SemiBold"
    normalized.replace(/([a-z])([A-Z])/g, '$1 $2') // Add spaces: "SemiBold" -> "Semi Bold"
  ];

  // Add lowercase and title case versions
  variations.push(
    normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase() // Title case
  );

  // Remove duplicates and return
  return [...new Set(variations)];
}

/**
 * Generate JavaScript code for trying multiple font styles with fallback
 * Returns code that tries each style in order and uses the first that loads successfully
 *
 * @param {string} family - Font family name
 * @param {string} style - Font style/weight name (will be normalized)
 * @returns {string} JavaScript code for trying font styles
 *
 * @example
 * // Generate code for loading font with SemiBold style
 * const code = generateFontLoadingCode('Inter', 'SemiBold');
 * // Returns code that tries: SemiBold, Semi Bold, Semibold, Medium, etc.
 */
function generateFontLoadingCode(family, style) {
  const stylesToTry = normalizeFontStyle(style);

  return `
// Try multiple font style variations (normalized from "${style}")
const fontFamily = ${JSON.stringify(family)};
const stylesToTry = ${JSON.stringify(stylesToTry)};
let loadedFont = null;

for (const styleVariant of stylesToTry) {
  try {
    const fontName = { family: fontFamily, style: styleVariant };
    await figma.loadFontAsync(fontName);
    loadedFont = fontName;
    break; // Success! Use this style
  } catch (err) {
    // This style doesn't exist for this font, try next
    continue;
  }
}

if (!loadedFont) {
  throw new Error(\`Font "\${fontFamily}" does not have any of these styles: \${stylesToTry.join(', ')}. Please check available font styles in Figma.\`);
}
`.trim();
}

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
  normalizeFontStyle,
  generateFontLoadingCode,
  createTextWithStyle,
  createTextWithFont,
  updateText,
  updateInstanceText
};
