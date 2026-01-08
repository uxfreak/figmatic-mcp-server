/**
 * Primitives API - Helper functions for common Figma operations
 * Based on official Figma Plugin API research
 *
 * References:
 * - Text: https://www.figma.com/plugin-docs/working-with-text/
 * - Auto Layout: https://www.figma.com/plugin-docs/api/properties/nodes-layoutmode/
 * - Paint: https://developers.figma.com/docs/plugins/api/Paint/
 * - Frame: https://www.figma.com/plugin-docs/api/FrameNode/
 */

const { executeInFigma } = require('./execute');
const { generateFontLoadingCode } = require('../../helpers/text');

// ============================================
// TEXT OPERATIONS
// ============================================

/**
 * Create a text node with properties
 * @param {Object} context - Execution context
 * @param {Object} options - Text options
 * @param {string} options.characters - Text content
 * @param {Object} options.font - Font {family, style} (default: {family: "Inter", style: "Regular"})
 * @param {number} options.fontSize - Font size in pixels (default: 16)
 * @param {Object} options.position - Position {x, y} (default: {x: 0, y: 0})
 * @param {string} options.textAlignHorizontal - "LEFT"|"CENTER"|"RIGHT"|"JUSTIFIED" (default: "LEFT")
 * @param {string} options.textAlignVertical - "TOP"|"CENTER"|"BOTTOM" (default: "TOP")
 * @param {string} options.textAutoResize - "WIDTH_AND_HEIGHT"|"HEIGHT"|"TRUNCATE"|"NONE" (default: "WIDTH_AND_HEIGHT")
 * @param {Array} options.fills - Fill paints (default: black)
 * @param {Object} options.letterSpacing - {value, unit: "PIXELS"|"PERCENT"}
 * @param {Object} options.lineHeight - {value, unit: "PIXELS"|"PERCENT"|"AUTO"}
 * @returns {Promise<Object>} Created text node data
 */
async function createText(context, options = {}) {
  const {
    characters = 'Text',
    font = { family: 'Inter', style: 'Regular' },
    fontSize = 16,
    position = { x: 0, y: 0 },
    textAlignHorizontal = 'LEFT',
    textAlignVertical = 'TOP',
    textAutoResize = 'WIDTH_AND_HEIGHT',
    fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
    letterSpacing = null,
    lineHeight = null
  } = options;

  // Generate font loading code with normalization
  const fontLoadingCode = generateFontLoadingCode(font.family, font.style);

  const script = `
    const text = figma.createText();

    // Position
    text.x = ${position.x};
    text.y = ${position.y};

    // CRITICAL: Load the default font first (text nodes default to Inter Regular)
    await figma.loadFontAsync(text.fontName);

    // Load the target font with normalization (tries multiple style variations)
    ${fontLoadingCode}

    // Text content
    text.characters = ${JSON.stringify(characters)};

    // Text properties
    text.fontSize = ${fontSize};
    text.fontName = loadedFont;  // Use the successfully loaded font
    text.textAlignHorizontal = ${JSON.stringify(textAlignHorizontal)};
    text.textAlignVertical = ${JSON.stringify(textAlignVertical)};
    text.textAutoResize = ${JSON.stringify(textAutoResize)};

    // Fills
    text.fills = ${JSON.stringify(fills)};

    ${letterSpacing ? `text.letterSpacing = ${JSON.stringify(letterSpacing)};` : ''}
    ${lineHeight ? `text.lineHeight = ${JSON.stringify(lineHeight)};` : ''}

    // Add to page
    figma.currentPage.appendChild(text);
    figma.currentPage.selection = [text];
    figma.viewport.scrollAndZoomIntoView([text]);

    return {
      id: text.id,
      name: text.name,
      characters: text.characters,
      width: text.width,
      height: text.height,
      fontLoaded: loadedFont  // Return the font that was actually loaded
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

/**
 * Create text with custom styling for different ranges
 * @param {Object} context - Execution context
 * @param {Array} segments - Array of {text, fontSize?, fills?, fontName?}
 * @param {Object} options - Base text options
 */
async function createStyledText(context, segments, options = {}) {
  const {
    position = { x: 0, y: 0 },
    textAlignHorizontal = 'LEFT',
    baseFont = { family: 'Inter', style: 'Regular' },
    baseFontSize = 16
  } = options;

  // Collect all unique fonts from base and segments
  const uniqueFonts = new Set();
  uniqueFonts.add(JSON.stringify(baseFont));
  segments.forEach(s => {
    if (s.fontName) {
      uniqueFonts.add(JSON.stringify(s.fontName));
    }
  });

  // Generate font loading code for each unique font
  const fontLoadingCodeParts = [];
  const fontMap = {};

  Array.from(uniqueFonts).forEach((fontStr, index) => {
    const font = JSON.parse(fontStr);
    const varName = `loadedFont${index}`;
    fontMap[fontStr] = varName;

    const loadingCode = generateFontLoadingCode(font.family, font.style);
    fontLoadingCodeParts.push(`
    // Load font: ${font.family} ${font.style}
    (async () => {
      ${loadingCode}
      return loadedFont;
    })().then(font => { ${varName} = font; })`);
  });

  const baseFontVar = fontMap[JSON.stringify(baseFont)];

  const script = `
    const text = figma.createText();
    text.x = ${position.x};
    text.y = ${position.y};

    // Load all unique fonts with normalization
    let ${Object.values(fontMap).join(', ')};

    await Promise.all([
      ${fontLoadingCodeParts.join(',\n      ')}
    ]);

    // Build text content
    const fullText = ${JSON.stringify(segments.map(s => s.text).join(''))};
    text.characters = fullText;

    // Apply base styling
    text.fontSize = ${baseFontSize};
    text.fontName = ${baseFontVar};
    text.textAlignHorizontal = ${JSON.stringify(textAlignHorizontal)};

    // Apply range-based styling
    let offset = 0;
    const segments = ${JSON.stringify(segments)};

    // Font map for segment lookups
    const segmentFontMap = ${JSON.stringify(fontMap)};

    for (const segment of segments) {
      const start = offset;
      const end = offset + segment.text.length;

      if (segment.fontSize) {
        text.setRangeFontSize(start, end, segment.fontSize);
      }
      if (segment.fills) {
        text.setRangeFills(start, end, segment.fills);
      }
      if (segment.fontName) {
        const fontKey = JSON.stringify(segment.fontName);
        const loadedFontVar = segmentFontMap[fontKey];
        text.setRangeFontName(start, end, eval(loadedFontVar));
      }

      offset = end;
    }

    figma.currentPage.appendChild(text);
    figma.currentPage.selection = [text];
    figma.viewport.scrollAndZoomIntoView([text]);

    return { id: text.id, characters: text.characters };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

// ============================================
// AUTO LAYOUT OPERATIONS
// ============================================

/**
 * Create an auto layout frame
 * @param {Object} context - Execution context
 * @param {Object} options - Auto layout options
 * @param {string} options.layoutMode - "HORIZONTAL"|"VERTICAL" (required)
 * @param {string} options.primaryAxisSizingMode - "FIXED"|"AUTO" (default: "AUTO")
 * @param {string} options.counterAxisSizingMode - "FIXED"|"AUTO" (default: "AUTO")
 * @param {number} options.width - Width (used if counterAxis or primaryAxis is FIXED)
 * @param {number} options.height - Height (used if counterAxis or primaryAxis is FIXED)
 * @param {number} options.itemSpacing - Gap between children (default: 0)
 * @param {Object} options.padding - {left, right, top, bottom} or number for all (default: 0)
 * @param {string} options.primaryAxisAlignItems - "MIN"|"CENTER"|"MAX"|"SPACE_BETWEEN" (default: "MIN")
 * @param {string} options.counterAxisAlignItems - "MIN"|"CENTER"|"MAX" (default: "MIN")
 * @param {string} options.layoutWrap - "NO_WRAP"|"WRAP" (default: "NO_WRAP")
 * @param {number} options.counterAxisSpacing - Gap between wrapped rows (default: 0)
 * @param {Array} options.fills - Fill paints (default: white)
 * @param {number} options.cornerRadius - Corner radius (default: 0)
 * @param {Object} options.position - {x, y} position (default: {x: 0, y: 0})
 * @returns {Promise<Object>} Created frame data
 */
async function createAutoLayout(context, options = {}) {
  const {
    layoutMode,
    primaryAxisSizingMode = 'AUTO',
    counterAxisSizingMode = 'AUTO',
    width = 100,
    height = 100,
    itemSpacing = 0,
    padding = 0,
    primaryAxisAlignItems = 'MIN',
    counterAxisAlignItems = 'MIN',
    layoutWrap = 'NO_WRAP',
    counterAxisSpacing = 0,
    fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
    cornerRadius = 0,
    position = { x: 0, y: 0 }
  } = options;

  if (!layoutMode) {
    throw new Error('layoutMode is required ("HORIZONTAL" or "VERTICAL")');
  }

  // Handle padding
  const paddingObj = typeof padding === 'number'
    ? { left: padding, right: padding, top: padding, bottom: padding }
    : { left: 0, right: 0, top: 0, bottom: 0, ...padding };

  const script = `
    const frame = figma.createFrame();

    // Position
    frame.x = ${position.x};
    frame.y = ${position.y};

    // Enable auto layout
    frame.layoutMode = ${JSON.stringify(layoutMode)};

    // Sizing modes
    frame.primaryAxisSizingMode = ${JSON.stringify(primaryAxisSizingMode)};
    frame.counterAxisSizingMode = ${JSON.stringify(counterAxisSizingMode)};

    // Set size if FIXED
    ${primaryAxisSizingMode === 'FIXED' || counterAxisSizingMode === 'FIXED'
      ? `frame.resize(${width}, ${height});`
      : ''}

    // Spacing
    frame.itemSpacing = ${itemSpacing};
    frame.paddingLeft = ${paddingObj.left};
    frame.paddingRight = ${paddingObj.right};
    frame.paddingTop = ${paddingObj.top};
    frame.paddingBottom = ${paddingObj.bottom};

    // Alignment
    frame.primaryAxisAlignItems = ${JSON.stringify(primaryAxisAlignItems)};
    frame.counterAxisAlignItems = ${JSON.stringify(counterAxisAlignItems)};

    // Wrapping
    frame.layoutWrap = ${JSON.stringify(layoutWrap)};
    ${layoutWrap === 'WRAP' ? `frame.counterAxisSpacing = ${counterAxisSpacing};` : ''}

    // Visual properties
    frame.fills = ${JSON.stringify(fills)};
    frame.cornerRadius = ${cornerRadius};

    // Add to page
    figma.currentPage.appendChild(frame);
    figma.currentPage.selection = [frame];
    figma.viewport.scrollAndZoomIntoView([frame]);

    return {
      id: frame.id,
      name: frame.name,
      width: frame.width,
      height: frame.height,
      layoutMode: frame.layoutMode
    };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

// ============================================
// SHAPE OPERATIONS WITH PROPERTIES
// ============================================

/**
 * Create a rectangle with full properties
 * @param {Object} context - Execution context
 * @param {Object} options - Rectangle options
 */
async function createRectangle(context, options = {}) {
  const {
    width = 100,
    height = 100,
    position = { x: 0, y: 0 },
    fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }],
    strokes = [],
    strokeWeight = 1,
    cornerRadius = 0,
    name = 'Rectangle'
  } = options;

  const script = `
    const rect = figma.createRectangle();
    rect.name = ${JSON.stringify(name)};
    rect.x = ${position.x};
    rect.y = ${position.y};
    rect.resize(${width}, ${height});
    rect.fills = ${JSON.stringify(fills)};
    rect.strokes = ${JSON.stringify(strokes)};
    rect.strokeWeight = ${strokeWeight};
    rect.cornerRadius = ${cornerRadius};

    figma.currentPage.appendChild(rect);
    figma.currentPage.selection = [rect];
    figma.viewport.scrollAndZoomIntoView([rect]);

    return { id: rect.id, name: rect.name, width: rect.width, height: rect.height };
  `;

  const result = await executeInFigma(context, script);
  return result.result;
}

module.exports = {
  createText,
  createStyledText,
  createAutoLayout,
  createRectangle
};
