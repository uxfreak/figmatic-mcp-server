/**
 * Auto-Layout Helpers
 *
 * Functional utilities for creating auto-layout frames:
 * - Presets for common patterns
 * - Composable configuration
 * - Type-safe property setting
 */

/**
 * Create a vertical auto-layout frame
 * Returns Figma script code to be used inside executeInFigma
 *
 * @param {string} name - Frame name
 * @param {Object} options - Configuration options
 * @param {number} options.itemSpacing - Spacing between children
 * @param {number|Object} options.padding - Padding (number for all sides, or object)
 * @param {string} options.primaryAxisSizing - 'FIXED' | 'AUTO'
 * @param {string} options.counterAxisSizing - 'FIXED' | 'AUTO'
 * @param {string} options.primaryAlign - 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
 * @param {string} options.counterAlign - 'MIN' | 'CENTER' | 'MAX'
 * @param {string} options.layoutAlign - 'INHERIT' | 'STRETCH' | 'MIN' | 'CENTER' | 'MAX'
 * @param {number} options.layoutGrow - 0 | 1
 * @param {Array} options.fills - Fill array
 * @param {number} options.width - Fixed width
 * @param {number} options.height - Fixed height
 * @returns {string} Figma script code
 *
 * @example
 * // Inside executeInFigma:
 * const code = createVerticalFrame('Content', {
 *   itemSpacing: 20,
 *   padding: 16,
 *   layoutAlign: 'STRETCH'
 * });
 * eval(code); // Creates 'frame' variable
 */
function createVerticalFrame(name, options = {}) {
  const {
    itemSpacing = 0,
    padding = 0,
    primaryAxisSizing = 'AUTO',
    counterAxisSizing = 'FIXED',
    primaryAlign = 'MIN',
    counterAlign = 'MIN',
    layoutAlign = 'INHERIT',
    layoutGrow = 0,
    fills = [],
    width,
    height
  } = options;

  // Parse padding
  let paddingLeft, paddingRight, paddingTop, paddingBottom;

  if (typeof padding === 'number') {
    paddingLeft = paddingRight = paddingTop = paddingBottom = padding;
  } else {
    paddingLeft = padding.left || 0;
    paddingRight = padding.right || 0;
    paddingTop = padding.top || 0;
    paddingBottom = padding.bottom || 0;
  }

  return `
const frame = figma.createFrame();
frame.name = "${name}";
frame.layoutMode = 'VERTICAL';
frame.primaryAxisSizingMode = '${primaryAxisSizing}';
frame.counterAxisSizingMode = '${counterAxisSizing}';
frame.primaryAxisAlignItems = '${primaryAlign}';
frame.counterAxisAlignItems = '${counterAlign}';
frame.itemSpacing = ${itemSpacing};
frame.paddingLeft = ${paddingLeft};
frame.paddingRight = ${paddingRight};
frame.paddingTop = ${paddingTop};
frame.paddingBottom = ${paddingBottom};
frame.fills = ${JSON.stringify(fills)};
frame.layoutAlign = '${layoutAlign}';
frame.layoutGrow = ${layoutGrow};
${width ? `frame.resize(${width}, frame.height);` : ''}
${height ? `frame.resize(frame.width, ${height});` : ''}
`.trim();
}

/**
 * Create a horizontal auto-layout frame
 */
function createHorizontalFrame(name, options = {}) {
  const code = createVerticalFrame(name, options);
  return code.replace("layoutMode = 'VERTICAL'", "layoutMode = 'HORIZONTAL'");
}

/**
 * Create a content frame preset
 * Common pattern: vertical, auto-sizing, stretched, with padding
 *
 * @param {string} name - Frame name
 * @param {Object} options - Override options
 * @returns {string} Figma script code
 */
function createContentFrame(name, options = {}) {
  return createVerticalFrame(name, {
    itemSpacing: 20,
    padding: 16,
    primaryAxisSizing: 'AUTO',
    layoutAlign: 'STRETCH',
    layoutGrow: 1,
    fills: [],
    ...options
  });
}

/**
 * Create a header frame preset
 * Common pattern: horizontal, space-between, center-aligned
 */
function createHeaderFrame(name, options = {}) {
  return createHorizontalFrame(name, {
    padding: 16,
    primaryAlign: 'SPACE_BETWEEN',
    counterAlign: 'CENTER',
    layoutAlign: 'STRETCH',
    fills: [],
    ...options
  });
}

/**
 * Create a card frame preset
 * Common pattern: vertical, auto-sizing, with padding and fills
 */
function createCardFrame(name, options = {}) {
  return createVerticalFrame(name, {
    itemSpacing: 12,
    padding: 16,
    primaryAxisSizing: 'AUTO',
    counterAxisSizing: 'AUTO',
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
    ...options
  });
}

module.exports = {
  createVerticalFrame,
  createHorizontalFrame,
  createContentFrame,
  createHeaderFrame,
  createCardFrame
};
