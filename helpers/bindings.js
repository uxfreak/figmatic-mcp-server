/**
 * Variable Binding Helpers
 *
 * Functional utilities for binding variables to nodes:
 * - Batch binding for common patterns (radii, padding)
 * - Parallel execution with Promise.all()
 * - Type-safe helpers for different binding types
 */

/**
 * Bind all 4 corner radii to the same variable
 * Uses Promise.all for parallel execution
 *
 * @param {string} nodeId - Node ID to bind to
 * @param {string} variableId - Radius variable ID
 * @param {Function} bindVariableFn - bindVariable function
 * @returns {Promise<void>}
 *
 * @example
 * await bindCornerRadii(frameId, radiusVarId, api.bindVariable);
 */
async function bindCornerRadii(nodeId, variableId, bindVariableFn) {
  const fields = [
    'topLeftRadius',
    'topRightRadius',
    'bottomLeftRadius',
    'bottomRightRadius'
  ];

  await Promise.all(
    fields.map(field =>
      bindVariableFn({ nodeId, field, variableId })
    )
  );
}

/**
 * Bind padding with flexible options
 * Allows different variables for different sides
 *
 * @param {string} nodeId - Node ID to bind to
 * @param {Object} options - Padding configuration
 * @param {string} options.all - Variable ID for all sides (if all same)
 * @param {string} options.left - Variable ID for left padding
 * @param {string} options.right - Variable ID for right padding
 * @param {string} options.top - Variable ID for top padding
 * @param {string} options.bottom - Variable ID for bottom padding
 * @param {Function} bindVariableFn - bindVariable function
 * @returns {Promise<void>}
 *
 * @example
 * // All sides same
 * await bindPadding(frameId, { all: spacing4Id }, api.bindVariable);
 *
 * // Different values
 * await bindPadding(frameId, {
 *   left: spacing5Id,
 *   right: spacing5Id,
 *   top: spacing4Id,
 *   bottom: spacing8Id
 * }, api.bindVariable);
 */
async function bindPadding(nodeId, options, bindVariableFn) {
  const { all, left, right, top, bottom } = options;

  const bindings = [];

  // If 'all' is specified, use it for all sides
  const leftVar = left || all;
  const rightVar = right || all;
  const topVar = top || all;
  const bottomVar = bottom || all;

  if (leftVar) {
    bindings.push(
      bindVariableFn({ nodeId, field: 'paddingLeft', variableId: leftVar })
    );
  }

  if (rightVar) {
    bindings.push(
      bindVariableFn({ nodeId, field: 'paddingRight', variableId: rightVar })
    );
  }

  if (topVar) {
    bindings.push(
      bindVariableFn({ nodeId, field: 'paddingTop', variableId: topVar })
    );
  }

  if (bottomVar) {
    bindings.push(
      bindVariableFn({ nodeId, field: 'paddingBottom', variableId: bottomVar })
    );
  }

  await Promise.all(bindings);
}

/**
 * Bind horizontal padding (left and right)
 *
 * @param {string} nodeId - Node ID to bind to
 * @param {string} variableId - Spacing variable ID
 * @param {Function} bindVariableFn - bindVariable function
 * @returns {Promise<void>}
 */
async function bindPaddingHorizontal(nodeId, variableId, bindVariableFn) {
  await Promise.all([
    bindVariableFn({ nodeId, field: 'paddingLeft', variableId }),
    bindVariableFn({ nodeId, field: 'paddingRight', variableId })
  ]);
}

/**
 * Bind vertical padding (top and bottom)
 *
 * @param {string} nodeId - Node ID to bind to
 * @param {string} variableId - Spacing variable ID
 * @param {Function} bindVariableFn - bindVariable function
 * @returns {Promise<void>}
 */
async function bindPaddingVertical(nodeId, variableId, bindVariableFn) {
  await Promise.all([
    bindVariableFn({ nodeId, field: 'paddingTop', variableId }),
    bindVariableFn({ nodeId, field: 'paddingBottom', variableId })
  ]);
}

/**
 * Bind size (width and height)
 *
 * @param {string} nodeId - Node ID to bind to
 * @param {string} variableId - Dimension variable ID (or object with width/height)
 * @param {Function} bindVariableFn - bindVariable function
 * @returns {Promise<void>}
 *
 * @example
 * // Same variable for both
 * await bindSize(nodeId, dim10Id, api.bindVariable);
 *
 * // Different variables
 * await bindSize(nodeId, { width: widthVarId, height: heightVarId }, api.bindVariable);
 */
async function bindSize(nodeId, variableId, bindVariableFn) {
  if (typeof variableId === 'string') {
    // Same variable for both width and height
    await Promise.all([
      bindVariableFn({ nodeId, field: 'width', variableId }),
      bindVariableFn({ nodeId, field: 'height', variableId })
    ]);
  } else {
    // Different variables
    const bindings = [];

    if (variableId.width) {
      bindings.push(
        bindVariableFn({ nodeId, field: 'width', variableId: variableId.width })
      );
    }

    if (variableId.height) {
      bindings.push(
        bindVariableFn({ nodeId, field: 'height', variableId: variableId.height })
      );
    }

    await Promise.all(bindings);
  }
}

/**
 * Bind text color variable
 *
 * @param {string} nodeId - Text node ID
 * @param {string} variableId - Color variable ID
 * @param {Function} bindVariableToPaintFn - bindVariableToPaint function
 * @returns {Promise<void>}
 */
async function bindTextColor(nodeId, variableId, bindVariableToPaintFn) {
  await bindVariableToPaintFn({
    nodeId,
    paintIndex: 0,
    variableId,
    isFill: true
  });
}

/**
 * Bind fill color variable
 *
 * @param {string} nodeId - Node ID
 * @param {string} variableId - Color variable ID
 * @param {Function} bindVariableToPaintFn - bindVariableToPaint function
 * @returns {Promise<void>}
 */
async function bindFillColor(nodeId, variableId, bindVariableToPaintFn) {
  await bindVariableToPaintFn({
    nodeId,
    paintIndex: 0,
    variableId,
    isFill: true
  });
}

/**
 * Bind stroke color variable
 *
 * @param {string} nodeId - Node ID
 * @param {string} variableId - Color variable ID
 * @param {Function} bindVariableToPaintFn - bindVariableToPaint function
 * @returns {Promise<void>}
 */
async function bindStrokeColor(nodeId, variableId, bindVariableToPaintFn) {
  await bindVariableToPaintFn({
    nodeId,
    paintIndex: 0,
    variableId,
    isFill: false
  });
}

module.exports = {
  bindCornerRadii,
  bindPadding,
  bindPaddingHorizontal,
  bindPaddingVertical,
  bindSize,
  bindTextColor,
  bindFillColor,
  bindStrokeColor
};
