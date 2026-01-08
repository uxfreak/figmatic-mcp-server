/**
 * WRITE Tools - Component Creation and Modification
 *
 * Implements 5 WRITE tools that enable component creation and variable binding
 * Uses WebSocket server API and lib functions
 */

const { normalizePaints, generateNormalizePaintCode } = require('../helpers/paint');
const { generateFontLoadingCode } = require('../helpers/text');

/**
 * Tool 1: create_component
 * Create a new Figma component with basic properties
 */
async function createComponent(api, args, sendProgress) {
  const {
    name = 'New Component',
    width = 100,
    height = 100,
    layoutMode = 'NONE',
    fills = [],
    cornerRadius = 0
  } = args;

  sendProgress({ status: `Creating component "${name}"...` });

  // Normalize fills (extract alpha from color.a to paint.opacity)
  const normalizedFills = normalizePaints(fills);

  // Execute component creation script
  const result = await api.executeInFigma(`
    const component = figma.createComponent();
    component.name = "${name}";
    component.resize(${width}, ${height});

    // Set fills if provided
    const fills = ${JSON.stringify(normalizedFills)};
    if (fills.length > 0) {
      component.fills = fills;
    }

    // Set corner radius
    if (${cornerRadius} > 0) {
      component.cornerRadius = ${cornerRadius};
    }

    // Set layout mode if auto-layout
    if ("${layoutMode}" !== "NONE") {
      component.layoutMode = "${layoutMode}";
      component.primaryAxisAlignItems = "CENTER";
      component.counterAxisAlignItems = "CENTER";
      component.itemSpacing = 8;
      component.paddingLeft = 16;
      component.paddingRight = 16;
      component.paddingTop = 16;
      component.paddingBottom = 16;
    }

    // Add to current page
    figma.currentPage.appendChild(component);

    // Center in viewport
    figma.viewport.scrollAndZoomIntoView([component]);

    return {
      id: component.id,
      name: component.name,
      width: component.width,
      height: component.height,
      layoutMode: component.layoutMode,
      success: true
    };
  `);

  sendProgress({ status: 'Component created successfully' });

  return result.result;
}

/**
 * Tool 1b: convert_to_component (COMPREHENSIVE VERSION)
 * Convert an existing node (frame, group, etc.) into a component with full design system integration
 *
 * Features:
 * - Component properties with auto-binding
 * - Auto-expose nested instances
 * - Variable bindings (fills, strokes, dimensions, etc.)
 * - Text/effect/fill/stroke style application
 * - Graceful error handling with warnings
 */
async function convertToComponent(api, args, sendProgress) {
  const {
    nodeId,
    componentName,
    description,
    moveToComponentsPage = false,
    componentProperties = [],
    autoExposeInstances = false,
    exposeInstances = null,
    variableBindings = [],
    textStyles = [],
    effectStyleId = null,
    effects = [],
    fillStyleId = null,
    strokeStyleId = null
  } = args;

  sendProgress({ status: `Converting node ${nodeId} to component with full design system integration...` });

  // Serialize arrays/objects for script injection
  const componentPropertiesJSON = JSON.stringify(componentProperties);
  const exposeInstancesJSON = JSON.stringify(exposeInstances);
  const variableBindingsJSON = JSON.stringify(variableBindings);
  const textStylesJSON = JSON.stringify(textStyles);
  const effectsJSON = JSON.stringify(effects);

  // Execute comprehensive conversion script
  const result = await api.executeInFigma(`
    // ===== HELPER FUNCTIONS =====

    /**
     * Navigate tree by name path array
     * @param {SceneNode} rootNode - Starting node
     * @param {string[]} path - Array of node names to traverse
     * @returns {SceneNode | null}
     */
    function findNodeByPath(rootNode, path) {
      if (!Array.isArray(path)) return null;

      let currentNode = rootNode;

      for (const targetName of path) {
        if (!('children' in currentNode)) {
          throw new Error(\`Node '\${currentNode.name}' has no children. Cannot navigate to '\${targetName}'\`);
        }

        const child = currentNode.children.find(c => c.name === targetName);

        if (!child) {
          const availableNames = currentNode.children.map(c => c.name).join(', ');
          throw new Error(
            \`Child '\${targetName}' not found in '\${currentNode.name}'. Available: \${availableNames}\`
          );
        }

        currentNode = child;
      }

      return currentNode;
    }

    /**
     * Resolve node path specification to actual node
     * @param {ComponentNode} component - Component root
     * @param {string | string[] | null} nodePath - Path specification
     * @returns {SceneNode | null}
     */
    function resolveNodePath(component, nodePath) {
      if (!nodePath || nodePath === "$self") {
        return component;
      } else if (typeof nodePath === 'string') {
        // Assume it's a node ID
        return figma.getNodeById(nodePath);
      } else if (Array.isArray(nodePath)) {
        return findNodeByPath(component, nodePath);
      }
      throw new Error("Invalid nodePath: must be string, array, or $self");
    }

    // ===== PHASE 1: BASIC CONVERSION =====

    const node = figma.getNodeById("${nodeId}");
    if (!node) {
      throw new Error("Node not found: ${nodeId}");
    }

    // Check if node is already a component
    if (node.type === 'COMPONENT') {
      throw new Error("Node is already a component");
    }

    // Check if node type can be converted
    const convertibleTypes = ['FRAME', 'GROUP', 'BOOLEAN_OPERATION', 'VECTOR', 'STAR', 'LINE', 'ELLIPSE', 'POLYGON', 'RECTANGLE', 'TEXT'];
    if (!convertibleTypes.includes(node.type)) {
      throw new Error("Cannot convert " + node.type + " to component. Only FRAME, GROUP, and other scene nodes can be converted.");
    }

    // Convert to component using Figma API
    const component = figma.createComponentFromNode(node);

    // Set custom name if provided
    ${componentName ? `component.name = "${componentName}";` : ''}

    // Set description if provided
    ${description ? `component.description = "${description}";` : ''}

    // Move to Components page if requested
    ${moveToComponentsPage ? `
      let componentsPage = figma.root.children.find(p => p.name === "Components");
      if (!componentsPage) {
        componentsPage = figma.createPage();
        componentsPage.name = "Components";
      }
      componentsPage.appendChild(component);
    ` : ''}

    // ===== PHASE 2: COMPONENT PROPERTIES =====

    const propertiesResult = { added: [], warnings: [] };
    const componentPropertiesArray = ${componentPropertiesJSON};

    if (componentPropertiesArray && Array.isArray(componentPropertiesArray)) {
      for (const propSpec of componentPropertiesArray) {
        try {
          // Add component property
          const propertyKey = component.addComponentProperty(
            propSpec.name,
            propSpec.type,
            propSpec.defaultValue
          );

          const result = {
            propertyName: propSpec.name,
            propertyKey: propertyKey,
            type: propSpec.type,
            defaultValue: propSpec.defaultValue
          };

          // Auto-bind if requested
          if (propSpec.bindToNode) {
            const targetNode = resolveNodePath(component, propSpec.bindToNode);

            if (targetNode) {
              if (propSpec.type === "TEXT" && targetNode.type === "TEXT") {
                targetNode.componentPropertyReferences = {
                  'characters': propertyKey
                };
                result.boundTo = {
                  nodeId: targetNode.id,
                  nodeName: targetNode.name,
                  attribute: 'characters'
                };
              } else if (propSpec.type === "BOOLEAN") {
                targetNode.componentPropertyReferences = {
                  'visible': propertyKey
                };
                result.boundTo = {
                  nodeId: targetNode.id,
                  nodeName: targetNode.name,
                  attribute: 'visible'
                };
              } else if (propSpec.type === "INSTANCE_SWAP" && targetNode.type === "INSTANCE") {
                targetNode.componentPropertyReferences = {
                  'mainComponent': propertyKey
                };
                result.boundTo = {
                  nodeId: targetNode.id,
                  nodeName: targetNode.name,
                  attribute: 'mainComponent'
                };
              }
            } else {
              propertiesResult.warnings.push({
                property: propSpec.name,
                error: "Bind target node not found"
              });
            }
          }

          propertiesResult.added.push(result);
        } catch (error) {
          propertiesResult.warnings.push({
            property: propSpec.name,
            error: error.message
          });
        }
      }
    }

    // ===== PHASE 3: AUTO-EXPOSE INSTANCES =====

    const exposedResult = { exposed: [], count: 0 };
    const autoExpose = ${autoExposeInstances};
    const selectiveExposeArray = ${exposeInstancesJSON};

    if (autoExpose || selectiveExposeArray) {
      function traverse(node, path = []) {
        if (node.type === 'INSTANCE' && node.parent.type !== 'INSTANCE') {
          const nodePath = [...path, node.name];
          const shouldExpose = autoExpose ||
                              (selectiveExposeArray && selectiveExposeArray.some(expPath =>
                                JSON.stringify(expPath) === JSON.stringify(nodePath)
                              ));

          if (shouldExpose) {
            node.isExposedInstance = true;
            exposedResult.exposed.push({
              nodeId: node.id,
              nodeName: node.name,
              path: nodePath,
              mainComponentId: node.mainComponent?.id,
              mainComponentName: node.mainComponent?.name
            });
            exposedResult.count++;
          }
        }

        if ('children' in node) {
          for (const child of node.children) {
            traverse(child, [...path, node.name]);
          }
        }
      }

      traverse(component, []);
    }

    // ===== PHASE 4: VARIABLE BINDINGS =====

    const bindingsResult = { applied: [], warnings: [], successCount: 0, failureCount: 0 };
    const variableBindingsArray = ${variableBindingsJSON};

    if (variableBindingsArray && Array.isArray(variableBindingsArray) && variableBindingsArray.length > 0) {
      const allVars = await figma.variables.getLocalVariablesAsync();

      for (const binding of variableBindingsArray) {
        try {
          const variable = allVars.find(v => v.name === binding.variableName);
          if (!variable) {
            bindingsResult.warnings.push({
              nodePath: binding.nodePath,
              property: binding.property,
              variableName: binding.variableName,
              error: "Variable not found"
            });
            bindingsResult.failureCount++;
            continue;
          }

          const targetNode = resolveNodePath(component, binding.nodePath);
          if (!targetNode) {
            bindingsResult.warnings.push({
              nodePath: binding.nodePath,
              property: binding.property,
              variableName: binding.variableName,
              error: "Node not found"
            });
            bindingsResult.failureCount++;
            continue;
          }

          const property = binding.property;

          if (property === 'fills') {
            const fills = targetNode.fills?.length > 0
              ? targetNode.fills
              : [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, visible: true }];
            const boundPaint = figma.variables.setBoundVariableForPaint(fills[0], 'color', variable);
            boundPaint.visible = true;
            targetNode.fills = [boundPaint];
          } else if (property === 'strokes') {
            const strokes = targetNode.strokes?.length > 0
              ? targetNode.strokes
              : [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true }];
            const boundPaint = figma.variables.setBoundVariableForPaint(strokes[0], 'color', variable);
            boundPaint.visible = true;
            targetNode.strokes = [boundPaint];
          } else {
            targetNode.setBoundVariable(property, variable);
          }

          bindingsResult.applied.push({
            nodeId: targetNode.id,
            nodeName: targetNode.name,
            property,
            variableName: variable.name,
            variableId: variable.id
          });
          bindingsResult.successCount++;
        } catch (error) {
          bindingsResult.warnings.push({
            nodePath: binding.nodePath,
            property: binding.property,
            variableName: binding.variableName,
            error: error.message
          });
          bindingsResult.failureCount++;
        }
      }
    }

    // ===== PHASE 5: TEXT STYLES =====

    const textStylesResult = { applied: [], warnings: [] };
    const textStylesArray = ${textStylesJSON};

    if (textStylesArray && Array.isArray(textStylesArray)) {
      for (const styleSpec of textStylesArray) {
        try {
          const textNode = resolveNodePath(component, styleSpec.nodePath);

          if (!textNode || textNode.type !== 'TEXT') {
            textStylesResult.warnings.push({
              nodePath: styleSpec.nodePath,
              error: "Text node not found"
            });
            continue;
          }

          let styleId = styleSpec.textStyleId;

          if (!styleId && styleSpec.textStyleName) {
            const allStyles = figma.getLocalTextStyles();
            const style = allStyles.find(s => s.name === styleSpec.textStyleName);
            if (style) styleId = style.id;
          }

          if (!styleId) {
            textStylesResult.warnings.push({
              nodePath: styleSpec.nodePath,
              error: "Text style not found"
            });
            continue;
          }

          const textStyle = figma.getStyleById(styleId);
          if (textStyle && textStyle.type === 'TEXT') {
            await figma.loadFontAsync(textStyle.fontName);
            textNode.textStyleId = styleId;
            textStylesResult.applied.push({
              nodeId: textNode.id,
              nodeName: textNode.name,
              styleId,
              styleName: textStyle.name
            });
          }
        } catch (error) {
          textStylesResult.warnings.push({
            nodePath: styleSpec.nodePath,
            error: error.message
          });
        }
      }
    }

    // ===== PHASE 6: EFFECT STYLES =====

    const effectsResult = { applied: [], warnings: [] };

    // Apply to component itself
    const componentEffectStyleId = "${effectStyleId}";
    if (componentEffectStyleId && componentEffectStyleId !== "null") {
      try {
        component.effectStyleId = componentEffectStyleId;
        const style = figma.getStyleById(componentEffectStyleId);
        effectsResult.applied.push({
          nodeId: component.id,
          nodeName: component.name,
          styleId: componentEffectStyleId,
          styleName: style?.name
        });
      } catch (error) {
        effectsResult.warnings.push({ target: "$self", error: error.message });
      }
    }

    // Apply to specific children
    const effectsArray = ${effectsJSON};
    if (effectsArray && Array.isArray(effectsArray)) {
      for (const effectSpec of effectsArray) {
        try {
          const targetNode = resolveNodePath(component, effectSpec.nodePath);
          if (targetNode) {
            targetNode.effectStyleId = effectSpec.effectStyleId;
            const style = figma.getStyleById(effectSpec.effectStyleId);
            effectsResult.applied.push({
              nodeId: targetNode.id,
              nodeName: targetNode.name,
              styleId: effectSpec.effectStyleId,
              styleName: style?.name
            });
          }
        } catch (error) {
          effectsResult.warnings.push({
            nodePath: effectSpec.nodePath,
            error: error.message
          });
        }
      }
    }

    // ===== PHASE 7: FILL/STROKE STYLES =====

    const stylesApplied = {};

    const componentFillStyleId = "${fillStyleId}";
    if (componentFillStyleId && componentFillStyleId !== "null") {
      try {
        component.fillStyleId = componentFillStyleId;
        stylesApplied.fillStyleId = componentFillStyleId;
      } catch (error) {
        // Log warning but don't fail
      }
    }

    const componentStrokeStyleId = "${strokeStyleId}";
    if (componentStrokeStyleId && componentStrokeStyleId !== "null") {
      try {
        component.strokeStyleId = componentStrokeStyleId;
        stylesApplied.strokeStyleId = componentStrokeStyleId;
      } catch (error) {
        // Log warning but don't fail
      }
    }

    // ===== RETURN COMPREHENSIVE RESULT =====

    return {
      success: true,
      componentId: component.id,
      componentName: component.name,
      originalNodeId: "${nodeId}",
      width: component.width,
      height: component.height,
      childCount: component.children?.length || 0,
      location: {
        pageId: component.parent.id,
        pageName: component.parent.name
      },

      // Enhancement results
      componentProperties: propertiesResult,
      exposedInstances: exposedResult,
      variableBindings: bindingsResult,
      textStyles: textStylesResult,
      effects: effectsResult,
      ...stylesApplied
    };
  `);

  sendProgress({ status: 'Component created with full design system integration' });

  return result.result;
}

/**
 * Tool 2: create_auto_layout
 * Create an auto-layout frame with specified properties
 */
async function createAutoLayout(api, args, sendProgress) {
  const {
    name = 'Auto Layout Frame',
    layoutMode = 'HORIZONTAL',
    width = 100,
    height = 100,
    itemSpacing = 8,
    padding = 16,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    primaryAxisSizingMode = 'AUTO',
    counterAxisSizingMode = 'AUTO',
    fills = [],
    cornerRadius = 0,
    x,
    y
  } = args;

  sendProgress({ status: `Creating auto-layout frame "${name}"...` });

  // Calculate padding values
  const pLeft = paddingLeft !== undefined ? paddingLeft : padding;
  const pRight = paddingRight !== undefined ? paddingRight : padding;
  const pTop = paddingTop !== undefined ? paddingTop : padding;
  const pBottom = paddingBottom !== undefined ? paddingBottom : padding;

  // Normalize fills (extract alpha from color.a to paint.opacity)
  const normalizedFills = normalizePaints(fills);

  const result = await api.executeInFigma(`
    const frame = figma.createFrame();
    frame.name = "${name}";

    // Set auto-layout properties
    frame.layoutMode = "${layoutMode}";
    frame.itemSpacing = ${itemSpacing};
    frame.paddingLeft = ${pLeft};
    frame.paddingRight = ${pRight};
    frame.paddingTop = ${pTop};
    frame.paddingBottom = ${pBottom};
    frame.primaryAxisSizingMode = "${primaryAxisSizingMode}";
    frame.counterAxisSizingMode = "${counterAxisSizingMode}";

    // Set size - must be after sizing modes
    frame.resize(${width}, ${height});

    // Set fills
    const fills = ${JSON.stringify(normalizedFills)};
    if (fills.length > 0) {
      frame.fills = fills;
    }

    // Set corner radius
    if (${cornerRadius} > 0) {
      frame.cornerRadius = ${cornerRadius};
    }

    // Set position if provided
    ${x !== undefined ? `frame.x = ${x};` : ''}
    ${y !== undefined ? `frame.y = ${y};` : ''}

    // Add to current page
    figma.currentPage.appendChild(frame);

    // Center in viewport if no position specified
    ${x === undefined && y === undefined ? 'figma.viewport.scrollAndZoomIntoView([frame]);' : ''}

    return {
      id: frame.id,
      name: frame.name,
      width: frame.width,
      height: frame.height,
      x: frame.x,
      y: frame.y,
      layoutMode: frame.layoutMode,
      itemSpacing: frame.itemSpacing,
      primaryAxisSizingMode: frame.primaryAxisSizingMode,
      counterAxisSizingMode: frame.counterAxisSizingMode,
      padding: {
        left: frame.paddingLeft,
        right: frame.paddingRight,
        top: frame.paddingTop,
        bottom: frame.paddingBottom
      },
      success: true
    };
  `);

  sendProgress({ status: 'Auto-layout frame created successfully' });

  return result.result;
}

/**
 * Tool 3: create_text_node
 * Create a text node with styling
 */
async function createTextNode(api, args, sendProgress) {
  const {
    characters = 'Text',
    fontFamily = 'Inter',
    fontStyle = 'Regular',
    fontSize = 16,
    textColor = { r: 0, g: 0, b: 0 },
    textStyleName = null
  } = args;

  sendProgress({ status: `Creating text node "${characters}"...` });

  // Generate font loading code with normalization
  const fontLoadingCode = generateFontLoadingCode(fontFamily, fontStyle);

  const result = await api.executeInFigma(`
    // Load font with normalization (tries multiple style variations)
    ${fontLoadingCode}

    const text = figma.createText();
    text.fontName = loadedFont;
    text.fontSize = ${fontSize};
    text.characters = "${characters}";

    // Set text color
    const color = ${JSON.stringify(textColor)};
    text.fills = [{
      type: 'SOLID',
      color: { r: color.r, g: color.g, b: color.b }
    }];

    // Apply text style if specified
    ${textStyleName ? `
    const styles = await figma.getLocalTextStylesAsync();
    const style = styles.find(s => s.name === "${textStyleName}");
    if (style) {
      text.textStyleId = style.id;
    }
    ` : ''}

    // Add to current page
    figma.currentPage.appendChild(text);

    // Center in viewport
    figma.viewport.scrollAndZoomIntoView([text]);

    return {
      id: text.id,
      characters: text.characters,
      fontName: text.fontName,
      fontSize: text.fontSize,
      success: true
    };
  `);

  sendProgress({ status: 'Text node created successfully' });

  return result.result;
}

/**
 * Tool 4: bind_variable
 * Bind a variable to a node property
 */
async function bindVariable(api, args, sendProgress) {
  const {
    nodeId,
    variableName,
    property = 'width'
  } = args;

  if (!nodeId || !variableName) {
    throw {
      code: -32602,
      message: 'Missing required parameters: nodeId and variableName'
    };
  }

  sendProgress({ status: `Binding variable "${variableName}" to ${property}...` });

  const result = await api.executeInFigma(`
    const node = figma.getNodeById("${nodeId}");
    if (!node) {
      throw new Error("Node not found: ${nodeId}");
    }

    // Find variable by name
    const allVars = await figma.variables.getLocalVariablesAsync();
    const variable = allVars.find(v => v.name === "${variableName}");

    if (!variable) {
      throw new Error("Variable not found: ${variableName}");
    }

    // Bind variable to property
    const property = "${property}";

    if (property === 'fills') {
      // For fills, use setBoundVariableForPaint on first fill
      const fills = node.fills && node.fills.length > 0 ? node.fills : [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, visible: true }];
      const boundPaint = figma.variables.setBoundVariableForPaint(fills[0], 'color', variable);
      boundPaint.visible = true;  // Explicitly ensure visibility
      node.fills = [boundPaint];
    } else if (property === 'strokes') {
      // For strokes, use setBoundVariableForPaint on first stroke
      const strokes = node.strokes && node.strokes.length > 0 ? node.strokes : [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true }];
      const boundPaint = figma.variables.setBoundVariableForPaint(strokes[0], 'color', variable);
      boundPaint.visible = true;  // Explicitly ensure visibility
      node.strokes = [boundPaint];
    } else {
      // For other properties (width, height, padding, etc.)
      node.setBoundVariable(property, variable);
    }

    return {
      nodeId: node.id,
      nodeName: node.name,
      variableName: variable.name,
      variableId: variable.id,
      property: property,
      success: true
    };
  `);

  sendProgress({ status: 'Variable bound successfully' });

  return result.result;
}

/**
 * Bind variables to multiple nodes in a single operation
 * Batch workflow tool for efficient bulk variable binding
 */
async function batchBindVariables(api, args, sendProgress) {
  const { bindings } = args;

  if (!bindings || !Array.isArray(bindings) || bindings.length === 0) {
    throw {
      code: -32602,
      message: 'Missing required parameter: bindings array'
    };
  }

  // Validate each binding has required fields
  for (let i = 0; i < bindings.length; i++) {
    const binding = bindings[i];
    if (!binding.nodeId || !binding.variableName || !binding.property) {
      throw {
        code: -32602,
        message: `Binding at index ${i} missing required fields: nodeId, variableName, property`
      };
    }
  }

  sendProgress({ status: `Binding ${bindings.length} variables...` });

  const result = await api.executeInFigma(`
    const bindings = ${JSON.stringify(bindings)};

    // Look up all variables once (performance optimization)
    const allVars = await figma.variables.getLocalVariablesAsync();

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const binding of bindings) {
      try {
        const node = figma.getNodeById(binding.nodeId);
        if (!node) {
          results.push({
            nodeId: binding.nodeId,
            variableName: binding.variableName,
            property: binding.property,
            success: false,
            error: "Node not found"
          });
          errorCount++;
          continue;
        }

        const variable = allVars.find(v => v.name === binding.variableName);
        if (!variable) {
          results.push({
            nodeId: binding.nodeId,
            nodeName: node.name,
            variableName: binding.variableName,
            property: binding.property,
            success: false,
            error: "Variable not found"
          });
          errorCount++;
          continue;
        }

        // Apply binding using same logic as bind_variable tool
        const property = binding.property;

        if (property === 'fills') {
          // For fills, use setBoundVariableForPaint
          const fills = node.fills && node.fills.length > 0
            ? node.fills
            : [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, visible: true }];
          const boundPaint = figma.variables.setBoundVariableForPaint(fills[0], 'color', variable);
          boundPaint.visible = true;
          node.fills = [boundPaint];
        } else if (property === 'strokes') {
          // For strokes, use setBoundVariableForPaint
          const strokes = node.strokes && node.strokes.length > 0
            ? node.strokes
            : [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true }];
          const boundPaint = figma.variables.setBoundVariableForPaint(strokes[0], 'color', variable);
          boundPaint.visible = true;
          node.strokes = [boundPaint];
        } else {
          // For other properties (width, height, padding, etc.)
          node.setBoundVariable(property, variable);
        }

        results.push({
          nodeId: binding.nodeId,
          nodeName: node.name,
          nodeType: node.type,
          variableName: binding.variableName,
          variableId: variable.id,
          property: binding.property,
          success: true
        });
        successCount++;
      } catch (err) {
        results.push({
          nodeId: binding.nodeId,
          variableName: binding.variableName,
          property: binding.property,
          success: false,
          error: err.message
        });
        errorCount++;
      }
    }

    return {
      success: true,
      totalBindings: bindings.length,
      successCount: successCount,
      errorCount: errorCount,
      results: results
    };
  `);

  const resultData = result.result;
  sendProgress({
    status: `Bound ${resultData.successCount} of ${resultData.totalBindings} variables (${resultData.errorCount} errors)`
  });

  return resultData;
}

/**
 * Tool 5: create_instance
 * Create an instance of a component
 */
async function createInstance(api, args, sendProgress) {
  const {
    componentName,
    componentId = null,
    x = 0,
    y = 0
  } = args;

  if (!componentName && !componentId) {
    throw {
      code: -32602,
      message: 'Must provide either componentName or componentId'
    };
  }

  sendProgress({ status: `Creating instance of "${componentName || componentId}"...` });

  const result = await api.executeInFigma(`
    let component = null;

    if ("${componentId}") {
      // Find by ID
      component = figma.getNodeById("${componentId}");
      if (!component || component.type !== "COMPONENT") {
        throw new Error("Component not found or invalid: ${componentId}");
      }
    } else {
      // Find by name
      const components = await figma.getLocalComponentsAsync();
      component = components.find(c => c.name === "${componentName}");

      if (!component) {
        throw new Error("Component not found: ${componentName}");
      }
    }

    // Create instance
    const instance = component.createInstance();
    instance.x = ${x};
    instance.y = ${y};

    // Add to current page
    figma.currentPage.appendChild(instance);

    // Center in viewport
    figma.viewport.scrollAndZoomIntoView([instance]);

    return {
      id: instance.id,
      name: instance.name,
      componentName: component.name,
      componentId: component.id,
      x: instance.x,
      y: instance.y,
      width: instance.width,
      height: instance.height,
      success: true
    };
  `);

  sendProgress({ status: 'Instance created successfully' });

  return result.result;
}

/**
 * Tool 5b: create_multiple_instances
 * Create multiple instances of a component with auto-positioning and layout
 * Supports simple mode (count) and advanced mode (instanceConfigs)
 */
async function createMultipleInstances(api, args, sendProgress) {
  const {
    componentId,
    count = null,
    parentId = null,
    layout = 'vertical',
    spacing = 16,
    columns = 3,
    namingPattern = '{componentName} {index}',
    instanceConfigs = null
  } = args;

  if (!componentId) {
    throw {
      code: -32602,
      message: 'Missing required parameter: componentId'
    };
  }

  // Determine mode
  const isAdvancedMode = instanceConfigs && Array.isArray(instanceConfigs) && instanceConfigs.length > 0;
  const instanceCount = isAdvancedMode ? instanceConfigs.length : (count || 0);

  if (instanceCount === 0) {
    return {
      success: true,
      instancesCreated: 0,
      instances: [],
      layout: { type: layout, spacing, columns }
    };
  }

  sendProgress({
    status: `Creating ${instanceCount} instances of component ${componentId}...`
  });

  // Serialize configs for script
  const instanceConfigsJSON = JSON.stringify(instanceConfigs);

  const result = await api.executeInFigma(`
    const componentId = "${componentId}";
    const parentId = ${parentId ? `"${parentId}"` : 'null'};
    const layoutType = "${layout}";
    const spacing = ${spacing};
    const columns = ${columns};
    const namingPattern = "${namingPattern}";
    const instanceCount = ${instanceCount};
    const isAdvancedMode = ${isAdvancedMode};
    const instanceConfigs = ${instanceConfigsJSON};

    // Get component
    const component = figma.getNodeById(componentId);
    if (!component || component.type !== 'COMPONENT') {
      throw new Error("Component not found or invalid: " + componentId);
    }

    // Get parent (or use current page)
    let parent = parentId ? figma.getNodeById(parentId) : figma.currentPage;
    if (parentId && !parent) {
      throw new Error("Parent node not found: " + parentId);
    }

    // Helper: Apply naming pattern
    function applyNamingPattern(pattern, index, componentName) {
      return pattern
        .replace(/{componentName}/g, componentName)
        .replace(/{index}/g, String(index + 1))
        .replace(/{index0}/g, String(index));
    }

    // Helper: Calculate position based on layout
    function calculatePosition(index, width, height) {
      const startX = 0;
      const startY = 0;

      switch (layoutType) {
        case 'horizontal':
          return {
            x: startX + (index * (width + spacing)),
            y: startY
          };

        case 'grid':
          const row = Math.floor(index / columns);
          const col = index % columns;
          return {
            x: startX + (col * (width + spacing)),
            y: startY + (row * (height + spacing))
          };

        case 'vertical':
        default:
          return {
            x: startX,
            y: startY + (index * (height + spacing))
          };
      }
    }

    // Create instances
    const instances = [];
    const componentWidth = component.width;
    const componentHeight = component.height;

    for (let i = 0; i < instanceCount; i++) {
      // Create instance
      const instance = component.createInstance();

      // Get config (advanced mode) or use defaults
      const config = isAdvancedMode ? instanceConfigs[i] : {};

      // Set name
      if (config.name) {
        instance.name = config.name;
      } else {
        instance.name = applyNamingPattern(namingPattern, i, component.name);
      }

      // Set position
      if (config.x !== undefined && config.y !== undefined) {
        // Advanced mode with explicit position
        instance.x = config.x;
        instance.y = config.y;
      } else {
        // Auto-layout based on layout type
        const pos = calculatePosition(i, componentWidth, componentHeight);
        instance.x = pos.x;
        instance.y = pos.y;
      }

      // Apply component properties if specified
      if (config.componentProperties) {
        for (const [propName, propValue] of Object.entries(config.componentProperties)) {
          // Find property key in component
          const propDef = Object.entries(component.componentPropertyDefinitions || {})
            .find(([key, def]) => def.name === propName || key === propName);

          if (propDef) {
            const [propKey] = propDef;
            instance.setProperties({ [propKey]: propValue });
          }
        }
      }

      // Add to parent
      parent.appendChild(instance);

      // Collect instance info
      instances.push({
        id: instance.id,
        name: instance.name,
        x: instance.x,
        y: instance.y,
        width: instance.width,
        height: instance.height
      });
    }

    // Scroll into view (show first and last instance)
    if (instances.length > 0) {
      const firstInstance = figma.getNodeById(instances[0].id);
      const lastInstance = figma.getNodeById(instances[instances.length - 1].id);
      figma.viewport.scrollAndZoomIntoView([firstInstance, lastInstance]);
    }

    return {
      success: true,
      instancesCreated: instances.length,
      instances,
      layout: {
        type: layoutType,
        spacing,
        columns: layoutType === 'grid' ? columns : null
      },
      parent: {
        id: parent.id,
        name: parent.name
      },
      component: {
        id: component.id,
        name: component.name
      }
    };
  `);

  sendProgress({
    status: `Created ${instanceCount} instances successfully`
  });

  return result.result;
}

/**
 * Tool 5c: apply_responsive_pattern
 * Apply Flexbox Fractal Pattern to auto-layout containers
 *
 * Core Pattern:
 * - VERTICAL containers → children: layoutSizingHorizontal='FILL', layoutSizingVertical='HUG'
 * - HORIZONTAL containers → children: layoutSizingHorizontal='HUG', layoutSizingVertical='FILL'
 *
 * Applies recursively to all descendant auto-layout containers unless disabled.
 * Allows explicit exceptions for nodes that need FIXED sizing (avatars, icons, images).
 */
async function applyResponsivePattern(api, args, sendProgress) {
  const {
    nodeId,
    recursive = true,
    exceptions = [],
    dryRun = false
  } = args;

  if (!nodeId) {
    throw {
      code: -32602,
      message: 'Missing required parameter: nodeId'
    };
  }

  sendProgress({
    status: dryRun
      ? `Analyzing responsive pattern for node ${nodeId} (dry run)...`
      : `Applying responsive pattern to node ${nodeId}...`
  });

  // Build exception map for fast lookup
  const exceptionMap = {};
  for (const exc of exceptions) {
    exceptionMap[exc.nodeId] = exc.sizing;
  }

  const result = await api.executeInFigma(`
    const rootNode = figma.getNodeById("${nodeId}");
    if (!rootNode) {
      throw new Error("Node not found: ${nodeId}");
    }

    const recursive = ${recursive};
    const dryRun = ${dryRun};
    const exceptionMap = ${JSON.stringify(exceptionMap)};

    const changes = [];
    const skipped = [];

    /**
     * Apply the Flexbox Fractal Pattern to a node's children
     */
    function applyPattern(node) {
      // Only process auto-layout containers
      if (node.layoutMode === 'NONE') {
        return;
      }

      const isVertical = node.layoutMode === 'VERTICAL';
      const isHorizontal = node.layoutMode === 'HORIZONTAL';

      if (!isVertical && !isHorizontal) {
        return;
      }

      // Process all direct children
      for (const child of node.children) {
        const childId = child.id;

        // Check if this child is in exceptions list
        if (exceptionMap[childId]) {
          const exceptionSizing = exceptionMap[childId];

          // Apply exception sizing
          if (!dryRun) {
            if (typeof exceptionSizing === 'string') {
              // Simple string: 'FIXED' means both directions
              child.layoutSizingHorizontal = exceptionSizing;
              child.layoutSizingVertical = exceptionSizing;
            } else {
              // Object with horizontal/vertical specified
              if (exceptionSizing.horizontal) {
                child.layoutSizingHorizontal = exceptionSizing.horizontal;
              }
              if (exceptionSizing.vertical) {
                child.layoutSizingVertical = exceptionSizing.vertical;
              }
            }
          }

          skipped.push({
            id: childId,
            name: child.name,
            reason: 'exception',
            sizing: exceptionSizing
          });

          // Still recurse into exception nodes if recursive enabled
          if (recursive && child.children) {
            applyPattern(child);
          }

          continue;
        }

        // Get current sizing
        const currentHorizontal = child.layoutSizingHorizontal || 'HUG';
        const currentVertical = child.layoutSizingVertical || 'HUG';

        // Calculate target sizing based on parent's layoutMode
        let targetHorizontal, targetVertical;

        if (isVertical) {
          // VERTICAL parent → children FILL width, HUG height
          targetHorizontal = 'FILL';
          targetVertical = 'HUG';
        } else {
          // HORIZONTAL parent → children HUG width, FILL height
          targetHorizontal = 'HUG';
          targetVertical = 'FILL';
        }

        // Only apply if there's a change
        const horizontalChanged = currentHorizontal !== targetHorizontal;
        const verticalChanged = currentVertical !== targetVertical;

        if (horizontalChanged || verticalChanged) {
          if (!dryRun) {
            if (horizontalChanged) {
              child.layoutSizingHorizontal = targetHorizontal;
            }
            if (verticalChanged) {
              child.layoutSizingVertical = targetVertical;
            }
          }

          changes.push({
            id: childId,
            name: child.name,
            type: child.type,
            parentMode: node.layoutMode,
            before: {
              horizontal: currentHorizontal,
              vertical: currentVertical
            },
            after: {
              horizontal: targetHorizontal,
              vertical: targetVertical
            },
            applied: !dryRun
          });
        }

        // Recurse into child if it has children and recursive is enabled
        if (recursive && child.children) {
          applyPattern(child);
        }
      }
    }

    // Start pattern application
    applyPattern(rootNode);

    return {
      success: true,
      nodeId: "${nodeId}",
      nodeName: rootNode.name,
      recursive: recursive,
      dryRun: dryRun,
      totalChanges: changes.length,
      totalExceptions: skipped.length,
      changes: changes,
      exceptions: skipped
    };
  `);

  if (dryRun) {
    sendProgress({
      status: `Dry run complete: ${result.totalChanges} changes identified, ${result.totalExceptions} exceptions`
    });
  } else {
    sendProgress({
      status: `Pattern applied: ${result.totalChanges} nodes updated, ${result.totalExceptions} exceptions`
    });
  }

  return result;
}

/**
 * Tool 6: add_children
 * Add child nodes to an existing parent
 */
async function addChildren(api, args, sendProgress) {
  const { parentId, children } = args;

  if (!parentId || !children || children.length === 0) {
    throw {
      code: -32602,
      message: 'Missing required parameters: parentId and children array'
    };
  }

  sendProgress({ status: `Adding ${children.length} children to node ${parentId}...` });

  // Normalize fills and strokes in all children (extract alpha from color.a to paint.opacity)
  const normalizedChildren = children.map(child => {
    const normalized = { ...child };
    if (child.fills) {
      normalized.fills = normalizePaints(child.fills);
    }
    if (child.strokes) {
      normalized.strokes = normalizePaints(child.strokes);
    }
    return normalized;
  });

  const result = await api.executeInFigma(`
    const parent = figma.getNodeById("${parentId}");
    if (!parent) {
      throw new Error("Parent node not found: ${parentId}");
    }

    const children = ${JSON.stringify(normalizedChildren)};
    const createdNodes = [];

    // Look up all variables once (performance optimization for bindings)
    const allVars = await figma.variables.getLocalVariablesAsync();

    for (const childSpec of children) {
      let child = null;

      switch (childSpec.type) {
        case 'instance':
          // Create instance of component
          const component = figma.getNodeById(childSpec.componentId);
          if (!component || component.type !== 'COMPONENT') {
            throw new Error(\`Component not found: \${childSpec.componentId}\`);
          }
          child = component.createInstance();
          child.name = childSpec.name;

          // NEW: Set component properties if provided (Issue #2)
          if (childSpec.componentProperties) {
            child.setProperties(childSpec.componentProperties);
          }
          break;

        case 'text':
          // Create text node - it starts with Inter Regular font by default
          // Must load Inter Regular first before doing anything
          await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
          child = figma.createText();
          child.name = childSpec.name;

          // Apply text style if provided
          if (childSpec.textStyleId) {
            const textStyle = figma.getStyleById(childSpec.textStyleId);
            if (textStyle && textStyle.type === 'TEXT') {
              // Load the font from the text style
              await figma.loadFontAsync(textStyle.fontName);
              // Apply text style (this changes the font)
              child.textStyleId = childSpec.textStyleId;
              // Now set the text content
              child.characters = childSpec.characters || '';
            } else {
              throw new Error(\`Text style not found or invalid: \${childSpec.textStyleId}\`);
            }
          } else {
            // Use manual font specifications with normalization
            const fontFamily = childSpec.fontFamily || 'DM Sans';
            const fontStyle = childSpec.fontStyle || 'Regular';

            // Load font with normalization - inlined code
            const normalizeFontStyle = function(styleName) {
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
              for (const [standard, aliases] of Object.entries(standardStyles)) {
                if (standard.toLowerCase() === styleName.toLowerCase()) return aliases;
              }
              return [styleName];
            };

            const stylesToTry = normalizeFontStyle(fontStyle);
            let loadedFont = null;

            for (const styleVariant of stylesToTry) {
              try {
                const fontName = { family: fontFamily, style: styleVariant };
                await figma.loadFontAsync(fontName);
                loadedFont = fontName;
                break;
              } catch (err) {
                continue;
              }
            }

            if (!loadedFont) {
              throw new Error(\`Font "\${fontFamily}" does not have any of these styles: \${stylesToTry.join(', ')}. Please check available font styles in Figma.\`);
            }

            child.fontName = loadedFont;
            child.fontSize = childSpec.fontSize || 16;
            child.characters = childSpec.characters || '';
          }

          if (childSpec.fills) {
            child.fills = childSpec.fills;
          }

          // Text alignment
          if (childSpec.textAlignHorizontal) {
            child.textAlignHorizontal = childSpec.textAlignHorizontal;
          }
          if (childSpec.textAlignVertical) {
            child.textAlignVertical = childSpec.textAlignVertical;
          }

          // Line height
          if (childSpec.lineHeight) {
            child.lineHeight = childSpec.lineHeight;
          }

          // Text auto resize mode - CRITICAL for responsive text
          // Set BEFORE adding to parent
          if (childSpec.layoutSizingHorizontal === 'FILL' || childSpec.layoutSizingHorizontal === 'FIXED') {
            child.textAutoResize = 'HEIGHT';  // Fixed width, auto height (enables wrapping)
          } else {
            child.textAutoResize = childSpec.textAutoResize || 'WIDTH_AND_HEIGHT';
          }

          // layoutSizing* will be applied after appendChild using childSpec
          break;

        case 'frame':
          // Create frame
          child = figma.createFrame();
          child.name = childSpec.name;

          // Set dimensions ONLY if explicitly specified (for FIXED sizing)
          // If not specified, rely on responsive sizing (FILL/HUG) instead
          if (childSpec.width !== undefined && childSpec.height !== undefined) {
            child.resize(childSpec.width, childSpec.height);
          } else if (childSpec.width !== undefined) {
            child.resize(childSpec.width, child.height);
          } else if (childSpec.height !== undefined) {
            child.resize(child.width, childSpec.height);
          }
          // If no dimensions specified, don't resize - let responsive sizing handle it

          // Set layout mode and properties
          if (childSpec.layoutMode) {
            child.layoutMode = childSpec.layoutMode;

            // Item spacing
            if (childSpec.itemSpacing !== undefined) {
              child.itemSpacing = childSpec.itemSpacing;
            }

            // Padding - support both unified and individual
            if (childSpec.padding !== undefined) {
              child.paddingLeft = childSpec.padding;
              child.paddingRight = childSpec.padding;
              child.paddingTop = childSpec.padding;
              child.paddingBottom = childSpec.padding;
            }
            if (childSpec.paddingLeft !== undefined) child.paddingLeft = childSpec.paddingLeft;
            if (childSpec.paddingRight !== undefined) child.paddingRight = childSpec.paddingRight;
            if (childSpec.paddingTop !== undefined) child.paddingTop = childSpec.paddingTop;
            if (childSpec.paddingBottom !== undefined) child.paddingBottom = childSpec.paddingBottom;

            // Alignment
            if (childSpec.primaryAxisAlignItems) child.primaryAxisAlignItems = childSpec.primaryAxisAlignItems;
            if (childSpec.counterAxisAlignItems) child.counterAxisAlignItems = childSpec.counterAxisAlignItems;

            // Sizing modes
            if (childSpec.primaryAxisSizingMode) child.primaryAxisSizingMode = childSpec.primaryAxisSizingMode;
            if (childSpec.counterAxisSizingMode) child.counterAxisSizingMode = childSpec.counterAxisSizingMode;
          }

          // Corner radius - support both unified and individual
          if (childSpec.cornerRadius !== undefined) {
            child.cornerRadius = childSpec.cornerRadius;
          }
          if (childSpec.topLeftRadius !== undefined) child.topLeftRadius = childSpec.topLeftRadius;
          if (childSpec.topRightRadius !== undefined) child.topRightRadius = childSpec.topRightRadius;
          if (childSpec.bottomLeftRadius !== undefined) child.bottomLeftRadius = childSpec.bottomLeftRadius;
          if (childSpec.bottomRightRadius !== undefined) child.bottomRightRadius = childSpec.bottomRightRadius;

          // Layout sizing will be applied AFTER appendChild (deferred)

          // Appearance
          if (childSpec.fills) {
            child.fills = childSpec.fills;
          }
          if (childSpec.strokes) {
            child.strokes = childSpec.strokes;
            if (childSpec.strokeWeight !== undefined) child.strokeWeight = childSpec.strokeWeight;
          }
          break;

        case 'rectangle':
          // Create rectangle
          child = figma.createRectangle();
          child.name = childSpec.name;

          // Set dimensions ONLY if explicitly specified
          if (childSpec.width !== undefined && childSpec.height !== undefined) {
            child.resize(childSpec.width, childSpec.height);
          } else if (childSpec.width !== undefined) {
            child.resize(childSpec.width, child.height);
          } else if (childSpec.height !== undefined) {
            child.resize(child.width, childSpec.height);
          }
          // If no dimensions specified, don't resize

          // Corner radius
          if (childSpec.cornerRadius !== undefined) {
            child.cornerRadius = childSpec.cornerRadius;
          }

          // Layout sizing will be applied AFTER appendChild (deferred)

          // Appearance
          if (childSpec.fills) {
            child.fills = childSpec.fills;
          }
          if (childSpec.strokes) {
            child.strokes = childSpec.strokes;
            if (childSpec.strokeWeight !== undefined) child.strokeWeight = childSpec.strokeWeight;
          }
          break;
      }

      // NEW: Apply variable bindings if provided (Issue #3)
      if (child && childSpec.bindings) {
        for (const [property, bindingValue] of Object.entries(childSpec.bindings)) {
          try {
            // Support both formats:
            // 1. Simple string: {fills: "Fills/card-background"}
            // 2. Array format: {fills: [{type: "VARIABLE", variableName: "Fills/card-background"}]}
            // 3. Object format: {paddingTop: {variableName: "Spacing/spacing-4"}}

            let variableName;
            if (typeof bindingValue === 'string') {
              variableName = bindingValue;
            } else if (Array.isArray(bindingValue) && bindingValue[0]?.variableName) {
              variableName = bindingValue[0].variableName;
            } else if (bindingValue?.variableName) {
              variableName = bindingValue.variableName;
            } else {
              continue;
            }

            const variable = allVars.find(v => v.name === variableName);
            if (variable) {
              // Use same logic as bind_variable tool
              if (property === 'fills') {
                const fills = child.fills && child.fills.length > 0
                  ? child.fills
                  : [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, visible: true }];
                const boundPaint = figma.variables.setBoundVariableForPaint(fills[0], 'color', variable);
                boundPaint.visible = true;
                child.fills = [boundPaint];
              } else if (property === 'strokes') {
                const strokes = child.strokes && child.strokes.length > 0
                  ? child.strokes
                  : [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true }];
                const boundPaint = figma.variables.setBoundVariableForPaint(strokes[0], 'color', variable);
                boundPaint.visible = true;
                child.strokes = [boundPaint];
              } else {
                child.setBoundVariable(property, variable);
              }
            }
          } catch (err) {
            // Continue on binding errors - don't fail entire operation
            console.warn(\`Failed to bind \${property} to \${bindingValue}: \${err.message}\`);
          }
        }
      }

      // NEW: Apply styles if provided (effectStyleId, fillStyleId, strokeStyleId)
      if (child) {
        if (childSpec.effectStyleId) {
          try {
            child.effectStyleId = childSpec.effectStyleId;
          } catch (err) {
            console.warn(\`Failed to apply effect style: \${err.message}\`);
          }
        }
        if (childSpec.fillStyleId) {
          try {
            child.fillStyleId = childSpec.fillStyleId;
          } catch (err) {
            console.warn(\`Failed to apply fill style: \${err.message}\`);
          }
        }
        if (childSpec.strokeStyleId) {
          try {
            child.strokeStyleId = childSpec.strokeStyleId;
          } catch (err) {
            console.warn(\`Failed to apply stroke style: \${err.message}\`);
          }
        }
      }

      // NEW: Recursively add nested children if provided
      if (child && childSpec.children && Array.isArray(childSpec.children)) {
        // Recursively process nested children
        for (const nestedChildSpec of childSpec.children) {
          let nestedChild = null;

          switch (nestedChildSpec.type) {
            case 'instance':
              const nestedComponent = figma.getNodeById(nestedChildSpec.componentId);
              if (nestedComponent && nestedComponent.type === 'COMPONENT') {
                nestedChild = nestedComponent.createInstance();
                nestedChild.name = nestedChildSpec.name;
                if (nestedChildSpec.componentProperties) {
                  nestedChild.setProperties(nestedChildSpec.componentProperties);
                }
              }
              break;

            case 'text':
              await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
              nestedChild = figma.createText();
              nestedChild.name = nestedChildSpec.name;

              if (nestedChildSpec.textStyleId) {
                const textStyle = figma.getStyleById(nestedChildSpec.textStyleId);
                if (textStyle && textStyle.type === 'TEXT') {
                  await figma.loadFontAsync(textStyle.fontName);
                  nestedChild.textStyleId = nestedChildSpec.textStyleId;
                  nestedChild.characters = nestedChildSpec.characters || '';
                }
              } else {
                const fontFamily = nestedChildSpec.fontFamily || 'DM Sans';
                const fontStyle = nestedChildSpec.fontStyle || 'Regular';

                // Load font with normalization (same logic as parent text)
                const normalizeFontStyle = function(styleName) {
                  const standardStyles = {
                    'SemiBold': ['SemiBold', 'Semi Bold', 'Semibold', 'Medium', 'Demi Bold', 'DemiBold'],
                    'Bold': ['Bold'],
                    'Medium': ['Medium'],
                    'Regular': ['Regular', 'Normal', 'Book'],
                    'ExtraBold': ['ExtraBold', 'Extra Bold', 'Extrabold', 'Black', 'Heavy']
                  };
                  for (const [standard, aliases] of Object.entries(standardStyles)) {
                    if (standard.toLowerCase() === styleName.toLowerCase()) return aliases;
                  }
                  return [styleName];
                };

                const stylesToTry = normalizeFontStyle(fontStyle);
                let loadedFont = null;
                for (const styleVariant of stylesToTry) {
                  try {
                    const fontName = { family: fontFamily, style: styleVariant };
                    await figma.loadFontAsync(fontName);
                    loadedFont = fontName;
                    break;
                  } catch (err) {
                    continue;
                  }
                }

                if (!loadedFont) {
                  throw new Error(\`Font "\${fontFamily}" does not have any of these styles: \${stylesToTry.join(', ')}\`);
                }

                nestedChild.fontName = loadedFont;
                nestedChild.fontSize = nestedChildSpec.fontSize || 16;
                nestedChild.characters = nestedChildSpec.characters || '';
              }

              if (nestedChildSpec.textAlignHorizontal) {
                nestedChild.textAlignHorizontal = nestedChildSpec.textAlignHorizontal;
              }

              if (nestedChildSpec.fills) {
                nestedChild.fills = nestedChildSpec.fills;
              }

              // Line height
              if (nestedChildSpec.lineHeight) {
                nestedChild.lineHeight = nestedChildSpec.lineHeight;
              }

              // Text auto resize mode - CRITICAL for responsive text
              if (nestedChildSpec.layoutSizingHorizontal === 'FILL' || nestedChildSpec.layoutSizingHorizontal === 'FIXED') {
                nestedChild.textAutoResize = 'HEIGHT';
              } else {
                nestedChild.textAutoResize = nestedChildSpec.textAutoResize || 'WIDTH_AND_HEIGHT';
              }

              // layoutSizing* will be applied after appendChild using nestedChildSpec
              break;

            case 'frame':
              nestedChild = figma.createFrame();
              nestedChild.name = nestedChildSpec.name;

              // Set dimensions ONLY if explicitly specified (for FIXED sizing)
              if (nestedChildSpec.width !== undefined && nestedChildSpec.height !== undefined) {
                nestedChild.resize(nestedChildSpec.width, nestedChildSpec.height);
              } else if (nestedChildSpec.width !== undefined) {
                nestedChild.resize(nestedChildSpec.width, nestedChild.height);
              } else if (nestedChildSpec.height !== undefined) {
                nestedChild.resize(nestedChild.width, nestedChildSpec.height);
              }
              // If no dimensions specified, don't resize - let responsive sizing handle it

              if (nestedChildSpec.layoutMode) {
                nestedChild.layoutMode = nestedChildSpec.layoutMode;
                if (nestedChildSpec.itemSpacing !== undefined) nestedChild.itemSpacing = nestedChildSpec.itemSpacing;
                if (nestedChildSpec.padding !== undefined) {
                  nestedChild.paddingLeft = nestedChildSpec.padding;
                  nestedChild.paddingRight = nestedChildSpec.padding;
                  nestedChild.paddingTop = nestedChildSpec.padding;
                  nestedChild.paddingBottom = nestedChildSpec.padding;
                }
                if (nestedChildSpec.paddingLeft !== undefined) nestedChild.paddingLeft = nestedChildSpec.paddingLeft;
                if (nestedChildSpec.paddingRight !== undefined) nestedChild.paddingRight = nestedChildSpec.paddingRight;
                if (nestedChildSpec.paddingTop !== undefined) nestedChild.paddingTop = nestedChildSpec.paddingTop;
                if (nestedChildSpec.paddingBottom !== undefined) nestedChild.paddingBottom = nestedChildSpec.paddingBottom;
                if (nestedChildSpec.primaryAxisAlignItems) nestedChild.primaryAxisAlignItems = nestedChildSpec.primaryAxisAlignItems;
                if (nestedChildSpec.counterAxisAlignItems) nestedChild.counterAxisAlignItems = nestedChildSpec.counterAxisAlignItems;
                if (nestedChildSpec.primaryAxisSizingMode) nestedChild.primaryAxisSizingMode = nestedChildSpec.primaryAxisSizingMode;
                if (nestedChildSpec.counterAxisSizingMode) nestedChild.counterAxisSizingMode = nestedChildSpec.counterAxisSizingMode;
              }

              if (nestedChildSpec.cornerRadius !== undefined) nestedChild.cornerRadius = nestedChildSpec.cornerRadius;
              if (nestedChildSpec.topLeftRadius !== undefined) nestedChild.topLeftRadius = nestedChildSpec.topLeftRadius;
              if (nestedChildSpec.topRightRadius !== undefined) nestedChild.topRightRadius = nestedChildSpec.topRightRadius;
              if (nestedChildSpec.bottomLeftRadius !== undefined) nestedChild.bottomLeftRadius = nestedChildSpec.bottomLeftRadius;
              if (nestedChildSpec.bottomRightRadius !== undefined) nestedChild.bottomRightRadius = nestedChildSpec.bottomRightRadius;

              // Layout sizing will be applied AFTER appendChild (deferred)

              if (nestedChildSpec.fills) nestedChild.fills = nestedChildSpec.fills;
              if (nestedChildSpec.strokes) {
                nestedChild.strokes = nestedChildSpec.strokes;
                if (nestedChildSpec.strokeWeight !== undefined) nestedChild.strokeWeight = nestedChildSpec.strokeWeight;
              }
              break;

            case 'rectangle':
              nestedChild = figma.createRectangle();
              nestedChild.name = nestedChildSpec.name;

              // Set dimensions ONLY if explicitly specified
              if (nestedChildSpec.width !== undefined && nestedChildSpec.height !== undefined) {
                nestedChild.resize(nestedChildSpec.width, nestedChildSpec.height);
              } else if (nestedChildSpec.width !== undefined) {
                nestedChild.resize(nestedChildSpec.width, nestedChild.height);
              } else if (nestedChildSpec.height !== undefined) {
                nestedChild.resize(nestedChild.width, nestedChildSpec.height);
              }
              // If no dimensions specified, don't resize

              if (nestedChildSpec.cornerRadius !== undefined) nestedChild.cornerRadius = nestedChildSpec.cornerRadius;

              // Layout sizing will be applied AFTER appendChild (deferred)

              if (nestedChildSpec.fills) nestedChild.fills = nestedChildSpec.fills;
              if (nestedChildSpec.strokes) {
                nestedChild.strokes = nestedChildSpec.strokes;
                if (nestedChildSpec.strokeWeight !== undefined) nestedChild.strokeWeight = nestedChildSpec.strokeWeight;
              }
              break;
          }

          // Apply bindings to nested child
          if (nestedChild && nestedChildSpec.bindings) {
            for (const [property, bindingValue] of Object.entries(nestedChildSpec.bindings)) {
              try {
                let variableName;
                if (typeof bindingValue === 'string') {
                  variableName = bindingValue;
                } else if (Array.isArray(bindingValue) && bindingValue[0]?.variableName) {
                  variableName = bindingValue[0].variableName;
                } else if (bindingValue?.variableName) {
                  variableName = bindingValue.variableName;
                } else {
                  continue;
                }

                const variable = allVars.find(v => v.name === variableName);
                if (variable) {
                  if (property === 'fills') {
                    const fills = nestedChild.fills && nestedChild.fills.length > 0
                      ? nestedChild.fills
                      : [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, visible: true }];
                    const boundPaint = figma.variables.setBoundVariableForPaint(fills[0], 'color', variable);
                    boundPaint.visible = true;
                    nestedChild.fills = [boundPaint];
                  } else if (property === 'strokes') {
                    const strokes = nestedChild.strokes && nestedChild.strokes.length > 0
                      ? nestedChild.strokes
                      : [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true }];
                    const boundPaint = figma.variables.setBoundVariableForPaint(strokes[0], 'color', variable);
                    boundPaint.visible = true;
                    nestedChild.strokes = [boundPaint];
                  } else {
                    nestedChild.setBoundVariable(property, variable);
                  }
                }
              } catch (err) {
                console.warn(\`Failed to bind \${property} on nested child: \${err.message}\`);
              }
            }
          }

          if (nestedChild) {
            // AUTOMATIC RESPONSIVE DEFAULTS for nested children based on parent's layout mode
            // Only apply if parent (child) is an auto-layout frame
            try {
              if (child.layoutMode && child.layoutMode !== 'NONE') {
                if (child.layoutMode === 'VERTICAL') {
                  // VERTICAL parent → children should FILL width and HUG height
                  if (nestedChildSpec.layoutSizingHorizontal === undefined) {
                    nestedChild.layoutSizingHorizontal = 'FILL';
                  }
                  if (nestedChildSpec.layoutSizingVertical === undefined) {
                    nestedChild.layoutSizingVertical = 'HUG';
                  }
                } else if (child.layoutMode === 'HORIZONTAL') {
                  // HORIZONTAL parent → children should HUG width and FILL height
                  if (nestedChildSpec.layoutSizingHorizontal === undefined) {
                    nestedChild.layoutSizingHorizontal = 'HUG';
                  }
                  if (nestedChildSpec.layoutSizingVertical === undefined) {
                    nestedChild.layoutSizingVertical = 'FILL';
                  }
                }
              }
            } catch (err) {
              // Silently fail if responsive defaults can't be applied
              console.warn('Could not apply responsive defaults to nested child:', err.message);
            }

            child.appendChild(nestedChild);

            // Apply layout sizing for ALL nested node types (must be done AFTER appendChild)
            // This enables declarative layout sizing specification (Issue #27)
            if (nestedChildSpec.layoutSizingHorizontal || nestedChildSpec.layoutSizingVertical || nestedChildSpec.layoutAlign) {
              try {
                if (nestedChildSpec.layoutSizingHorizontal) {
                  nestedChild.layoutSizingHorizontal = nestedChildSpec.layoutSizingHorizontal;
                }
                if (nestedChildSpec.layoutSizingVertical) {
                  nestedChild.layoutSizingVertical = nestedChildSpec.layoutSizingVertical;
                }
                if (nestedChildSpec.layoutAlign) {
                  nestedChild.layoutAlign = nestedChildSpec.layoutAlign;
                }
              } catch (err) {
                console.warn(\`Failed to apply layout sizing to nested child: \${err.message}\`);
              }
            }
          }
        }
      }

      if (child) {
        // AUTOMATIC RESPONSIVE DEFAULTS based on parent's layout mode
        // Only apply if parent is an auto-layout frame and user hasn't explicitly set these properties
        try {
          if (parent.layoutMode && parent.layoutMode !== 'NONE') {
            if (parent.layoutMode === 'VERTICAL') {
              // VERTICAL parent → children should FILL width and HUG height
              if (childSpec.layoutSizingHorizontal === undefined) {
                child.layoutSizingHorizontal = 'FILL';
              }
              if (childSpec.layoutSizingVertical === undefined) {
                child.layoutSizingVertical = 'HUG';
              }
            } else if (parent.layoutMode === 'HORIZONTAL') {
              // HORIZONTAL parent → children should HUG width and FILL height
              if (childSpec.layoutSizingHorizontal === undefined) {
                child.layoutSizingHorizontal = 'HUG';
              }
              if (childSpec.layoutSizingVertical === undefined) {
                child.layoutSizingVertical = 'FILL';
              }
            }
          }
        } catch (err) {
          // Silently fail if responsive defaults can't be applied (e.g., parent isn't auto-layout)
          console.warn('Could not apply responsive defaults:', err.message);
        }

        parent.appendChild(child);

        // Apply layout sizing for ALL node types (must be done AFTER appendChild)
        // This enables declarative layout sizing specification (Issue #27)
        if (childSpec.layoutSizingHorizontal || childSpec.layoutSizingVertical || childSpec.layoutAlign) {
          try {
            if (childSpec.layoutSizingHorizontal) {
              child.layoutSizingHorizontal = childSpec.layoutSizingHorizontal;
            }
            if (childSpec.layoutSizingVertical) {
              child.layoutSizingVertical = childSpec.layoutSizingVertical;
            }
            if (childSpec.layoutAlign) {
              child.layoutAlign = childSpec.layoutAlign;
            }
          } catch (err) {
            console.warn(\`Failed to apply layout sizing: \${err.message}\`);
          }
        }

        createdNodes.push({
          id: child.id,
          name: child.name,
          type: child.type
        });
      }
    }

    return {
      parentId: parent.id,
      parentName: parent.name,
      childrenCreated: createdNodes.length,
      children: createdNodes,
      success: true
    };
  `);

  sendProgress({ status: `Successfully added ${result.result.childrenCreated} children` });

  return result.result;
}

/**
 * Tool 6b: wrap_in_container
 * Wrap existing nodes in a new auto-layout container (bottom-up approach)
 * Supports both container properties and wrapped nodes layout control
 */
async function wrapInContainer(api, args, sendProgress) {
  const { nodeIds, containerSpec, wrappedNodesLayout = 'AUTO' } = args;

  if (!nodeIds || nodeIds.length === 0) {
    throw new Error('At least one nodeId is required');
  }

  sendProgress({ status: `Wrapping ${nodeIds.length} node(s) in container "${containerSpec.name}"...` });

  // Normalize fills and strokes in containerSpec (extract alpha from color.a to paint.opacity)
  const normalizedContainerSpec = { ...containerSpec };
  if (containerSpec.fills) {
    normalizedContainerSpec.fills = normalizePaints(containerSpec.fills);
  }
  if (containerSpec.strokes) {
    normalizedContainerSpec.strokes = normalizePaints(containerSpec.strokes);
  }

  const containerSpecJSON = JSON.stringify(normalizedContainerSpec);
  const nodeIdsJSON = JSON.stringify(nodeIds);
  const wrappedLayoutJSON = JSON.stringify(wrappedNodesLayout);

  const result = await api.executeInFigma(`
    const nodeIds = ${nodeIdsJSON};
    const containerSpec = ${containerSpecJSON};
    const wrappedNodesLayout = ${wrappedLayoutJSON};

    // Get all nodes to wrap
    const nodesToWrap = [];
    for (const nodeId of nodeIds) {
      const node = figma.getNodeById(nodeId);
      if (!node) {
        throw new Error(\`Node not found: \${nodeId}\`);
      }
      nodesToWrap.push(node);
    }

    // Get the parent of the first node (all nodes should be in same parent)
    const firstNode = nodesToWrap[0];
    const originalParent = firstNode.parent;
    const insertIndex = originalParent.children.indexOf(firstNode);

    // Create container frame
    const container = figma.createFrame();
    container.name = containerSpec.name;

    // Set layout mode (required)
    container.layoutMode = containerSpec.layoutMode;

    // Set dimensions if specified (use FIXED sizing)
    // HORIZONTAL: primaryAxis=horizontal(width), counterAxis=vertical(height)
    // VERTICAL: primaryAxis=vertical(height), counterAxis=horizontal(width)
    if (containerSpec.width !== undefined && containerSpec.height !== undefined) {
      container.resize(containerSpec.width, containerSpec.height);
      if (containerSpec.layoutMode === 'HORIZONTAL') {
        container.primaryAxisSizingMode = 'FIXED';   // width (primary in HORIZONTAL)
        container.counterAxisSizingMode = 'FIXED';   // height (counter in HORIZONTAL)
      } else if (containerSpec.layoutMode === 'VERTICAL') {
        container.counterAxisSizingMode = 'FIXED';   // width (counter in VERTICAL)
        container.primaryAxisSizingMode = 'FIXED';   // height (primary in VERTICAL)
      }
    } else if (containerSpec.width !== undefined) {
      container.resize(containerSpec.width, container.height);
      if (containerSpec.layoutMode === 'HORIZONTAL') {
        container.primaryAxisSizingMode = 'FIXED';   // width
      } else if (containerSpec.layoutMode === 'VERTICAL') {
        container.counterAxisSizingMode = 'FIXED';   // width
      }
    } else if (containerSpec.height !== undefined) {
      container.resize(container.width, containerSpec.height);
      if (containerSpec.layoutMode === 'HORIZONTAL') {
        container.counterAxisSizingMode = 'FIXED';   // height
      } else if (containerSpec.layoutMode === 'VERTICAL') {
        container.primaryAxisSizingMode = 'FIXED';   // height
      }
    }
    // If no dimensions, let it size based on children (AUTO/HUG)

    // Set auto-layout properties
    if (containerSpec.itemSpacing !== undefined) {
      container.itemSpacing = containerSpec.itemSpacing;
    }

    // Padding
    if (containerSpec.padding !== undefined) {
      container.paddingLeft = containerSpec.padding;
      container.paddingRight = containerSpec.padding;
      container.paddingTop = containerSpec.padding;
      container.paddingBottom = containerSpec.padding;
    }
    if (containerSpec.paddingLeft !== undefined) container.paddingLeft = containerSpec.paddingLeft;
    if (containerSpec.paddingRight !== undefined) container.paddingRight = containerSpec.paddingRight;
    if (containerSpec.paddingTop !== undefined) container.paddingTop = containerSpec.paddingTop;
    if (containerSpec.paddingBottom !== undefined) container.paddingBottom = containerSpec.paddingBottom;

    // Alignment
    if (containerSpec.primaryAxisAlignItems) container.primaryAxisAlignItems = containerSpec.primaryAxisAlignItems;
    if (containerSpec.counterAxisAlignItems) container.counterAxisAlignItems = containerSpec.counterAxisAlignItems;

    // Sizing modes
    if (containerSpec.primaryAxisSizingMode) container.primaryAxisSizingMode = containerSpec.primaryAxisSizingMode;
    if (containerSpec.counterAxisSizingMode) container.counterAxisSizingMode = containerSpec.counterAxisSizingMode;

    // Corner radius
    if (containerSpec.cornerRadius !== undefined) {
      container.cornerRadius = containerSpec.cornerRadius;
    }
    if (containerSpec.topLeftRadius !== undefined) container.topLeftRadius = containerSpec.topLeftRadius;
    if (containerSpec.topRightRadius !== undefined) container.topRightRadius = containerSpec.topRightRadius;
    if (containerSpec.bottomLeftRadius !== undefined) container.bottomLeftRadius = containerSpec.bottomLeftRadius;
    if (containerSpec.bottomRightRadius !== undefined) container.bottomRightRadius = containerSpec.bottomRightRadius;

    // Appearance
    if (containerSpec.fills) container.fills = containerSpec.fills;
    if (containerSpec.strokes) {
      container.strokes = containerSpec.strokes;
      if (containerSpec.strokeWeight !== undefined) container.strokeWeight = containerSpec.strokeWeight;
    }

    // Insert container into original parent at the position of first wrapped node
    originalParent.insertChild(insertIndex, container);

    // Apply responsive sizing to the container itself based on ITS parent's layout mode
    try {
      if (originalParent.layoutMode && originalParent.layoutMode !== 'NONE') {
        if (originalParent.layoutMode === 'VERTICAL') {
          // Parent is VERTICAL → container should FILL width, HUG height
          container.layoutSizingHorizontal = 'FILL';
          container.layoutSizingVertical = 'HUG';
        } else if (originalParent.layoutMode === 'HORIZONTAL') {
          // Parent is HORIZONTAL → container should HUG width, FILL height
          container.layoutSizingHorizontal = 'HUG';
          container.layoutSizingVertical = 'FILL';
        }
      }
    } catch (err) {
      console.log(\`Note: Could not apply responsive sizing to container \${container.name} - using default sizing\`);
    }

    // Move all nodes into container and apply wrapped layout
    for (const node of nodesToWrap) {
      container.appendChild(node);

      // Apply wrapped nodes layout (wrapped in try-catch for nodes that don't support sizing)
      try {
        if (wrappedNodesLayout === 'AUTO') {
          // Automatic responsive defaults based on container direction
          // Only works for auto-layout frames and text nodes
          if (containerSpec.layoutMode === 'VERTICAL') {
            node.layoutSizingHorizontal = 'FILL';
            node.layoutSizingVertical = 'HUG';
          } else if (containerSpec.layoutMode === 'HORIZONTAL') {
            node.layoutSizingHorizontal = 'HUG';
            node.layoutSizingVertical = 'FILL';
          }
        } else if (typeof wrappedNodesLayout === 'object') {
          // Explicit layout settings
          if (wrappedNodesLayout.layoutSizingHorizontal) {
            node.layoutSizingHorizontal = wrappedNodesLayout.layoutSizingHorizontal;
          }
          if (wrappedNodesLayout.layoutSizingVertical) {
            node.layoutSizingVertical = wrappedNodesLayout.layoutSizingVertical;
          }
          if (wrappedNodesLayout.layoutAlign) {
            node.layoutAlign = wrappedNodesLayout.layoutAlign;
          }
        }
      } catch (err) {
        // Silently ignore if node doesn't support layoutSizing (e.g., rectangles, images)
        // These nodes will keep their fixed size and be positioned by container alignment
        console.log(\`Note: Could not apply layout sizing to \${node.name} (\${node.type}) - using fixed sizing\`);
      }
    }

    // Apply variable bindings to container if specified
    if (containerSpec.bindings) {
      const allVars = await figma.variables.getLocalVariablesAsync();

      for (const [property, bindingValue] of Object.entries(containerSpec.bindings)) {
        try {
          const variableName = typeof bindingValue === 'string' ? bindingValue : bindingValue.variableName;
          const variable = allVars.find(v => v.name === variableName);

          if (variable) {
            if (property === 'fills') {
              const fills = container.fills && container.fills.length > 0
                ? container.fills
                : [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, visible: true }];
              const boundPaint = figma.variables.setBoundVariableForPaint(fills[0], 'color', variable);
              boundPaint.visible = true;
              container.fills = [boundPaint];
            } else if (property === 'strokes') {
              const strokes = container.strokes && container.strokes.length > 0
                ? container.strokes
                : [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, visible: true }];
              const boundPaint = figma.variables.setBoundVariableForPaint(strokes[0], 'color', variable);
              boundPaint.visible = true;
              container.strokes = [boundPaint];
            } else {
              container.setBoundVariable(property, variable);
            }
          }
        } catch (err) {
          console.warn(\`Failed to bind \${property}: \${err.message}\`);
        }
      }
    }

    return {
      containerId: container.id,
      containerName: container.name,
      wrappedNodeIds: nodesToWrap.map(n => n.id),
      wrappedNodeNames: nodesToWrap.map(n => n.name),
      success: true
    };
  `);

  sendProgress({ status: `Container "${containerSpec.name}" created successfully with ${nodeIds.length} wrapped node(s)` });

  return result.result;
}

/**
 * Tool 7: modify_node
 * Modify properties of an existing node
 */
async function modifyNode(api, args, sendProgress) {
  const { nodeId, properties } = args;

  if (!nodeId || !properties) {
    throw {
      code: -32602,
      message: 'Missing required parameters: nodeId and properties'
    };
  }

  sendProgress({ status: `Modifying node ${nodeId}...` });

  // Normalize fills in properties (extract alpha from color.a to paint.opacity)
  const normalizedProperties = { ...properties };
  if (normalizedProperties.fills) {
    normalizedProperties.fills = normalizePaints(normalizedProperties.fills);
  }
  if (normalizedProperties.strokes) {
    normalizedProperties.strokes = normalizePaints(normalizedProperties.strokes);
  }

  const result = await api.executeInFigma(`
    const node = figma.getNodeById("${nodeId}");
    if (!node) {
      throw new Error("Node not found: ${nodeId}");
    }

    const properties = ${JSON.stringify(normalizedProperties)};
    const modified = {};

    // Helper function to validate gradient paint
    const validateGradient = (paint, paintType) => {
      if (!paint.type || !paint.type.includes('GRADIENT')) return;

      // Validate gradientStops
      if (!paint.gradientStops || !Array.isArray(paint.gradientStops)) {
        throw new Error(\`Gradient \${paintType} require gradientStops array\`);
      }

      for (const stop of paint.gradientStops) {
        if (!stop.color || typeof stop.position !== 'number') {
          throw new Error(\`Each gradient stop must have color and position\`);
        }
        if (stop.position < 0 || stop.position > 1) {
          throw new Error(\`Gradient stop position must be between 0 and 1\`);
        }
      }

      // Validate gradientHandlePositions OR gradientTransform
      // Figma API accepts either format
      const hasHandlePositions = paint.gradientHandlePositions && Array.isArray(paint.gradientHandlePositions);
      const hasTransform = paint.gradientTransform && Array.isArray(paint.gradientTransform);

      if (!hasHandlePositions && !hasTransform) {
        throw new Error(\`Gradient \${paintType} require either gradientHandlePositions or gradientTransform\`);
      }

      // If using gradientHandlePositions, validate it has 3 positions
      if (hasHandlePositions && paint.gradientHandlePositions.length !== 3) {
        throw new Error(\`gradientHandlePositions must have exactly 3 positions\`);
      }

      // If using gradientTransform, validate it's a 2x3 matrix
      if (hasTransform) {
        if (paint.gradientTransform.length !== 2 ||
            paint.gradientTransform[0].length !== 3 ||
            paint.gradientTransform[1].length !== 3) {
          throw new Error(\`gradientTransform must be a 2x3 matrix: [[a, b, c], [d, e, f]]\`);
        }
      }
    };

    // Validate gradient fills if present
    if (properties.fills) {
      for (const fill of properties.fills) {
        validateGradient(fill, 'fills');
      }
    }

    // Validate gradient strokes if present
    if (properties.strokes) {
      for (const stroke of properties.strokes) {
        validateGradient(stroke, 'strokes');
      }
    }

    // Handle width and height separately (requires resize for non-auto-layout nodes)
    if (properties.width !== undefined || properties.height !== undefined) {
      const newWidth = properties.width !== undefined ? properties.width : node.width;
      const newHeight = properties.height !== undefined ? properties.height : node.height;

      try {
        node.resize(newWidth, newHeight);
        if (properties.width !== undefined) modified.width = newWidth;
        if (properties.height !== undefined) modified.height = newHeight;
      } catch (error) {
        console.warn(\`Failed to resize: \${error.message}\`);
      }
    }

    // Apply each property
    for (const [key, value] of Object.entries(properties)) {
      // Skip width and height (already handled above)
      if (key === 'width' || key === 'height') continue;

      try {
        if (key === 'padding') {
          // Set all padding sides
          node.paddingLeft = value;
          node.paddingRight = value;
          node.paddingTop = value;
          node.paddingBottom = value;
          modified.padding = value;
        } else {
          node[key] = value;
          modified[key] = value;
        }
      } catch (error) {
        console.warn(\`Failed to set \${key}: \${error.message}\`);
      }
    }

    return {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      modified: modified,
      success: true
    };
  `);

  sendProgress({ status: `Successfully modified ${Object.keys(properties).length} properties` });

  return result.result;
}

/**
 * Modify multiple nodes in a single operation
 * Batch workflow tool for efficient bulk node modifications
 */
async function batchModifyNodes(api, args, sendProgress) {
  const { modifications } = args;

  if (!modifications || !Array.isArray(modifications) || modifications.length === 0) {
    throw {
      code: -32602,
      message: 'Missing required parameter: modifications array'
    };
  }

  // Validate each modification has nodeId and properties
  for (let i = 0; i < modifications.length; i++) {
    const mod = modifications[i];
    if (!mod.nodeId || !mod.properties) {
      throw {
        code: -32602,
        message: `Modification at index ${i} missing required fields: nodeId, properties`
      };
    }
  }

  sendProgress({ status: `Modifying ${modifications.length} nodes...` });

  const result = await api.executeInFigma(`
    const modifications = ${JSON.stringify(modifications)};

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const mod of modifications) {
      try {
        const node = figma.getNodeById(mod.nodeId);
        if (!node) {
          results.push({
            nodeId: mod.nodeId,
            success: false,
            error: "Node not found"
          });
          errorCount++;
          continue;
        }

        const properties = mod.properties;
        const modified = {};

        // Apply each property (reuse modify_node logic)
        if (properties.fills !== undefined) {
          node.fills = properties.fills;
          modified.fills = true;
        }

        if (properties.strokes !== undefined) {
          node.strokes = properties.strokes;
          modified.strokes = true;
        }

        if (properties.opacity !== undefined) {
          node.opacity = properties.opacity;
          modified.opacity = true;
        }

        if (properties.visible !== undefined) {
          node.visible = properties.visible;
          modified.visible = true;
        }

        if (properties.locked !== undefined) {
          node.locked = properties.locked;
          modified.locked = true;
        }

        if (properties.cornerRadius !== undefined) {
          if ('cornerRadius' in node) {
            node.cornerRadius = properties.cornerRadius;
            modified.cornerRadius = true;
          }
        }

        if (properties.layoutMode !== undefined) {
          if ('layoutMode' in node) {
            node.layoutMode = properties.layoutMode;
            modified.layoutMode = true;
          }
        }

        if (properties.itemSpacing !== undefined) {
          if ('itemSpacing' in node) {
            node.itemSpacing = properties.itemSpacing;
            modified.itemSpacing = true;
          }
        }

        // Padding properties
        if (properties.paddingLeft !== undefined && 'paddingLeft' in node) {
          node.paddingLeft = properties.paddingLeft;
          modified.paddingLeft = true;
        }
        if (properties.paddingRight !== undefined && 'paddingRight' in node) {
          node.paddingRight = properties.paddingRight;
          modified.paddingRight = true;
        }
        if (properties.paddingTop !== undefined && 'paddingTop' in node) {
          node.paddingTop = properties.paddingTop;
          modified.paddingTop = true;
        }
        if (properties.paddingBottom !== undefined && 'paddingBottom' in node) {
          node.paddingBottom = properties.paddingBottom;
          modified.paddingBottom = true;
        }

        results.push({
          nodeId: mod.nodeId,
          nodeName: node.name,
          nodeType: node.type,
          modified: modified,
          success: true
        });
        successCount++;
      } catch (err) {
        results.push({
          nodeId: mod.nodeId,
          success: false,
          error: err.message
        });
        errorCount++;
      }
    }

    return {
      success: true,
      totalModifications: modifications.length,
      successCount: successCount,
      errorCount: errorCount,
      results: results
    };
  `);

  const resultData = result.result;
  sendProgress({
    status: `Modified ${resultData.successCount} of ${resultData.totalModifications} nodes (${resultData.errorCount} errors)`
  });

  return resultData;
}

/**
 * Tool 8: add_component_property
 * Add a TEXT, BOOLEAN, or INSTANCE_SWAP property to a component
 */
async function addComponentProperty(api, args, sendProgress) {
  const { componentId, propertyName, propertyType, defaultValue } = args;

  if (!componentId || !propertyName || !propertyType || defaultValue === undefined) {
    throw {
      code: -32602,
      message: 'Missing required parameters: componentId, propertyName, propertyType, defaultValue'
    };
  }

  sendProgress({ status: `Adding ${propertyType} property "${propertyName}" to component...` });

  const result = await api.executeInFigma(`
    const component = figma.getNodeById("${componentId}");
    if (!component) {
      throw new Error("Component not found: ${componentId}");
    }

    if (component.type !== "COMPONENT" && component.type !== "COMPONENT_SET") {
      throw new Error("Node is not a component or component set: " + component.type);
    }

    // Add the component property
    const propertyKey = component.addComponentProperty(
      "${propertyName}",
      "${propertyType}",
      ${JSON.stringify(defaultValue)}
    );

    return {
      propertyKey: propertyKey,
      propertyName: "${propertyName}",
      propertyType: "${propertyType}",
      componentId: component.id,
      componentName: component.name,
      success: true
    };
  `);

  sendProgress({ status: `Property added successfully: ${result.result.propertyKey}` });

  return result.result;
}

/**
 * Tool: edit_component_property
 * Edit an existing component property definition (name, default value, or preferred values)
 * Supports BOOLEAN, TEXT, INSTANCE_SWAP, and VARIANT property types
 */
async function editComponentProperty(api, args, sendProgress) {
  const { componentId, propertyName, newDefinition } = args;

  if (!componentId || !propertyName || !newDefinition) {
    throw {
      code: -32602,
      message: 'Missing required parameters: componentId, propertyName, newDefinition'
    };
  }

  sendProgress({ status: `Editing property "${propertyName}" on component ${componentId}...` });

  const result = await api.executeInFigma(`
    const component = figma.getNodeById("${componentId}");
    if (!component) {
      throw new Error("Component not found: ${componentId}");
    }

    if (component.type !== "COMPONENT" && component.type !== "COMPONENT_SET") {
      throw new Error("Node is not a component or component set: " + component.type);
    }

    // Find the full property key (includes unique ID suffix)
    const propDefs = component.componentPropertyDefinitions || {};
    const propertyKey = Object.keys(propDefs).find(key =>
      key === "${propertyName}" || key.startsWith("${propertyName}#")
    );

    if (!propertyKey) {
      throw new Error("Property '${propertyName}' not found on component");
    }

    // Edit the property
    const newPropertyKey = component.editComponentProperty(
      propertyKey,
      ${JSON.stringify(newDefinition)}
    );

    // Get updated property definition
    const updatedDef = component.componentPropertyDefinitions[newPropertyKey];

    return {
      success: true,
      componentId: component.id,
      componentName: component.name,
      componentType: component.type,
      oldPropertyName: "${propertyName}",
      newPropertyKey: newPropertyKey,
      updatedDefinition: {
        type: updatedDef.type,
        defaultValue: updatedDef.defaultValue,
        preferredValues: updatedDef.preferredValues,
        variantOptions: updatedDef.variantOptions
      }
    };
  `);

  sendProgress({ status: `Property edited successfully: ${result.result.newPropertyKey}` });

  return result.result;
}

/**
 * Tool: delete_component_property
 * Delete a component property definition from a component or component set
 */
async function deleteComponentProperty(api, args, sendProgress) {
  const { componentId, propertyName } = args;

  if (!componentId || !propertyName) {
    throw {
      code: -32602,
      message: 'Missing required parameters: componentId, propertyName'
    };
  }

  sendProgress({ status: `Deleting property "${propertyName}" from component ${componentId}...` });

  const result = await api.executeInFigma(`
    const component = figma.getNodeById("${componentId}");
    if (!component) {
      throw new Error("Component not found: ${componentId}");
    }

    if (component.type !== "COMPONENT" && component.type !== "COMPONENT_SET") {
      throw new Error("Node is not a component or component set: " + component.type);
    }

    // Store property info before deletion
    const propDefs = component.componentPropertyDefinitions || {};
    const propertyKey = Object.keys(propDefs).find(key =>
      key === "${propertyName}" || key.startsWith("${propertyName}#")
    );

    if (!propertyKey) {
      throw new Error("Property '${propertyName}' not found on component");
    }

    const deletedPropDef = propDefs[propertyKey];

    // Delete the property
    component.deleteComponentProperty(propertyKey);

    return {
      success: true,
      deleted: true,
      componentId: component.id,
      componentName: component.name,
      componentType: component.type,
      deletedPropertyKey: propertyKey,
      deletedPropertyDefinition: {
        type: deletedPropDef.type,
        defaultValue: deletedPropDef.defaultValue,
        preferredValues: deletedPropDef.preferredValues,
        variantOptions: deletedPropDef.variantOptions
      },
      remainingProperties: Object.keys(component.componentPropertyDefinitions || {}).length
    };
  `);

  sendProgress({ status: `Property deleted successfully: ${result.result.deletedPropertyKey}` });

  return result.result;
}

/**
 * Tool 9: bind_text_to_property
 * Bind a text node's characters to a component property
 */
async function bindTextToProperty(api, args, sendProgress) {
  const { textNodeId, propertyKey } = args;

  if (!textNodeId || !propertyKey) {
    throw {
      code: -32602,
      message: 'Missing required parameters: textNodeId, propertyKey'
    };
  }

  sendProgress({ status: `Binding text node to property "${propertyKey}"...` });

  const result = await api.executeInFigma(`
    const textNode = figma.getNodeById("${textNodeId}");
    if (!textNode) {
      throw new Error("Text node not found: ${textNodeId}");
    }

    if (textNode.type !== "TEXT") {
      throw new Error("Node is not a text node: " + textNode.type);
    }

    // Bind the text characters to the component property
    textNode.componentPropertyReferences = {
      characters: "${propertyKey}"
    };

    return {
      textNodeId: textNode.id,
      textNodeName: textNode.name,
      propertyKey: "${propertyKey}",
      success: true
    };
  `);

  sendProgress({ status: 'Text node bound to property successfully' });

  return result.result;
}

/**
 * Tool 10: set_text_truncation
 * Configure text truncation with ellipsis and max lines
 */
async function setTextTruncation(api, args, sendProgress) {
  const { textNodeId, truncation, maxLines, autoResize } = args;

  if (!textNodeId || !truncation) {
    throw {
      code: -32602,
      message: 'Missing required parameters: textNodeId, truncation'
    };
  }

  sendProgress({ status: `Setting text truncation to ${truncation}...` });

  const result = await api.executeInFigma(`
    const textNode = figma.getNodeById("${textNodeId}");
    if (!textNode) {
      throw new Error("Text node not found: ${textNodeId}");
    }

    if (textNode.type !== "TEXT") {
      throw new Error("Node is not a text node: " + textNode.type);
    }

    // Set truncation mode
    textNode.textTruncation = "${truncation}";

    // Set max lines if provided
    ${maxLines ? `textNode.maxLines = ${maxLines};` : ''}

    // Set auto resize mode if provided
    ${autoResize ? `textNode.textAutoResize = "${autoResize}";` : ''}

    return {
      textNodeId: textNode.id,
      textNodeName: textNode.name,
      textTruncation: textNode.textTruncation,
      maxLines: textNode.maxLines,
      textAutoResize: textNode.textAutoResize,
      success: true
    };
  `);

  sendProgress({ status: 'Text truncation configured successfully' });

  return result.result;
}

/**
 * Tool 11: set_instance_properties
 * Update component property values on an instance
 */
async function setInstanceProperties(api, args, sendProgress) {
  const { instanceId, properties } = args;

  if (!instanceId || !properties) {
    throw {
      code: -32602,
      message: 'Missing required parameters: instanceId, properties'
    };
  }

  sendProgress({ status: `Updating ${Object.keys(properties).length} properties on instance...` });

  const result = await api.executeInFigma(`
    const instance = figma.getNodeById("${instanceId}");
    if (!instance) {
      throw new Error("Instance not found: ${instanceId}");
    }

    if (instance.type !== "INSTANCE") {
      throw new Error("Node is not an instance: " + instance.type);
    }

    // Update the instance properties
    const properties = ${JSON.stringify(properties)};
    instance.setProperties(properties);

    return {
      instanceId: instance.id,
      instanceName: instance.name,
      propertiesSet: Object.keys(properties),
      success: true
    };
  `);

  sendProgress({ status: 'Instance properties updated successfully' });

  return result.result;
}

/**
 * Tool: swap_component
 * Swap a nested component instance inside a parent instance
 */
async function swapComponent(api, args, sendProgress) {
  const { instanceId, childPath, newComponentId } = args;

  sendProgress({ status: `Swapping component in instance ${instanceId}...` });

  const result = await api.executeInFigma(`
    const instance = figma.getNodeById("${instanceId}");
    if (!instance) {
      throw new Error("Instance not found");
    }

    const newComponent = figma.getNodeById("${newComponentId}");
    if (!newComponent || newComponent.type !== "COMPONENT") {
      throw new Error("New component not found");
    }

    // Navigate to the child instance using the path
    const pathParts = ${JSON.stringify(childPath)};
    let targetNode = instance;

    for (const part of pathParts) {
      targetNode = targetNode.children.find(c => c.name === part);
      if (!targetNode) {
        throw new Error("Child path not found: " + part);
      }
    }

    // Find the instance to swap (should be the final node or an instance child)
    let instanceToSwap = targetNode.type === "INSTANCE" ? targetNode : targetNode.children.find(c => c.type === "INSTANCE");

    if (!instanceToSwap) {
      throw new Error("No instance found to swap");
    }

    // Perform the swap
    instanceToSwap.swapComponent(newComponent);

    return {
      instanceId: "${instanceId}",
      swappedNode: instanceToSwap.name,
      newComponent: newComponent.name,
      success: true
    };
  `);

  return result.result;
}

/**
 * Tool: get_component_properties
 * Get all component property definitions for a component
 */
async function getComponentProperties(api, args, sendProgress) {
  const { componentId } = args;

  sendProgress({ status: `Getting component properties for ${componentId}...` });

  const result = await api.executeInFigma(`
    const component = figma.getNodeById("${componentId}");
    if (!component || (component.type !== "COMPONENT" && component.type !== "COMPONENT_SET")) {
      throw new Error("Node is not a component");
    }

    const properties = Object.entries(component.componentPropertyDefinitions || {}).map(([key, prop]) => ({
      key: key,
      name: prop.name || key,
      type: prop.type,
      defaultValue: prop.defaultValue,
      preferredValues: prop.preferredValues || null
    }));

    return {
      componentId: component.id,
      componentName: component.name,
      properties: properties,
      totalProperties: properties.length
    };
  `);

  return result.result;
}

/**
 * Tool: get_instance_properties
 * Get all available properties on a component instance including exposed nested instances
 */
async function getInstanceProperties(api, args, sendProgress) {
  const { instanceId } = args;

  sendProgress({ status: `Getting instance properties for ${instanceId}...` });

  const result = await api.executeInFigma(`
    const instance = figma.getNodeById("${instanceId}");
    if (!instance || instance.type !== "INSTANCE") {
      throw new Error("Node is not an instance");
    }

    const properties = Object.entries(instance.componentProperties || {}).map(([key, value]) => ({
      key: key,
      value: value
    }));

    // Check for exposed instances
    const exposedInstances = instance.exposedInstances?.map(exp => {
      const expProperties = Object.entries(exp.componentProperties || {}).map(([key, value]) => ({
        key: key,
        value: value
      }));
      return {
        id: exp.id,
        name: exp.name,
        properties: expProperties
      };
    }) || [];

    return {
      instanceId: instance.id,
      instanceName: instance.name,
      properties: properties,
      totalProperties: properties.length,
      exposedInstances: exposedInstances
    };
  `);

  return result.result;
}

/**
 * Tool: create_component_variants
 * Create component variants by duplicating a component, modifying each variant, and combining them
 */
async function createComponentVariants(api, args, sendProgress) {
  const { componentId, variants } = args;

  sendProgress({ status: `Creating component variants for ${componentId}...` });

  const result = await api.executeInFigma(`
    const originalComponent = figma.getNodeById("${componentId}");
    if (!originalComponent || originalComponent.type !== "COMPONENT") {
      throw new Error("Original component not found or is not a component");
    }

    const variantSpecs = ${JSON.stringify(variants)};

    // Load all fonts that will be needed
    const fontsToLoad = [];
    for (const spec of variantSpecs) {
      if (spec.modifications && spec.modifications.textNodes) {
        for (const textMod of spec.modifications.textNodes) {
          if (textMod.fontName) {
            fontsToLoad.push(textMod.fontName);
          }
        }
      }
    }

    // Load unique fonts
    const uniqueFonts = Array.from(new Set(fontsToLoad.map(f => JSON.stringify(f)))).map(f => JSON.parse(f));
    for (const font of uniqueFonts) {
      await figma.loadFontAsync(font);
    }

    // Store original name and position BEFORE renaming
    const originalName = originalComponent.name;
    const originalX = originalComponent.x;
    const originalY = originalComponent.y;

    // Create variant components
    const variantComponents = [];

    for (let i = 0; i < variantSpecs.length; i++) {
      const spec = variantSpecs[i];

      // For the first variant, use the original component (preserves existing instances)
      // For subsequent variants, clone the original
      const variantComponent = i === 0 ? originalComponent : originalComponent.clone();
      variantComponent.name = spec.name;

      // Position cloned components to the right
      if (i > 0) {
        variantComponent.x = originalComponent.x + (i * 400);
      }

      // Apply modifications if specified
      if (spec.modifications) {
        const mods = spec.modifications;

        // Modify nodes by path
        if (mods.nodes) {
          for (const nodeMod of mods.nodes) {
            let targetNode = variantComponent;

            // Navigate to the target node using path
            for (const pathSegment of nodeMod.path) {
              targetNode = targetNode.children.find(child => child.name === pathSegment);
              if (!targetNode) break;
            }

            if (targetNode) {
              // Apply opacity
              if (nodeMod.opacity !== undefined) {
                targetNode.opacity = nodeMod.opacity;
              }

              // Swap component (for nested instances)
              if (nodeMod.swapComponentId) {
                const newComponent = figma.getNodeById(nodeMod.swapComponentId);
                const instanceToSwap = targetNode.children.find(child => child.type === "INSTANCE");
                if (instanceToSwap && newComponent) {
                  instanceToSwap.swapComponent(newComponent);
                }
              }
            }
          }
        }

        // Modify text nodes
        if (mods.textNodes) {
          for (const textMod of mods.textNodes) {
            let targetNode = variantComponent;

            // Navigate to the text node using path
            for (const pathSegment of textMod.path) {
              targetNode = targetNode.children.find(child => child.name === pathSegment);
              if (!targetNode) break;
            }

            if (targetNode && targetNode.type === "TEXT") {
              // Change font
              if (textMod.fontName) {
                targetNode.fontName = textMod.fontName;
              }

              // Bind variable to fill color
              if (textMod.fillVariableName) {
                const variable = figma.variables.getLocalVariables().find(v => v.name === textMod.fillVariableName);
                if (variable && targetNode.fills && targetNode.fills.length > 0) {
                  const boundPaint = figma.variables.setBoundVariableForPaint(targetNode.fills[0], "color", variable);
                  targetNode.fills = [boundPaint];
                }
              }
            }
          }
        }
      }

      variantComponents.push(variantComponent);
    }

    // Combine as variants
    const variantSet = figma.combineAsVariants(variantComponents, originalComponent.parent);
    variantSet.name = originalName;
    variantSet.x = originalX;
    variantSet.y = originalY;

    return {
      variantSetId: variantSet.id,
      variantSetName: variantSet.name,
      variants: variantComponents.map(v => ({ id: v.id, name: v.name })),
      totalVariants: variantComponents.length
    };
  `);

  sendProgress({ status: `Successfully created ${result.result.totalVariants} variants` });

  return result.result;
}

/**
 * Tool: rename_node
 * Rename any Figma node (component, frame, instance, etc.)
 */
async function renameNode(api, args, sendProgress) {
  const { nodeId, name } = args;

  sendProgress({ status: `Renaming node ${nodeId} to "${name}"...` });

  const result = await api.executeInFigma(`
    const node = figma.getNodeById("${nodeId}");
    if (!node) {
      throw new Error("Node not found");
    }

    const oldName = node.name;
    node.name = "${name.replace(/"/g, '\\"')}";

    return {
      nodeId: node.id,
      oldName: oldName,
      newName: node.name,
      nodeType: node.type
    };
  `);

  sendProgress({ status: `Successfully renamed to "${result.result.newName}"` });

  return result.result;
}

/**
 * Tool: create_variable
 * Create a new variable in a collection
 */
async function createVariable(api, args, sendProgress) {
  const { collectionName, variableName, variableType, value, modeValues } = args;

  sendProgress({ status: `Creating variable "${variableName}" in collection "${collectionName}"...` });

  const result = await api.executeInFigma(`
    // Find or create the collection
    const collections = figma.variables.getLocalVariableCollections();
    let collection = collections.find(c => c.name === "${collectionName}");

    if (!collection) {
      collection = figma.variables.createVariableCollection("${collectionName}");
    }

    // Create the variable
    const variable = figma.variables.createVariable("${variableName}", collection.id, "${variableType}");

    // Set values for each mode
    const modeValues = ${JSON.stringify(modeValues || {})};
    const singleValue = ${JSON.stringify(value)};

    if (Object.keys(modeValues).length > 0) {
      // Multi-mode variable (e.g., Tokens with Light/Dark)
      for (const [modeName, val] of Object.entries(modeValues)) {
        const mode = collection.modes.find(m => m.name === modeName);
        if (mode) {
          if (val.alias) {
            // Set alias to another variable
            const targetVar = figma.variables.getLocalVariables().find(v => v.name === val.alias);
            if (targetVar) {
              variable.setValueForMode(mode.modeId, { type: 'VARIABLE_ALIAS', id: targetVar.id });
            }
          } else {
            variable.setValueForMode(mode.modeId, val);
          }
        }
      }
    } else if (singleValue !== null && singleValue !== undefined) {
      // Single-mode variable (e.g., Primitives)
      const defaultMode = collection.modes[0];
      variable.setValueForMode(defaultMode.modeId, singleValue);
    }

    return {
      variableId: variable.id,
      variableName: variable.name,
      collectionName: collection.name,
      type: variable.resolvedType
    };
  `);

  sendProgress({ status: `Successfully created variable "${variableName}"` });

  return result.result;
}

/**
 * Delete a text style by name or ID
 * @param {Object} api - API instance
 * @param {Object} args - Arguments
 * @param {string} [args.styleId] - Text style ID to delete
 * @param {string} [args.name] - Text style name to delete (if multiple exist, deletes all matches)
 * @param {Function} sendProgress - Progress callback
 */
async function deleteTextStyle(api, args, sendProgress) {
  const { styleId, name } = args;

  if (!styleId && !name) {
    throw new Error('Either styleId or name must be provided');
  }

  sendProgress({ status: `Deleting text style ${styleId ? `ID: ${styleId}` : `name: "${name}"`}...` });

  const result = await api.executeInFigma(`
    let deleted = 0;
    let styles = [];

    ${styleId ? `
      // Delete by ID
      const style = figma.getStyleById("${styleId}");
      if (style && style.type === 'TEXT') {
        styles.push({ id: style.id, name: style.name });
        style.remove();
        deleted = 1;
      }
    ` : `
      // Delete by name (all matching)
      const allStyles = figma.getLocalTextStyles();
      const matchingStyles = allStyles.filter(s => s.name === "${name}");

      for (const style of matchingStyles) {
        styles.push({ id: style.id, name: style.name, fontSize: style.fontSize, fontFamily: style.fontName.family });
        style.remove();
        deleted++;
      }
    `}

    return {
      deleted,
      styles
    };
  `);

  const { deleted, styles } = result.result;

  if (deleted === 0) {
    sendProgress({ status: `No text style found to delete` });
  } else {
    sendProgress({ status: `Successfully deleted ${deleted} text style(s)` });
  }

  return result.result;
}

/**
 * Delete a node from the Figma canvas
 * @param {Object} api - API instance
 * @param {Object} args - Arguments
 * @param {string} args.nodeId - Node ID to delete
 * @param {Function} sendProgress - Progress callback
 */
async function deleteNode(api, args, sendProgress) {
  const { nodeId } = args;

  if (!nodeId) {
    throw new Error('nodeId is required');
  }

  sendProgress({ status: `Deleting node ${nodeId}...` });

  const result = await api.executeInFigma(`
    const node = figma.getNodeById("${nodeId}");

    if (!node) {
      throw new Error(\`Node with ID "${nodeId}" not found\`);
    }

    // Store node info before deletion
    const nodeInfo = {
      id: node.id,
      name: node.name,
      type: node.type
    };

    // Attempt to remove the node
    try {
      node.remove();
    } catch (error) {
      throw new Error(\`Failed to delete node: \${error.message}. Note: Cannot delete children of instance nodes.\`);
    }

    return {
      deleted: true,
      nodeInfo
    };
  `);

  const { nodeInfo } = result.result;

  sendProgress({ status: `Successfully deleted ${nodeInfo.type} node "${nodeInfo.name}" (ID: ${nodeInfo.id})` });

  return result.result;
}

/**
 * Tool: add_variant_to_component_set
 * Add a new variant to an existing ComponentSet by cloning and modifying
 */
async function addVariantToComponentSet(api, args, sendProgress) {
  const { componentSetId, sourceVariantId, variantName, position = {}, modifications = {} } = args;

  if (!componentSetId || !sourceVariantId || !variantName) {
    throw {
      code: -32602,
      message: 'Missing required parameters: componentSetId, sourceVariantId, and variantName'
    };
  }

  sendProgress({ status: `Adding variant "${variantName}" to ComponentSet ${componentSetId}...` });

  const result = await api.executeInFigma(`
    const componentSet = figma.getNodeById("${componentSetId}");
    if (!componentSet || componentSet.type !== "COMPONENT_SET") {
      throw new Error("ComponentSet not found or invalid type");
    }

    const sourceVariant = figma.getNodeById("${sourceVariantId}");
    if (!sourceVariant || sourceVariant.type !== "COMPONENT") {
      throw new Error("Source variant not found or is not a component");
    }

    // Clone the source variant
    const newVariant = sourceVariant.clone();
    newVariant.name = "${variantName}";

    // Position the clone
    const posX = ${position.x !== undefined ? position.x : 400};
    const posY = ${position.y !== undefined ? position.y : 0};
    newVariant.x = sourceVariant.x + posX;
    newVariant.y = sourceVariant.y + posY;

    // Apply modifications if provided
    const modifications = ${JSON.stringify(modifications)};

    // Load fonts for text modifications
    if (modifications.textNodes) {
      for (const textMod of modifications.textNodes) {
        if (textMod.fontName) {
          await figma.loadFontAsync(textMod.fontName);
        }
      }
    }

    // Apply text node modifications
    if (modifications.textNodes) {
      for (const textMod of modifications.textNodes) {
        let targetNode = newVariant;

        // Navigate to target node using path
        for (const pathSegment of textMod.path) {
          targetNode = targetNode.findOne(child => child.name === pathSegment);
          if (!targetNode) break;
        }

        if (targetNode && targetNode.type === "TEXT") {
          // Load current font if not already loaded
          await figma.loadFontAsync(targetNode.fontName);

          // Change characters
          if (textMod.characters !== undefined) {
            targetNode.characters = textMod.characters;
          }

          // Change font
          if (textMod.fontName) {
            targetNode.fontName = textMod.fontName;
          }
        }
      }
    }

    // Apply general node modifications
    if (modifications.nodes) {
      for (const nodeMod of modifications.nodes) {
        let targetNode = newVariant;

        // Navigate to target node using path
        for (const pathSegment of nodeMod.path) {
          targetNode = targetNode.findOne(child => child.name === pathSegment);
          if (!targetNode) break;
        }

        if (targetNode) {
          if (nodeMod.opacity !== undefined) {
            targetNode.opacity = nodeMod.opacity;
          }
          if (nodeMod.visible !== undefined) {
            targetNode.visible = nodeMod.visible;
          }
        }
      }
    }

    // Add to ComponentSet
    componentSet.appendChild(newVariant);

    return {
      success: true,
      componentSetId: componentSet.id,
      componentSetName: componentSet.name,
      newVariantId: newVariant.id,
      newVariantName: newVariant.name,
      totalVariants: componentSet.children.length
    };
  `);

  sendProgress({ status: `Successfully added variant "${variantName}" (total: ${result.result.totalVariants} variants)` });

  return result.result;
}

/**
 * Create a text style
 * @param {Object} api - API instance
 * @param {Object} args - Arguments
 * @param {string} args.name - Text style name
 * @param {string} args.fontFamily - Font family (e.g., "DM Sans")
 * @param {string} args.fontStyle - Font style (e.g., "Regular", "Medium", "SemiBold", "Bold")
 * @param {number} args.fontSize - Font size in pixels
 * @param {Object} [args.lineHeight] - Line height config { unit: "AUTO" | "PIXELS" | "PERCENT", value?: number }
 * @param {Object} [args.letterSpacing] - Letter spacing config { unit: "PIXELS" | "PERCENT", value: number }
 * @param {Function} sendProgress - Progress callback
 */
async function createTextStyle(api, args, sendProgress) {
  const { name, fontFamily, fontStyle, fontSize, lineHeight, letterSpacing } = args;

  sendProgress({ status: `Creating text style "${name}"...` });

  // Generate font loading code with normalization
  const fontLoadingCode = generateFontLoadingCode(fontFamily, fontStyle);

  const result = await api.executeInFigma(`
    // Load the font with normalization (tries multiple style variations)
    ${fontLoadingCode}

    const textStyle = figma.createTextStyle();
    textStyle.name = "${name}";
    textStyle.fontName = loadedFont;
    textStyle.fontSize = ${fontSize};

    ${lineHeight ? `
    const lineHeight = ${JSON.stringify(lineHeight)};
    if (lineHeight.unit === "AUTO") {
      textStyle.lineHeight = { unit: "AUTO" };
    } else if (lineHeight.unit === "PIXELS") {
      textStyle.lineHeight = { unit: "PIXELS", value: ${lineHeight.value} };
    } else if (lineHeight.unit === "PERCENT") {
      textStyle.lineHeight = { unit: "PERCENT", value: ${lineHeight.value} };
    }
    ` : ''}

    ${letterSpacing ? `
    textStyle.letterSpacing = ${JSON.stringify(letterSpacing)};
    ` : ''}

    return {
      id: textStyle.id,
      name: textStyle.name,
      fontName: textStyle.fontName,
      fontSize: textStyle.fontSize,
      lineHeight: textStyle.lineHeight
    };
  `);

  sendProgress({ status: `Successfully created text style "${name}"` });

  return result.result;
}

/**
 * Tool: bind_property_reference
 * Bind a node property to a component property
 */
async function bindPropertyReference(api, args, sendProgress) {
  const { nodeId, nodeProperty, componentPropertyKey } = args;

  if (!nodeId || !nodeProperty || !componentPropertyKey) {
    throw {
      code: -32602,
      message: 'Missing required parameters: nodeId, nodeProperty, and componentPropertyKey'
    };
  }

  sendProgress({ status: `Binding ${nodeProperty} of node ${nodeId} to property ${componentPropertyKey}...` });

  const result = await api.executeInFigma(`
    const node = figma.getNodeById("${nodeId}");
    if (!node) {
      throw new Error("Node not found: ${nodeId}");
    }

    // Get existing references or create new object
    const existingRefs = node.componentPropertyReferences || {};

    // Set component property reference by replacing the entire object
    node.componentPropertyReferences = {
      ...existingRefs,
      "${nodeProperty}": "${componentPropertyKey}"
    };

    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      nodeProperty: "${nodeProperty}",
      componentPropertyKey: "${componentPropertyKey}",
      allReferences: node.componentPropertyReferences
    };
  `);

  sendProgress({ status: `Successfully bound ${nodeProperty} to ${componentPropertyKey}` });

  return result.result;
}

/**
 * Tool: import_image_from_url
 * Import an image from a URL into Figma
 */
async function importImageFromUrl(api, args, sendProgress) {
  const { url, name } = args;

  if (!url || !name) {
    throw {
      code: -32602,
      message: 'Missing required parameters: url and name'
    };
  }

  sendProgress({ status: `Importing image "${name}" from ${url}...` });

  const result = await api.executeInFigma(`
    const imageUrl = "${url}";
    const imageName = "${name}";

    try {
      // Import image from URL
      const image = await figma.createImageAsync(imageUrl);

      // Get image dimensions
      const { width, height } = await image.getSizeAsync();

      return {
        success: true,
        name: imageName,
        imageHash: image.hash,
        width: width,
        height: height,
        url: imageUrl
      };
    } catch (error) {
      throw new Error(\`Failed to import image from \${imageUrl}: \${error ? error.message || error.toString() : 'Unknown error'}\`);
    }
  `);

  sendProgress({ status: `Successfully imported "${name}" (${result.result.width}×${result.result.height}px)` });

  return result.result;
}

/**
 * Tool: create_image_component
 * Complete workflow: import image, create rectangle, set fill, convert to component
 */
async function createImageComponent(api, args, sendProgress) {
  const { url, componentName, width, height, maxWidth, maxHeight, scaleMode = 'FILL', cornerRadius = 0 } = args;

  if (!url || !componentName) {
    throw {
      code: -32602,
      message: 'Missing required parameters: url and componentName'
    };
  }

  sendProgress({ status: `Creating image component "${componentName}" from ${url}...` });

  const result = await api.executeInFigma(`
    const imageUrl = "${url}";
    const compName = "${componentName}";
    const specifiedWidth = ${width !== undefined ? width : 'null'};
    const specifiedHeight = ${height !== undefined ? height : 'null'};
    const maxW = ${maxWidth !== undefined ? maxWidth : 'null'};
    const maxH = ${maxHeight !== undefined ? maxHeight : 'null'};
    const scale = "${scaleMode}";
    const radius = ${cornerRadius};

    try {
      // Import image from URL
      const image = await figma.createImageAsync(imageUrl);

      // Get actual image dimensions
      const { width: imgWidth, height: imgHeight } = await image.getSizeAsync();

      // Calculate target dimensions
      let targetWidth = specifiedWidth || imgWidth;
      let targetHeight = specifiedHeight || imgHeight;

      // If only one dimension specified, calculate the other maintaining aspect ratio
      if (specifiedWidth && !specifiedHeight) {
        targetHeight = Math.round((imgHeight / imgWidth) * specifiedWidth);
      } else if (specifiedHeight && !specifiedWidth) {
        targetWidth = Math.round((imgWidth / imgHeight) * specifiedHeight);
      }

      // Apply max constraints if specified
      if (maxW && targetWidth > maxW) {
        const ratio = maxW / targetWidth;
        targetWidth = maxW;
        targetHeight = Math.round(targetHeight * ratio);
      }
      if (maxH && targetHeight > maxH) {
        const ratio = maxH / targetHeight;
        targetHeight = maxH;
        targetWidth = Math.round(targetWidth * ratio);
      }

      // Create component directly
      const component = figma.createComponent();
      component.name = compName;
      component.resize(targetWidth, targetHeight);

      // Set corner radius if specified
      if (radius > 0) {
        component.cornerRadius = radius;
      }

      // Set image fill
      component.fills = [{
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: scale
      }];

      // Position component at origin
      component.x = 0;
      component.y = 0;

      return {
        success: true,
        componentId: component.id,
        componentName: component.name,
        imageHash: image.hash,
        width: targetWidth,
        height: targetHeight
      };
    } catch (error) {
      throw new Error(\`Failed to create image component: \${error.message}\`);
    }
  `);

  sendProgress({ status: `Successfully created component "${componentName}" (${result.result.componentId})` });

  return result.result;
}

/**
 * Tool: batch_create_image_components
 * Batch create multiple image components and optionally combine into ComponentSet
 */
async function batchCreateImageComponents(api, args, sendProgress) {
  const {
    images,
    createComponentSet = false,
    variantProperty = 'Type',
    scaleMode = 'FILL',
    cornerRadius = 0
  } = args;

  if (!images || !Array.isArray(images) || images.length === 0) {
    throw {
      code: -32602,
      message: 'Missing or invalid images array'
    };
  }

  sendProgress({ status: `Batch creating ${images.length} image components...` });

  const result = await api.executeInFigma(`
    const imageSpecs = ${JSON.stringify(images)};
    const shouldCreateSet = ${createComponentSet};
    const variantProp = "${variantProperty}";
    const scale = "${scaleMode}";
    const radius = ${cornerRadius};

    const components = [];
    const spacing = 100; // Space between components

    try {
      // Create each component
      for (let i = 0; i < imageSpecs.length; i++) {
        const spec = imageSpecs[i];

        // Import image
        const image = await figma.createImageAsync(spec.url);

        // Get actual image dimensions
        const { width: imgWidth, height: imgHeight } = await image.getSizeAsync();

        // Calculate target dimensions with aspect ratio preservation
        let targetWidth = spec.width || imgWidth;
        let targetHeight = spec.height || imgHeight;

        // If only one dimension specified, calculate the other maintaining aspect ratio
        if (spec.width && !spec.height) {
          targetHeight = Math.round((imgHeight / imgWidth) * spec.width);
        } else if (spec.height && !spec.width) {
          targetWidth = Math.round((imgWidth / imgHeight) * spec.height);
        }

        // Apply max constraints if specified
        if (spec.maxWidth && targetWidth > spec.maxWidth) {
          const ratio = spec.maxWidth / targetWidth;
          targetWidth = spec.maxWidth;
          targetHeight = Math.round(targetHeight * ratio);
        }
        if (spec.maxHeight && targetHeight > spec.maxHeight) {
          const ratio = spec.maxHeight / targetHeight;
          targetHeight = spec.maxHeight;
          targetWidth = Math.round(targetWidth * ratio);
        }

        // Create component directly
        const component = figma.createComponent();
        component.name = spec.name;
        component.resize(targetWidth, targetHeight);

        // Set image fill
        component.fills = [{
          type: 'IMAGE',
          imageHash: image.hash,
          scaleMode: scale
        }];

        // Set corner radius if specified
        if (radius > 0) {
          component.cornerRadius = radius;
        }

        // Position components in a row
        component.x = i * spacing;
        component.y = 0;

        components.push({
          id: component.id,
          name: component.name,
          node: component
        });
      }

      let componentSetId = null;
      let componentSetName = null;

      // Combine into ComponentSet if requested
      if (shouldCreateSet && components.length > 0) {
        // Rename components with variant property pattern
        components.forEach(comp => {
          const variantValue = comp.name;
          comp.node.name = \`\${variantProp}=\${variantValue}\`;
        });

        // Combine into ComponentSet
        const componentSet = figma.combineAsVariants(
          components.map(c => c.node),
          figma.currentPage
        );

        // Set vertical layout with spacing
        componentSet.layoutMode = 'VERTICAL';
        componentSet.itemSpacing = 20;
        componentSet.counterAxisAlignItems = 'MIN';
        componentSet.primaryAxisAlignItems = 'MIN';

        componentSetId = componentSet.id;
        componentSetName = componentSet.name;
      }

      return {
        success: true,
        componentsCreated: components.length,
        componentIds: components.map(c => c.id),
        componentNames: components.map(c => c.name),
        componentSetId: componentSetId,
        componentSetName: componentSetName
      };
    } catch (error) {
      throw new Error(\`Failed to batch create components: \${error.message}\`);
    }
  `);

  const summary = createComponentSet
    ? `Created ${result.result.componentsCreated} components in ComponentSet "${result.result.componentSetName}"`
    : `Created ${result.result.componentsCreated} individual components`;

  sendProgress({ status: summary });

  return result.result;
}

/**
 * Clone any Figma node (component, frame, group, text, etc.)
 * Generic cloning tool that works with all SceneNode types
 */
async function cloneNode(api, args, sendProgress) {
  const {
    nodeId,
    newName,
    offsetX = 100,
    offsetY = 0
  } = args;

  if (!nodeId) {
    throw {
      code: -32602,
      message: 'Missing required parameter: nodeId'
    };
  }

  sendProgress({ status: `Cloning node ${nodeId}...` });

  const result = await api.executeInFigma(`
    const sourceNode = figma.getNodeById("${nodeId}");

    if (!sourceNode) {
      throw new Error("Node not found: ${nodeId}");
    }

    // Clone the node
    const clonedNode = sourceNode.clone();

    // Rename if specified
    ${newName ? `clonedNode.name = "${newName}";` : ''}

    // Position offset from original
    clonedNode.x = sourceNode.x + ${offsetX};
    clonedNode.y = sourceNode.y + ${offsetY};

    // Add to same parent as source
    if (sourceNode.parent && sourceNode.parent.type !== "PAGE") {
      sourceNode.parent.appendChild(clonedNode);
    } else {
      figma.currentPage.appendChild(clonedNode);
    }

    // Center in viewport
    figma.viewport.scrollAndZoomIntoView([clonedNode]);

    return {
      success: true,
      clonedNodeId: clonedNode.id,
      clonedNodeName: clonedNode.name,
      clonedNodeType: clonedNode.type,
      sourceNodeId: sourceNode.id,
      sourceNodeName: sourceNode.name,
      sourceNodeType: sourceNode.type,
      position: {
        x: clonedNode.x,
        y: clonedNode.y
      }
    };
  `);

  sendProgress({ status: `Cloned ${result.result.sourceNodeType} "${result.result.sourceNodeName}"` });

  return result.result;
}

/**
 * Reorder children within a parent node
 * Supports two modes:
 * 1. Full reorder - provide complete childOrder array
 * 2. Single move - provide nodeId + newIndex
 */
async function reorderChildren(api, args, sendProgress) {
  const { parentId, childOrder, nodeId, newIndex } = args;

  if (!parentId) {
    throw {
      code: -32602,
      message: 'Missing required parameter: parentId'
    };
  }

  // Validate: Must provide either childOrder OR (nodeId + newIndex)
  const hasChildOrder = childOrder && Array.isArray(childOrder);
  const hasSingleMove = nodeId && newIndex !== undefined;

  if (hasChildOrder && hasSingleMove) {
    throw {
      code: -32602,
      message: 'Provide either childOrder (full reorder) OR nodeId+newIndex (single move), not both'
    };
  }

  if (!hasChildOrder && !hasSingleMove) {
    throw {
      code: -32602,
      message: 'Must provide either childOrder array or nodeId+newIndex parameters'
    };
  }

  if (hasChildOrder) {
    // Full reorder approach
    sendProgress({ status: `Reordering ${childOrder.length} children of parent ${parentId}...` });

    const result = await api.executeInFigma(`
      const parent = figma.getNodeById("${parentId}");
      if (!parent) throw new Error("Parent node not found: ${parentId}");
      if (!parent.children) throw new Error("Node has no children: ${parentId}");

      const childOrder = ${JSON.stringify(childOrder)};
      const currentChildren = parent.children;

      // Validate all IDs are children of this parent
      for (const childId of childOrder) {
        if (!currentChildren.find(c => c.id === childId)) {
          throw new Error("Child " + childId + " is not a child of parent " + parent.id);
        }
      }

      // Reorder by removing and re-inserting at correct index
      for (let i = 0; i < childOrder.length; i++) {
        const child = figma.getNodeById(childOrder[i]);
        parent.insertChild(i, child);
      }

      return {
        success: true,
        parentId: parent.id,
        parentName: parent.name,
        parentType: parent.type,
        totalChildren: parent.children.length,
        newOrder: parent.children.map(c => ({ id: c.id, name: c.name, type: c.type }))
      };
    `);

    sendProgress({ status: `Reordered ${childOrder.length} children successfully` });

    return result.result;
  } else {
    // Single node move approach
    sendProgress({ status: `Moving node ${nodeId} to index ${newIndex} in parent ${parentId}...` });

    const result = await api.executeInFigma(`
      const parent = figma.getNodeById("${parentId}");
      if (!parent) throw new Error("Parent node not found: ${parentId}");
      if (!parent.children) throw new Error("Node has no children: ${parentId}");

      const child = figma.getNodeById("${nodeId}");
      if (!child) throw new Error("Child node not found: ${nodeId}");

      // Validate child belongs to this parent
      if (child.parent.id !== parent.id) {
        throw new Error("Node " + child.id + " is not a child of parent " + parent.id);
      }

      // Validate index is within bounds
      const maxIndex = parent.children.length - 1;
      if (${newIndex} < 0 || ${newIndex} > maxIndex) {
        throw new Error("Index ${newIndex} out of bounds (0 to " + maxIndex + ")");
      }

      // Move to new index
      parent.insertChild(${newIndex}, child);

      return {
        success: true,
        parentId: parent.id,
        parentName: parent.name,
        parentType: parent.type,
        movedNode: { id: child.id, name: child.name, type: child.type },
        newIndex: ${newIndex},
        totalChildren: parent.children.length,
        newOrder: parent.children.map(c => ({ id: c.id, name: c.name, type: c.type }))
      };
    `);

    sendProgress({ status: `Moved "${result.result.movedNode.name}" to index ${newIndex}` });

    return result.result;
  }
}

/**
 * Move a node from one parent to another (reparenting)
 * Supports optional index positioning in new parent
 */
async function moveNode(api, args, sendProgress) {
  const { nodeId, newParentId, index } = args;

  // Validate required parameters
  if (!nodeId || !newParentId) {
    throw {
      code: -32602,
      message: 'Missing required parameters: nodeId, newParentId'
    };
  }

  const hasIndex = index !== undefined;
  const action = hasIndex ? `inserting at index ${index}` : 'appending to end';
  sendProgress({ status: `Moving node ${nodeId} to parent ${newParentId} (${action})...` });

  const result = await api.executeInFigma(`
    const node = figma.getNodeById("${nodeId}");
    if (!node) {
      throw new Error("Node not found: ${nodeId}");
    }

    const newParent = figma.getNodeById("${newParentId}");
    if (!newParent) {
      throw new Error("New parent not found: ${newParentId}");
    }

    // Validate newParent supports children
    if (!newParent.children) {
      throw new Error("New parent cannot have children: " + newParent.type);
    }

    const oldParent = node.parent;
    const oldParentId = oldParent ? oldParent.id : null;
    const oldParentName = oldParent ? oldParent.name : 'root';

    // Perform the move
    const hasIndex = ${hasIndex};
    if (hasIndex) {
      // Validate index
      const maxIndex = newParent.children.length;
      if (${index} < 0 || ${index} > maxIndex) {
        throw new Error("Index ${index} out of bounds (0 to " + maxIndex + ")");
      }
      newParent.insertChild(${index}, node);
    } else {
      newParent.appendChild(node);
    }

    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      oldParentId: oldParentId,
      oldParentName: oldParentName,
      newParentId: newParent.id,
      newParentName: newParent.name,
      newParentType: newParent.type,
      finalIndex: newParent.children.indexOf(node),
      newParentChildCount: newParent.children.length
    };
  `);

  const resultData = result.result;
  sendProgress({
    status: `Moved "${resultData.nodeName}" from "${resultData.oldParentName}" to "${resultData.newParentName}" at index ${resultData.finalIndex}`
  });

  return resultData;
}

/**
 * Execute arbitrary Figma Plugin API script
 * General-purpose tool for custom operations and complex workflows
 */
async function executeFigmaScript(api, args, sendProgress) {
  const { script, description } = args;

  if (!script) {
    throw {
      code: -32602,
      message: 'Missing required parameter: script'
    };
  }

  const desc = description || 'Executing Figma script';
  sendProgress({ status: desc });

  try {
    const result = await api.executeInFigma(script);

    sendProgress({ status: 'Script executed successfully' });

    return result.result;
  } catch (error) {
    throw {
      code: -32000,
      message: `Script execution failed: ${error.message || error}`,
      data: { script: script.substring(0, 200) + '...' } // Include snippet for debugging
    };
  }
}

/**
 * Tool: set_nested_instance_exposure
 * PRIMITIVE: Set isExposedInstance flag on a nested instance node
 * Directly sets the flag without navigation - requires exact node ID
 */
async function setNestedInstanceExposure(api, args, sendProgress) {
  const { nodeId, isExposed = true } = args;

  if (!nodeId) {
    throw {
      code: -32602,
      message: 'Missing required parameter: nodeId'
    };
  }

  sendProgress({ status: `${isExposed ? 'Exposing' : 'Hiding'} instance ${nodeId}...` });

  const result = await api.executeInFigma(`
    const nodeId = "${nodeId}";
    const isExposed = ${isExposed};
    const node = figma.getNodeById(nodeId);

    if (!node) {
      throw new Error("Node not found: " + nodeId);
    }

    if (node.type !== "INSTANCE") {
      throw new Error("Node is not an instance. Found type: " + node.type);
    }

    // Set the isExposedInstance flag
    node.isExposedInstance = isExposed;

    // Get parent to construct exposed instance ID
    let exposedInstanceId = null;
    if (isExposed && node.parent && node.parent.type === "INSTANCE") {
      // Exposed instance ID format: I{parentId};{childId}
      exposedInstanceId = "I" + node.parent.id + ";" + node.id;
    }

    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      isExposed: node.isExposedInstance,
      exposedInstanceId: exposedInstanceId,
      parentId: node.parent ? node.parent.id : null,
      parentName: node.parent ? node.parent.name : null
    };
  `);

  sendProgress({ status: `Instance ${isExposed ? 'exposed' : 'hidden'} successfully` });

  return result.result;
}

/**
 * Tool: expose_nested_instance_by_path
 * WORKFLOW: Navigate to nested instance via path and expose it in one operation
 * Combines navigation + validation + exposure for convenience
 */
async function exposeNestedInstanceByPath(api, args, sendProgress) {
  const { parentInstanceId, childPath, isExposed = true } = args;

  if (!parentInstanceId || !childPath || !Array.isArray(childPath) || childPath.length === 0) {
    throw {
      code: -32602,
      message: 'Missing required parameters: parentInstanceId, childPath (must be non-empty array)'
    };
  }

  sendProgress({ status: `Navigating to nested instance via path: ${childPath.join(' → ')}...` });

  const result = await api.executeInFigma(`
    const parentId = "${parentInstanceId}";
    const childPath = ${JSON.stringify(childPath)};
    const isExposed = ${isExposed};

    const parent = figma.getNodeById(parentId);
    if (!parent) {
      throw new Error("Parent node not found: " + parentId);
    }

    // Allow COMPONENT, COMPONENT_SET, or INSTANCE
    // (You expose instances in component definitions, not just in instances)
    const validTypes = ["COMPONENT", "COMPONENT_SET", "INSTANCE"];
    if (!validTypes.includes(parent.type)) {
      throw new Error(
        "Parent node must be a COMPONENT, COMPONENT_SET, or INSTANCE. Found type: " + parent.type
      );
    }

    // Navigate down the path
    let currentNode = parent;
    const traversedPath = [parent.name];

    for (let i = 0; i < childPath.length; i++) {
      const targetName = childPath[i];

      if (!currentNode.children) {
        throw new Error("Node '" + currentNode.name + "' has no children. Cannot navigate to '" + targetName + "'");
      }

      const child = currentNode.children.find(c => c.name === targetName);

      if (!child) {
        const availableNames = currentNode.children.map(c => c.name).join(', ');
        throw new Error(
          "Child '" + targetName + "' not found in '" + currentNode.name + "'. " +
          "Available children: " + availableNames
        );
      }

      currentNode = child;
      traversedPath.push(child.name);
    }

    // Validate target is an instance
    if (currentNode.type !== "INSTANCE") {
      throw new Error(
        "Target node '" + currentNode.name + "' is not an instance. Found type: " + currentNode.type + ". " +
        "Only instances can be exposed."
      );
    }

    // Set the isExposedInstance flag
    currentNode.isExposedInstance = isExposed;

    // Construct exposed instance ID
    let exposedInstanceId = null;
    if (isExposed && currentNode.parent && currentNode.parent.type === "INSTANCE") {
      exposedInstanceId = "I" + currentNode.parent.id + ";" + currentNode.id;
    }

    return {
      success: true,
      targetNodeId: currentNode.id,
      targetNodeName: currentNode.name,
      isExposed: currentNode.isExposedInstance,
      exposedInstanceId: exposedInstanceId,
      traversedPath: traversedPath,
      pathDepth: traversedPath.length - 1,
      parentId: currentNode.parent ? currentNode.parent.id : null
    };
  `);

  sendProgress({ status: `Nested instance ${isExposed ? 'exposed' : 'hidden'}: ${result.result.targetNodeName}` });

  return result.result;
}

/**
 * Copy bindings from source node to target node
 * Supports filtering by binding type (variables, text, instanceSwap)
 * @param {Object} api - Figma bridge API
 * @param {Object} args - { sourceNodeId, targetNodeId, bindingTypes? }
 * @param {Function} sendProgress - Progress callback
 */
async function copyBindings(api, args, sendProgress) {
  const { sourceNodeId, targetNodeId, bindingTypes = ['variables', 'text', 'instanceSwap'] } = args;

  if (!sourceNodeId || !targetNodeId) {
    throw {
      code: -32602,
      message: 'Missing required parameters: sourceNodeId, targetNodeId'
    };
  }

  // Validate bindingTypes
  const validTypes = ['variables', 'text', 'instanceSwap'];
  const requestedTypes = Array.isArray(bindingTypes) ? bindingTypes : [bindingTypes];
  const invalidTypes = requestedTypes.filter(t => !validTypes.includes(t));

  if (invalidTypes.length > 0) {
    throw {
      code: -32602,
      message: `Invalid binding types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}`
    };
  }

  sendProgress({ status: `Copying bindings from ${sourceNodeId} to ${targetNodeId}...` });

  const result = await api.executeInFigma(`
    const sourceId = "${sourceNodeId}";
    const targetId = "${targetNodeId}";
    const bindingTypes = ${JSON.stringify(requestedTypes)};

    const sourceNode = figma.getNodeById(sourceId);
    const targetNode = figma.getNodeById(targetId);

    if (!sourceNode) {
      throw new Error("Source node not found: " + sourceId);
    }

    if (!targetNode) {
      throw new Error("Target node not found: " + targetId);
    }

    const copiedBindings = {
      variables: [],
      text: [],
      instanceSwap: []
    };

    // 1. Copy variable bindings (boundVariables)
    if (bindingTypes.includes('variables') && sourceNode.boundVariables) {
      for (const [field, binding] of Object.entries(sourceNode.boundVariables)) {
        try {
          // Handle both single variable and array of variables
          if (Array.isArray(binding)) {
            // For fields like fills, strokes that can have multiple bindings
            const variableIds = binding.map(b => b.id);
            targetNode.setBoundVariable(field, variableIds);
            copiedBindings.variables.push({
              field: field,
              variableIds: variableIds,
              count: variableIds.length
            });
          } else {
            // For fields with single variable binding
            targetNode.setBoundVariable(field, binding.id);
            copiedBindings.variables.push({
              field: field,
              variableId: binding.id
            });
          }
        } catch (err) {
          // Field might not be supported on target node type
          copiedBindings.variables.push({
            field: field,
            error: "Not supported on target node: " + err.message
          });
        }
      }
    }

    // 2. Copy component property bindings (componentPropertyReferences)
    if (sourceNode.type === 'INSTANCE' && targetNode.type === 'INSTANCE') {
      if (sourceNode.componentPropertyReferences) {
        for (const [field, propertyKey] of Object.entries(sourceNode.componentPropertyReferences)) {
          try {
            // Determine binding type
            if (field === 'mainComponent' && bindingTypes.includes('instanceSwap')) {
              // INSTANCE_SWAP binding
              targetNode.componentPropertyReferences = {
                ...targetNode.componentPropertyReferences,
                [field]: propertyKey
              };
              copiedBindings.instanceSwap.push({
                field: field,
                propertyKey: propertyKey
              });
            } else if (field === 'characters' && bindingTypes.includes('text')) {
              // TEXT binding
              targetNode.componentPropertyReferences = {
                ...targetNode.componentPropertyReferences,
                [field]: propertyKey
              };
              copiedBindings.text.push({
                field: field,
                propertyKey: propertyKey
              });
            } else if (bindingTypes.includes('text')) {
              // Other component property bindings (BOOLEAN, etc.)
              targetNode.componentPropertyReferences = {
                ...targetNode.componentPropertyReferences,
                [field]: propertyKey
              };
              copiedBindings.text.push({
                field: field,
                propertyKey: propertyKey
              });
            }
          } catch (err) {
            copiedBindings.text.push({
              field: field,
              propertyKey: propertyKey,
              error: "Failed to copy: " + err.message
            });
          }
        }
      }
    }

    return {
      success: true,
      sourceNodeId: sourceId,
      targetNodeId: targetId,
      bindingTypes: bindingTypes,
      copiedBindings: copiedBindings,
      totalCopied:
        copiedBindings.variables.length +
        copiedBindings.text.length +
        copiedBindings.instanceSwap.length
    };
  `);

  const bindingCounts = result.result.copiedBindings;
  sendProgress({
    status: `Copied ${result.result.totalCopied} bindings (${bindingCounts.variables.length} variable, ${bindingCounts.text.length} text, ${bindingCounts.instanceSwap.length} instance swap)`
  });

  return result.result;
}

/**
 * Copy all properties from source node to target node
 * Includes bindings + direct properties (opacity, visible, locked, etc.)
 * @param {Object} api - Figma bridge API
 * @param {Object} args - { sourceNodeId, targetNodeId, includeTypes? }
 * @param {Function} sendProgress - Progress callback
 */
async function copyAllProperties(api, args, sendProgress) {
  const { sourceNodeId, targetNodeId, includeTypes = ['bindings', 'direct'] } = args;

  if (!sourceNodeId || !targetNodeId) {
    throw {
      code: -32602,
      message: 'Missing required parameters: sourceNodeId, targetNodeId'
    };
  }

  sendProgress({ status: `Copying all properties from ${sourceNodeId} to ${targetNodeId}...` });

  let copiedBindings = null;

  // 1. Copy bindings if requested
  if (includeTypes.includes('bindings')) {
    sendProgress({ status: 'Copying bindings...' });
    copiedBindings = await copyBindings(api, {
      sourceNodeId,
      targetNodeId,
      bindingTypes: ['variables', 'text', 'instanceSwap']
    }, sendProgress);
  }

  // 2. Copy direct properties if requested
  let copiedDirectProperties = [];
  if (includeTypes.includes('direct')) {
    sendProgress({ status: 'Copying direct properties...' });

    const directResult = await api.executeInFigma(`
      const sourceId = "${sourceNodeId}";
      const targetId = "${targetNodeId}";

      const sourceNode = figma.getNodeById(sourceId);
      const targetNode = figma.getNodeById(targetId);

      if (!sourceNode) {
        throw new Error("Source node not found: " + sourceId);
      }

      if (!targetNode) {
        throw new Error("Target node not found: " + targetId);
      }

      const copiedProps = [];

      // Copy common properties
      const propertiesToCopy = [
        'opacity',
        'visible',
        'locked',
        'blendMode'
      ];

      for (const prop of propertiesToCopy) {
        try {
          if (sourceNode[prop] !== undefined && targetNode[prop] !== undefined) {
            targetNode[prop] = sourceNode[prop];
            copiedProps.push({ property: prop, value: sourceNode[prop] });
          }
        } catch (err) {
          copiedProps.push({ property: prop, error: err.message });
        }
      }

      // Copy layout properties if both are auto-layout frames
      if (sourceNode.layoutMode !== 'NONE' && targetNode.layoutMode !== 'NONE') {
        const layoutProps = [
          'layoutMode',
          'primaryAxisSizingMode',
          'counterAxisSizingMode',
          'primaryAxisAlignItems',
          'counterAxisAlignItems',
          'itemSpacing',
          'paddingLeft',
          'paddingRight',
          'paddingTop',
          'paddingBottom'
        ];

        for (const prop of layoutProps) {
          try {
            if (sourceNode[prop] !== undefined && targetNode[prop] !== undefined) {
              targetNode[prop] = sourceNode[prop];
              copiedProps.push({ property: prop, value: sourceNode[prop] });
            }
          } catch (err) {
            copiedProps.push({ property: prop, error: err.message });
          }
        }
      }

      return { copiedProperties: copiedProps };
    `);

    copiedDirectProperties = directResult.result.copiedProperties;
  }

  // 3. Copy styles if requested
  let copiedStyles = [];
  if (includeTypes.includes('direct')) {
    sendProgress({ status: 'Copying styles...' });

    const stylesResult = await api.executeInFigma(`
      const sourceId = "${sourceNodeId}";
      const targetId = "${targetNodeId}";

      const sourceNode = figma.getNodeById(sourceId);
      const targetNode = figma.getNodeById(targetId);

      if (!sourceNode) {
        throw new Error("Source node not found: " + sourceId);
      }

      if (!targetNode) {
        throw new Error("Target node not found: " + targetId);
      }

      const copiedStyles = [];

      // Copy effect style
      if (sourceNode.effectStyleId && sourceNode.effectStyleId !== '') {
        try {
          targetNode.effectStyleId = sourceNode.effectStyleId;
          copiedStyles.push({ type: 'effect', styleId: sourceNode.effectStyleId });
        } catch (err) {
          copiedStyles.push({ type: 'effect', error: err.message });
        }
      }

      // Copy fill style
      if (sourceNode.fillStyleId && sourceNode.fillStyleId !== '') {
        try {
          targetNode.fillStyleId = sourceNode.fillStyleId;
          copiedStyles.push({ type: 'fill', styleId: sourceNode.fillStyleId });
        } catch (err) {
          copiedStyles.push({ type: 'fill', error: err.message });
        }
      }

      // Copy stroke style
      if (sourceNode.strokeStyleId && sourceNode.strokeStyleId !== '') {
        try {
          targetNode.strokeStyleId = sourceNode.strokeStyleId;
          copiedStyles.push({ type: 'stroke', styleId: sourceNode.strokeStyleId });
        } catch (err) {
          copiedStyles.push({ type: 'stroke', error: err.message });
        }
      }

      // Copy fills directly (if not using fill style and not bound to variables)
      if ((!sourceNode.fillStyleId || sourceNode.fillStyleId === '') &&
          sourceNode.fills && sourceNode.fills.length > 0 &&
          (!sourceNode.boundVariables || !sourceNode.boundVariables.fills)) {
        try {
          targetNode.fills = JSON.parse(JSON.stringify(sourceNode.fills));
          copiedStyles.push({ type: 'fills', count: sourceNode.fills.length });
        } catch (err) {
          copiedStyles.push({ type: 'fills', error: err.message });
        }
      }

      // Copy strokes directly (if not using stroke style and not bound to variables)
      if ((!sourceNode.strokeStyleId || sourceNode.strokeStyleId === '') &&
          sourceNode.strokes && sourceNode.strokes.length > 0 &&
          (!sourceNode.boundVariables || !sourceNode.boundVariables.strokes)) {
        try {
          targetNode.strokes = JSON.parse(JSON.stringify(sourceNode.strokes));
          copiedStyles.push({ type: 'strokes', count: sourceNode.strokes.length });
        } catch (err) {
          copiedStyles.push({ type: 'strokes', error: err.message });
        }
      }

      // Copy text styles from child text nodes
      function copyTextStylesRecursive(sourceParent, targetParent) {
        const copiedTextStyles = [];

        if (sourceParent.children && targetParent.children) {
          const minLength = Math.min(sourceParent.children.length, targetParent.children.length);

          for (let i = 0; i < minLength; i++) {
            const sourceChild = sourceParent.children[i];
            const targetChild = targetParent.children[i];

            // Copy text style if source child is text node
            if (sourceChild.type === 'TEXT' && targetChild.type === 'TEXT') {
              if (sourceChild.textStyleId && sourceChild.textStyleId !== '') {
                try {
                  targetChild.textStyleId = sourceChild.textStyleId;
                  copiedTextStyles.push({
                    nodeId: targetChild.id,
                    nodeName: targetChild.name,
                    styleId: sourceChild.textStyleId
                  });
                } catch (err) {
                  copiedTextStyles.push({
                    nodeId: targetChild.id,
                    error: err.message
                  });
                }
              }
            }

            // Recurse into children
            if (sourceChild.children && targetChild.children) {
              copiedTextStyles.push(...copyTextStylesRecursive(sourceChild, targetChild));
            }
          }
        }

        return copiedTextStyles;
      }

      const textStyles = copyTextStylesRecursive(sourceNode, targetNode);
      if (textStyles.length > 0) {
        copiedStyles.push({ type: 'textStyles', styles: textStyles });
      }

      return { copiedStyles: copiedStyles };
    `);

    copiedStyles = stylesResult.result.copiedStyles;
  }

  sendProgress({ status: 'All properties copied successfully' });

  return {
    success: true,
    sourceNodeId,
    targetNodeId,
    copiedBindings: copiedBindings,
    copiedDirectProperties: copiedDirectProperties,
    copiedStyles: copiedStyles,
    totalBindingsCopied: copiedBindings ? copiedBindings.totalCopied : 0,
    totalDirectPropertiesCopied: copiedDirectProperties.length,
    totalStylesCopied: copiedStyles.length
  };
}

/**
 * WORKFLOW: Apply image fill from URL to a node (one-step operation)
 * Intuitive high-level tool that imports image and applies fill atomically
 */
async function applyImageFill(api, args, sendProgress) {
  const { nodeId, imageUrl, scaleMode = 'FILL', opacity = 1, rotation = 0, filters = {}, crop, tileScale = 1 } = args;

  if (!nodeId || !imageUrl) {
    throw {
      code: -32602,
      message: 'Missing required parameters: nodeId and imageUrl'
    };
  }

  sendProgress({ status: `Importing image from ${imageUrl}...` });

  const result = await api.executeInFigma(`
    const nodeId = "${nodeId}";
    const imageUrl = "${imageUrl}";
    const scaleMode = "${scaleMode}";
    const opacity = ${opacity};
    const rotation = ${rotation};
    const filters = ${JSON.stringify(filters)};
    const crop = ${JSON.stringify(crop)};
    const tileScale = ${tileScale};

    const node = figma.getNodeById(nodeId);
    if (!node) {
      throw new Error("Node not found: " + nodeId);
    }

    if (!('fills' in node)) {
      throw new Error("Node does not support fills. Node type: " + node.type);
    }

    // Import image from URL
    let image;
    try {
      image = await figma.createImageAsync(imageUrl);
    } catch (err) {
      throw new Error("Failed to load image: " + err.message);
    }

    // Build image fill paint object
    const imageFill = {
      type: 'IMAGE',
      imageHash: image.hash,
      scaleMode: scaleMode,
      opacity: opacity
    };

    // Add rotation if specified
    if (rotation !== 0) {
      imageFill.rotation = rotation;
    }

    // Add filters if specified
    if (Object.keys(filters).length > 0) {
      imageFill.filters = filters;
    }

    // Add imageTransform for CROP mode
    if (scaleMode === 'CROP' && crop) {
      imageFill.imageTransform = [[1, 0, crop.x || 0], [0, 1, crop.y || 0]];
    }

    // Add scalingFactor for TILE mode
    if (scaleMode === 'TILE') {
      imageFill.scalingFactor = tileScale;
    }

    // Apply the fill
    node.fills = [imageFill];

    // Get image dimensions for return value
    const { width, height } = await image.getSizeAsync();

    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      imageHash: image.hash,
      imageDimensions: { width, height },
      appliedFill: {
        scaleMode,
        opacity,
        rotation,
        hasFilters: Object.keys(filters).length > 0
      }
    };
  `);

  sendProgress({ status: 'Image fill applied successfully' });
  return result.result;
}

/**
 * WORKFLOW: Apply gradient fill to a node with intuitive angle-based API
 * Converts simple angle parameter to gradientTransform matrix
 */
async function applyGradientFill(api, args, sendProgress) {
  const { nodeId, gradientType = 'linear', angle = 90, colors, colorVariables, opacity = 1 } = args;

  // Either colors OR colorVariables must be provided
  if (!nodeId) {
    throw {
      code: -32602,
      message: 'Missing required parameter: nodeId'
    };
  }

  if (!colors && !colorVariables) {
    throw {
      code: -32602,
      message: 'Either colors or colorVariables must be provided'
    };
  }

  if (colors && (!Array.isArray(colors) || colors.length < 2)) {
    throw {
      code: -32602,
      message: 'colors array must contain at least 2 colors'
    };
  }

  if (colorVariables && (!Array.isArray(colorVariables) || colorVariables.length < 2)) {
    throw {
      code: -32602,
      message: 'colorVariables array must contain at least 2 variable references'
    };
  }

  sendProgress({ status: `Applying ${gradientType} gradient to node ${nodeId}...` });

  const result = await api.executeInFigma(`
    const nodeId = "${nodeId}";
    const gradientType = "${gradientType}";
    const angle = ${angle};
    const colorsJson = ${colors ? JSON.stringify(colors) : 'null'};
    const colorVariablesJson = ${colorVariables ? JSON.stringify(colorVariables) : 'null'};
    const opacity = ${opacity};

    const node = figma.getNodeById(nodeId);
    if (!node) {
      throw new Error("Node not found: " + nodeId);
    }

    if (!('fills' in node)) {
      throw new Error("Node does not support fills. Node type: " + node.type);
    }

    // Helper function to parse color (hex or RGB object)
    function parseColor(colorInput) {
      if (typeof colorInput === 'string') {
        // Parse hex color
        const hex = colorInput.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
        return { r, g, b, a };
      } else if (typeof colorInput === 'object') {
        // Already RGB object
        return {
          r: colorInput.r ?? 0,
          g: colorInput.g ?? 0,
          b: colorInput.b ?? 0,
          a: colorInput.a ?? 1
        };
      }
      throw new Error("Invalid color format: " + colorInput);
    }

    // Generate gradient stops - either from colors or colorVariables
    let gradientStops;

    if (colorVariablesJson) {
      // MODE: Variable binding
      // Build gradient stops with variable bindings
      gradientStops = await Promise.all(colorVariablesJson.map(async (varSpec, index) => {
        let variableId, position;

        if (typeof varSpec === 'string') {
          // Simple variable ID/name - distribute evenly
          variableId = varSpec;
          position = index / (colorVariablesJson.length - 1);
        } else if (typeof varSpec === 'object') {
          // Object with variableId and optional position
          variableId = varSpec.variableId || varSpec.variable || varSpec.id;
          position = varSpec.position !== undefined ? varSpec.position : index / (colorVariablesJson.length - 1);
        }

        // Find variable
        let variable;
        if (variableId.includes(':')) {
          variable = figma.variables.getVariableById(variableId);
        } else {
          const variables = await figma.variables.getLocalVariablesAsync();
          variable = variables.find(v => v.name === variableId);
        }

        if (!variable) {
          throw new Error('Variable not found: ' + variableId);
        }

        if (variable.resolvedType !== 'COLOR') {
          throw new Error('Variable must be COLOR type: ' + variableId);
        }

        // Return stop with variable binding
        return {
          position,
          color: { r: 1, g: 1, b: 1, a: 1 }, // Placeholder - will be overridden by variable
          boundVariables: {
            color: {
              type: 'VARIABLE_ALIAS',
              id: variable.id
            }
          }
        };
      }));
    } else {
      // MODE: Static colors
      gradientStops = colorsJson.map((colorSpec, index) => {
        let color, position;

        if (typeof colorSpec === 'string') {
          // Simple hex color - distribute evenly
          color = parseColor(colorSpec);
          position = index / (colorsJson.length - 1);
        } else if (typeof colorSpec === 'object') {
          // Object with color and optional position
          color = parseColor(colorSpec.color);
          position = colorSpec.position !== undefined ? colorSpec.position : index / (colorsJson.length - 1);
        }

        return { color, position };
      });
    }

    // Generate gradientTransform based on type and angle
    let gradientTransform;

    if (gradientType === 'linear') {
      // Convert angle to radians
      const angleRad = (angle * Math.PI) / 180;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);

      // Transform matrix for linear gradient at given angle
      gradientTransform = [
        [cos, sin, 0.5 - cos * 0.5 - sin * 0.5],
        [-sin, cos, 0.5 + sin * 0.5 - cos * 0.5]
      ];
    } else {
      // For radial, angular, and diamond - use identity transform (centered)
      gradientTransform = [[1, 0, 0], [0, 1, 0]];
    }

    // Map gradient type to Figma constant
    const gradientTypeMap = {
      'linear': 'GRADIENT_LINEAR',
      'radial': 'GRADIENT_RADIAL',
      'angular': 'GRADIENT_ANGULAR',
      'diamond': 'GRADIENT_DIAMOND'
    };

    const figmaGradientType = gradientTypeMap[gradientType];
    if (!figmaGradientType) {
      throw new Error("Invalid gradient type: " + gradientType + ". Use: linear, radial, angular, diamond");
    }

    // Apply gradient fill
    node.fills = [{
      type: figmaGradientType,
      gradientTransform: gradientTransform,
      gradientStops: gradientStops,
      opacity: opacity
    }];

    return {
      success: true,
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      appliedGradient: {
        type: gradientType,
        angle: gradientType === 'linear' ? angle : null,
        colorCount: gradientStops.length,
        opacity: opacity,
        variablesBound: colorVariablesJson ? true : false,
        variableCount: colorVariablesJson ? colorVariablesJson.length : 0
      }
    };
  `);

  sendProgress({ status: 'Gradient fill applied successfully' });
  return result.result;
}

/**
 * Tool: swap_instance_component
 * Swap a top-level instance to a different component while preserving overrides
 */
async function swapInstanceComponent(api, args, sendProgress) {
  const { instanceId, newComponentId } = args;

  sendProgress({ status: `Swapping instance ${instanceId} to new component...` });

  const result = await api.executeInFigma(`
    const instance = figma.getNodeById("${instanceId}");
    if (!instance) {
      throw new Error("Instance not found with ID: ${instanceId}");
    }

    if (instance.type !== "INSTANCE") {
      throw new Error("Node is not an instance. Found type: " + instance.type);
    }

    const newComponent = figma.getNodeById("${newComponentId}");
    if (!newComponent) {
      throw new Error("New component not found with ID: ${newComponentId}");
    }

    if (newComponent.type !== "COMPONENT" && newComponent.type !== "COMPONENT_SET") {
      throw new Error("Target node is not a component. Found type: " + newComponent.type);
    }

    // Get original component info before swap
    const originalComponent = instance.mainComponent;
    const originalComponentId = originalComponent ? originalComponent.id : null;
    const originalComponentName = originalComponent ? originalComponent.name : 'Unknown';

    // Perform the swap using swapComponent() which preserves overrides
    instance.swapComponent(newComponent);

    return {
      success: true,
      instanceId: instance.id,
      instanceName: instance.name,
      originalComponent: {
        id: originalComponentId,
        name: originalComponentName
      },
      newComponent: {
        id: newComponent.id,
        name: newComponent.name,
        type: newComponent.type
      },
      overridesPreserved: true
    };
  `);

  sendProgress({ status: 'Instance swapped successfully with overrides preserved' });
  return result.result;
}

/**
 * Tool: batch_apply_images
 * Apply images to multiple nodes efficiently in a single batch operation
 */
async function batchApplyImages(api, args, sendProgress) {
  const { imageSpecs } = args;

  if (!imageSpecs || !Array.isArray(imageSpecs) || imageSpecs.length === 0) {
    throw new Error('imageSpecs must be a non-empty array');
  }

  sendProgress({ status: `Batch applying images to ${imageSpecs.length} nodes...` });

  const result = await api.executeInFigma(`
    const imageSpecs = ${JSON.stringify(imageSpecs)};
    const results = [];
    const errors = [];

    // Step 1: Import all images in parallel
    const imageImportPromises = imageSpecs.map(async (spec, index) => {
      try {
        const image = await figma.createImageAsync(spec.imageUrl);
        return { index, image, spec };
      } catch (error) {
        errors.push({
          index,
          nodeId: spec.nodeId,
          error: error.message
        });
        return { index, image: null, spec };
      }
    });

    const importedImages = await Promise.all(imageImportPromises);

    // Step 2: Apply images to nodes in parallel
    const applyPromises = importedImages.map(async ({ index, image, spec }) => {
      if (!image) {
        return { success: false, index };
      }

      try {
        const node = figma.getNodeById(spec.nodeId);
        if (!node) {
          errors.push({
            index,
            nodeId: spec.nodeId,
            error: 'Node not found'
          });
          return { success: false, index };
        }

        // Validate node supports fills
        if (!('fills' in node)) {
          errors.push({
            index,
            nodeId: spec.nodeId,
            error: 'Node does not support fills'
          });
          return { success: false, index };
        }

        // Parse scaleMode (default: FILL)
        const scaleMode = spec.scaleMode || 'FILL';
        const opacity = spec.opacity !== undefined ? spec.opacity : 1;

        // Create image paint
        const imagePaint = {
          type: 'IMAGE',
          scaleMode: scaleMode,
          imageHash: image.hash,
          opacity: opacity
        };

        // Apply optional transformations
        if (spec.rotation !== undefined) {
          const rotationRadians = (spec.rotation * Math.PI) / 180;
          imagePaint.rotation = rotationRadians;
        }

        if (scaleMode === 'TILE' && spec.tileScale !== undefined) {
          imagePaint.scalingFactor = spec.tileScale;
        }

        if (scaleMode === 'CROP' && spec.crop) {
          imagePaint.imageTransform = [
            [spec.crop.x, 0, 0],
            [0, spec.crop.y, 0]
          ];
        }

        // Apply filters if provided (nested in filters object)
        if (spec.filters) {
          imagePaint.filters = {};
          if (spec.filters.exposure !== undefined) imagePaint.filters.exposure = spec.filters.exposure;
          if (spec.filters.contrast !== undefined) imagePaint.filters.contrast = spec.filters.contrast;
          if (spec.filters.saturation !== undefined) imagePaint.filters.saturation = spec.filters.saturation;
          if (spec.filters.temperature !== undefined) imagePaint.filters.temperature = spec.filters.temperature;
          if (spec.filters.tint !== undefined) imagePaint.filters.tint = spec.filters.tint;
          if (spec.filters.highlights !== undefined) imagePaint.filters.highlights = spec.filters.highlights;
          if (spec.filters.shadows !== undefined) imagePaint.filters.shadows = spec.filters.shadows;
        }

        // Apply fill
        node.fills = [imagePaint];

        results.push({
          success: true,
          index,
          nodeId: spec.nodeId,
          nodeName: node.name,
          imageHash: image.hash,
          scaleMode: scaleMode
        });

        return { success: true, index };
      } catch (error) {
        errors.push({
          index,
          nodeId: spec.nodeId,
          error: error.message
        });
        return { success: false, index };
      }
    });

    await Promise.all(applyPromises);

    return {
      totalRequested: imageSpecs.length,
      successful: results.length,
      failed: errors.length,
      results: results,
      errors: errors
    };
  `);

  const summary = result.result;
  sendProgress({
    status: `Batch complete: ${summary.successful}/${summary.totalRequested} images applied successfully`
  });

  return summary;
}

module.exports = {
  create_component: createComponent,
  convert_to_component: convertToComponent,
  create_auto_layout: createAutoLayout,
  create_text_node: createTextNode,
  bind_variable: bindVariable,
  batch_bind_variables: batchBindVariables,
  create_instance: createInstance,
  create_multiple_instances: createMultipleInstances,
  apply_responsive_pattern: applyResponsivePattern,
  add_children: addChildren,
  wrap_in_container: wrapInContainer,
  modify_node: modifyNode,
  batch_modify_nodes: batchModifyNodes,
  add_component_property: addComponentProperty,
  edit_component_property: editComponentProperty,
  delete_component_property: deleteComponentProperty,
  bind_text_to_property: bindTextToProperty,
  bind_property_reference: bindPropertyReference,
  set_text_truncation: setTextTruncation,
  set_instance_properties: setInstanceProperties,
  swap_component: swapComponent,
  get_component_properties: getComponentProperties,
  get_instance_properties: getInstanceProperties,
  create_component_variants: createComponentVariants,
  add_variant_to_component_set: addVariantToComponentSet,
  rename_node: renameNode,
  create_variable: createVariable,
  create_text_style: createTextStyle,
  delete_text_style: deleteTextStyle,
  delete_node: deleteNode,
  clone_node: cloneNode,
  reorder_children: reorderChildren,
  move_node: moveNode,
  import_image_from_url: importImageFromUrl,
  create_image_component: createImageComponent,
  batch_create_image_components: batchCreateImageComponents,
  apply_image_fill: applyImageFill,
  apply_gradient_fill: applyGradientFill,
  execute_figma_script: executeFigmaScript,
  set_nested_instance_exposure: setNestedInstanceExposure,
  expose_nested_instance_by_path: exposeNestedInstanceByPath,
  copy_bindings: copyBindings,
  copy_all_properties: copyAllProperties,
  swap_instance_component: swapInstanceComponent,
  batch_apply_images: batchApplyImages
};
