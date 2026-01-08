/**
 * Paint Helpers
 *
 * Utilities for working with Figma paint objects (fills, strokes)
 * Handles color normalization and paint transformations
 */

/**
 * Normalize a color object to Figma's expected format
 *
 * Accepts both CSS-like {r, g, b, a} and Figma native {r, g, b} formats
 * Extracts alpha channel and converts to opacity at paint level
 *
 * @param {Object} color - Color object with r, g, b, and optional a
 * @returns {Object} Normalized color {r, g, b} without alpha
 *
 * @example
 * // CSS-like rgba
 * normalizeColor({r: 1, g: 0.5, b: 0, a: 0.8})
 * // => {r: 1, g: 0.5, b: 0}
 *
 * // Standard RGB (passthrough)
 * normalizeColor({r: 1, g: 0.5, b: 0})
 * // => {r: 1, g: 0.5, b: 0}
 */
function normalizeColor(color) {
  if (!color) return color;

  // If color has 'a' property, remove it (will be handled at paint level)
  if ('a' in color) {
    const { a, ...rgbOnly } = color;
    return rgbOnly;
  }

  return color;
}

/**
 * Normalize a paint object to Figma's expected format
 *
 * Handles the common UX friction point where developers expect alpha
 * in the color object (CSS rgba pattern) but Figma requires it as
 * separate opacity property at paint level
 *
 * @param {Object} paint - Paint object (SOLID, GRADIENT, IMAGE, etc.)
 * @returns {Object} Normalized paint with opacity extracted from color.a
 *
 * @example
 * // Input: CSS-like pattern (alpha in color)
 * normalizePaint({
 *   type: 'SOLID',
 *   color: {r: 1, g: 1, b: 1, a: 0.8}
 * })
 *
 * // Output: Figma-native pattern (opacity at paint level)
 * {
 *   type: 'SOLID',
 *   color: {r: 1, g: 1, b: 1},
 *   opacity: 0.8
 * }
 *
 * @example
 * // If opacity already exists at paint level, color.a takes precedence
 * normalizePaint({
 *   type: 'SOLID',
 *   color: {r: 1, g: 1, b: 1, a: 0.5},
 *   opacity: 0.8  // Will be overridden
 * })
 * // => { type: 'SOLID', color: {r: 1, g: 1, b: 1}, opacity: 0.5 }
 */
function normalizePaint(paint) {
  if (!paint || typeof paint !== 'object') return paint;

  // Create a copy to avoid mutating original
  const normalized = { ...paint };

  // Handle SOLID paint with color
  if (normalized.color && typeof normalized.color === 'object') {
    const { a, ...rgbColor } = normalized.color;

    // If alpha exists in color, extract it to paint.opacity
    if (a !== undefined) {
      normalized.color = rgbColor;
      normalized.opacity = a;
    }
  }

  // Handle GRADIENT paint with color stops
  if (normalized.gradientStops && Array.isArray(normalized.gradientStops)) {
    normalized.gradientStops = normalized.gradientStops.map(stop => {
      if (stop.color && typeof stop.color === 'object' && 'a' in stop.color) {
        const { a, ...rgbColor } = stop.color;
        return {
          ...stop,
          color: rgbColor,
          // Note: Gradient stops don't have opacity property - alpha stays in color
          // This is a Figma API limitation
          color: { ...rgbColor, a }  // Keep alpha for gradient stops
        };
      }
      return stop;
    });
  }

  return normalized;
}

/**
 * Normalize an array of paint objects
 *
 * Convenience function to normalize multiple paints (e.g., fills array)
 *
 * @param {Array} paints - Array of paint objects
 * @returns {Array} Array of normalized paint objects
 *
 * @example
 * normalizePaints([
 *   { type: 'SOLID', color: {r: 1, g: 0, b: 0, a: 0.8} },
 *   { type: 'SOLID', color: {r: 0, g: 1, b: 0, a: 0.5} }
 * ])
 * // => [
 * //   { type: 'SOLID', color: {r: 1, g: 0, b: 0}, opacity: 0.8 },
 * //   { type: 'SOLID', color: {r: 0, g: 1, b: 0}, opacity: 0.5 }
 * // ]
 */
function normalizePaints(paints) {
  if (!Array.isArray(paints)) return paints;
  return paints.map(normalizePaint);
}

/**
 * Generate JavaScript code to normalize paints in Figma plugin context
 *
 * Returns a string of JavaScript code that can be injected into
 * executeInFigma scripts to normalize paints before use
 *
 * @returns {string} JavaScript code for paint normalization
 *
 * @example
 * const script = `
 *   ${generateNormalizePaintCode()}
 *
 *   const fills = normalizePaints([
 *     { type: 'SOLID', color: {r: 1, g: 0, b: 0, a: 0.5} }
 *   ]);
 *   node.fills = fills;
 * `;
 */
function generateNormalizePaintCode() {
  return `
// Paint normalization helper (injected by Figmatic MCP)
function normalizePaint(paint) {
  if (!paint || typeof paint !== 'object') return paint;
  const normalized = { ...paint };

  if (normalized.color && typeof normalized.color === 'object') {
    const { a, ...rgbColor } = normalized.color;
    if (a !== undefined) {
      normalized.color = rgbColor;
      normalized.opacity = a;
    }
  }

  return normalized;
}

function normalizePaints(paints) {
  if (!Array.isArray(paints)) return paints;
  return paints.map(normalizePaint);
}
`.trim();
}

/**
 * Create gradient paint structure with variable-bound color stops
 *
 * High-level helper that creates a gradient with variables bound to color stops.
 * This enables full design token support for gradients (Light/Dark mode theming).
 *
 * @param {Object} options - Gradient configuration
 * @param {string} options.gradientType - Type: 'linear', 'radial', 'angular', 'diamond'
 * @param {Array} options.colorStops - Array of {position, variableId} or {position, color}
 * @param {number} [options.angle=90] - Angle in degrees for linear gradients (0=right, 90=down, 180=left, 270=up)
 * @returns {Object} GradientPaint object with bound variables
 *
 * @example
 * // Create gradient with variable-bound stops
 * const gradient = createGradientWithVariables({
 *   gradientType: 'linear',
 *   angle: 90,
 *   colorStops: [
 *     { position: 0, variableId: 'VariableID:123:456' },
 *     { position: 1, variableId: 'VariableID:123:457' }
 *   ]
 * });
 *
 * @example
 * // Mix variables and static colors
 * const gradient = createGradientWithVariables({
 *   gradientType: 'radial',
 *   colorStops: [
 *     { position: 0, variableId: 'VariableID:123:456' },
 *     { position: 1, color: { r: 0, g: 0, b: 0, a: 1 } }
 *   ]
 * });
 */
function createGradientWithVariables({ gradientType, colorStops, angle = 90 }) {
  const typeMap = {
    linear: 'GRADIENT_LINEAR',
    radial: 'GRADIENT_RADIAL',
    angular: 'GRADIENT_ANGULAR',
    diamond: 'GRADIENT_DIAMOND'
  };

  const type = typeMap[gradientType] || 'GRADIENT_LINEAR';

  // Calculate gradient handle positions based on angle
  const angleRad = (angle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  // Default gradient handles (can be overridden for radial/angular/diamond)
  let gradientHandlePositions = [
    { x: 0.5, y: 0.5 },
    { x: 0.5 + cos * 0.5, y: 0.5 + sin * 0.5 }
  ];

  if (type === 'GRADIENT_RADIAL') {
    gradientHandlePositions = [
      { x: 0.5, y: 0.5 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 0 }
    ];
  }

  // Build gradient stops with variable bindings
  const gradientStops = colorStops.map(stop => {
    const gradientStop = {
      position: stop.position,
      color: stop.color || { r: 1, g: 1, b: 1, a: 1 } // Placeholder if variable bound
    };

    // If variableId provided, add boundVariables
    if (stop.variableId) {
      gradientStop.boundVariables = {
        color: {
          type: 'VARIABLE_ALIAS',
          id: stop.variableId
        }
      };
    }

    return gradientStop;
  });

  return {
    type,
    gradientStops,
    gradientHandlePositions
  };
}

/**
 * Generate JavaScript code for gradient variable binding in Figma plugin context
 *
 * Returns code that can be injected into executeInFigma scripts to bind
 * variables to gradient stops
 *
 * @returns {string} JavaScript code for gradient binding helpers
 */
function generateGradientBindingCode() {
  return `
// Gradient variable binding helpers (injected by Figmatic MCP)
function bindVariableToGradientStop(node, paintIndex, stopIndex, variableId, isFill = true) {
  const paints = isFill ? [...node.fills] : [...node.strokes];
  const paint = paints[paintIndex];

  if (!paint || !paint.gradientStops || !paint.gradientStops[stopIndex]) {
    throw new Error(\`Invalid paint or stop index: paintIndex=\${paintIndex}, stopIndex=\${stopIndex}\`);
  }

  // Clone the gradient stop and add variable binding
  const stop = { ...paint.gradientStops[stopIndex] };
  stop.boundVariables = {
    color: {
      type: 'VARIABLE_ALIAS',
      id: variableId
    }
  };

  // Update the gradient stops array
  const newGradientStops = [...paint.gradientStops];
  newGradientStops[stopIndex] = stop;

  // Update the paint
  paints[paintIndex] = {
    ...paint,
    gradientStops: newGradientStops
  };

  // Apply back to node
  if (isFill) {
    node.fills = paints;
  } else {
    node.strokes = paints;
  }

  return { success: true, stopIndex, variableId };
}

function createGradientWithVariables({ gradientType, colorStops, angle = 90 }) {
  const typeMap = {
    linear: 'GRADIENT_LINEAR',
    radial: 'GRADIENT_RADIAL',
    angular: 'GRADIENT_ANGULAR',
    diamond: 'GRADIENT_DIAMOND'
  };

  const type = typeMap[gradientType] || 'GRADIENT_LINEAR';

  const angleRad = (angle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  let gradientHandlePositions = [
    { x: 0.5, y: 0.5 },
    { x: 0.5 + cos * 0.5, y: 0.5 + sin * 0.5 }
  ];

  if (type === 'GRADIENT_RADIAL') {
    gradientHandlePositions = [
      { x: 0.5, y: 0.5 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 0 }
    ];
  }

  const gradientStops = colorStops.map(stop => {
    const gradientStop = {
      position: stop.position,
      color: stop.color || { r: 1, g: 1, b: 1, a: 1 }
    };

    if (stop.variableId) {
      gradientStop.boundVariables = {
        color: {
          type: 'VARIABLE_ALIAS',
          id: stop.variableId
        }
      };
    }

    return gradientStop;
  });

  return {
    type,
    gradientStops,
    gradientHandlePositions
  };
}
`.trim();
}

module.exports = {
  normalizeColor,
  normalizePaint,
  normalizePaints,
  generateNormalizePaintCode,
  createGradientWithVariables,
  generateGradientBindingCode
};
