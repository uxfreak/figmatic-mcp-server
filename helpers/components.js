/**
 * Component Helpers
 *
 * Functional utilities for finding and working with Figma components:
 * - Safe component lookup with error handling
 * - Batch component finding
 * - Text style lookup
 */

/**
 * Find a component by name
 * Throws error if not found
 *
 * @param {string} name - Component name
 * @param {Function} executeInFigmaFn - executeInFigma function
 * @returns {Promise<Object>} Component info { id, name }
 *
 * @example
 * const backButton = await findComponent('BackButton', api.executeInFigma);
 * console.log(backButton.id);
 */
async function findComponent(name, executeInFigmaFn) {
  const escapedName = name.replace(/'/g, "\\'");

  const result = await executeInFigmaFn(`
    const component = figma.root.findOne(node =>
      node.type === 'COMPONENT' &&
      node.name === '${escapedName}'
    );

    if (!component) {
      throw new Error('Component "${escapedName}" not found');
    }

    return { id: component.id, name: component.name };
  `);

  return result.result;
}

/**
 * Find multiple components by name
 * Returns object with component names as keys
 *
 * @param {string[]} names - Array of component names
 * @param {Function} executeInFigmaFn - executeInFigma function
 * @returns {Promise<Object>} Object with component info
 *
 * @example
 * const components = await findComponents([
 *   'BackButton',
 *   'Help Navigation Card'
 * ], api.executeInFigma);
 *
 * console.log(components['BackButton'].id);
 */
async function findComponents(names, executeInFigmaFn) {
  const result = await executeInFigmaFn(`
    const names = ${JSON.stringify(names)};
    const components = {};
    const missing = [];

    for (const name of names) {
      const component = figma.root.findOne(node =>
        node.type === 'COMPONENT' &&
        node.name === name
      );

      if (!component) {
        missing.push(name);
      } else {
        components[name] = { id: component.id, name: component.name };
      }
    }

    if (missing.length > 0) {
      throw new Error('Components not found: ' + missing.join(', '));
    }

    return components;
  `);

  return result.result;
}

/**
 * Find a text style by name
 *
 * @param {string} name - Text style name
 * @param {Function} executeInFigmaFn - executeInFigma function
 * @returns {Promise<Object>} Text style info { id, name, fontName }
 *
 * @example
 * const titleStyle = await findTextStyle('Title', api.executeInFigma);
 */
async function findTextStyle(name, executeInFigmaFn) {
  const escapedName = name.replace(/'/g, "\\'");

  const result = await executeInFigmaFn(`
    const textStyles = figma.getLocalTextStyles();
    const style = textStyles.find(s => s.name === '${escapedName}');

    if (!style) {
      throw new Error('Text style "${escapedName}" not found');
    }

    return {
      id: style.id,
      name: style.name,
      fontName: style.fontName
    };
  `);

  return result.result;
}

/**
 * Find multiple text styles by name
 *
 * @param {string[]} names - Array of text style names
 * @param {Function} executeInFigmaFn - executeInFigma function
 * @returns {Promise<Object>} Object with text style info
 */
async function findTextStyles(names, executeInFigmaFn) {
  const result = await executeInFigmaFn(`
    const names = ${JSON.stringify(names)};
    const allStyles = figma.getLocalTextStyles();
    const styles = {};
    const missing = [];

    for (const name of names) {
      const style = allStyles.find(s => s.name === name);

      if (!style) {
        missing.push(name);
      } else {
        styles[name] = {
          id: style.id,
          name: style.name,
          fontName: style.fontName
        };
      }
    }

    if (missing.length > 0) {
      throw new Error('Text styles not found: ' + missing.join(', '));
    }

    return styles;
  `);

  return result.result;
}

/**
 * Create an instance of a component
 *
 * @param {string} componentId - Component ID to instantiate
 * @param {Object} options - Instance configuration
 * @param {string} options.layoutAlign - Layout align value (e.g., 'STRETCH')
 * @param {number} options.x - X position (for absolute positioning)
 * @param {number} options.y - Y position (for absolute positioning)
 * @param {Function} executeInFigmaFn - executeInFigma function
 * @returns {Promise<Object>} Instance info { id }
 *
 * @example
 * const instance = await createComponentInstance(componentId, {
 *   layoutAlign: 'STRETCH'
 * }, api.executeInFigma);
 */
async function createComponentInstance(componentId, options, executeInFigmaFn) {
  const { layoutAlign, x, y } = options;

  const result = await executeInFigmaFn(`
    const component = figma.getNodeById('${componentId}');

    if (!component) {
      throw new Error('Component not found');
    }

    const instance = component.createInstance();

    ${layoutAlign ? `instance.layoutAlign = '${layoutAlign}';` : ''}
    ${x !== undefined ? `instance.x = ${x};` : ''}
    ${y !== undefined ? `instance.y = ${y};` : ''}

    return { id: instance.id };
  `);

  return result.result;
}

module.exports = {
  findComponent,
  findComponents,
  findTextStyle,
  findTextStyles,
  createComponentInstance
};
