/**
 * WRITE Tools - Component Creation and Modification
 *
 * Implements 5 WRITE tools that enable component creation and variable binding
 * Uses WebSocket server API and lib functions
 */

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

  // Execute component creation script
  const result = await api.executeInFigma(`
    const component = figma.createComponent();
    component.name = "${name}";
    component.resize(${width}, ${height});

    // Set fills if provided
    const fills = ${JSON.stringify(fills)};
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
 * Tool 2: create_auto_layout
 * Create an auto-layout frame with specified properties
 */
async function createAutoLayout(api, args, sendProgress) {
  const {
    name = 'Auto Layout Frame',
    layoutMode = 'HORIZONTAL',
    itemSpacing = 8,
    padding = 16,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    primaryAxisSizingMode = 'AUTO',
    counterAxisSizingMode = 'AUTO',
    fills = [],
    cornerRadius = 0
  } = args;

  sendProgress({ status: `Creating auto-layout frame "${name}"...` });

  // Calculate padding values
  const pLeft = paddingLeft !== undefined ? paddingLeft : padding;
  const pRight = paddingRight !== undefined ? paddingRight : padding;
  const pTop = paddingTop !== undefined ? paddingTop : padding;
  const pBottom = paddingBottom !== undefined ? paddingBottom : padding;

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

    // Set fills
    const fills = ${JSON.stringify(fills)};
    if (fills.length > 0) {
      frame.fills = fills;
    }

    // Set corner radius
    if (${cornerRadius} > 0) {
      frame.cornerRadius = ${cornerRadius};
    }

    // Add to current page
    figma.currentPage.appendChild(frame);

    // Center in viewport
    figma.viewport.scrollAndZoomIntoView([frame]);

    return {
      id: frame.id,
      name: frame.name,
      layoutMode: frame.layoutMode,
      itemSpacing: frame.itemSpacing,
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

  const result = await api.executeInFigma(`
    // Load font FIRST before creating text node
    await figma.loadFontAsync({ family: "${fontFamily}", style: "${fontStyle}" });

    const text = figma.createText();
    text.fontName = { family: "${fontFamily}", style: "${fontStyle}" };
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

  const result = await api.executeInFigma(`
    const parent = figma.getNodeById("${parentId}");
    if (!parent) {
      throw new Error("Parent node not found: ${parentId}");
    }

    const children = ${JSON.stringify(children)};
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
            // Use manual font specifications
            const fontFamily = childSpec.fontFamily || 'DM Sans';
            const fontStyle = childSpec.fontStyle || 'Regular';
            await figma.loadFontAsync({ family: fontFamily, style: fontStyle });
            child.fontName = { family: fontFamily, style: fontStyle };
            child.fontSize = childSpec.fontSize || 16;
            child.characters = childSpec.characters || '';
          }

          if (childSpec.fills) {
            child.fills = childSpec.fills;
          }
          break;

        case 'frame':
          // Create frame
          child = figma.createFrame();
          child.name = childSpec.name;

          if (childSpec.layoutMode) {
            child.layoutMode = childSpec.layoutMode;
            child.itemSpacing = childSpec.itemSpacing || 0;
            child.paddingLeft = childSpec.padding || 0;
            child.paddingRight = childSpec.padding || 0;
            child.paddingTop = childSpec.padding || 0;
            child.paddingBottom = childSpec.padding || 0;
          }

          if (childSpec.fills) {
            child.fills = childSpec.fills;
          }
          break;

        case 'rectangle':
          // Create rectangle
          child = figma.createRectangle();
          child.name = childSpec.name;

          if (childSpec.fills) {
            child.fills = childSpec.fills;
          }
          break;
      }

      // NEW: Apply variable bindings if provided (Issue #3)
      if (child && childSpec.bindings) {
        for (const [property, variableName] of Object.entries(childSpec.bindings)) {
          try {
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
            console.warn(\`Failed to bind \${property} to \${variableName}: \${err.message}\`);
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

      if (child) {
        parent.appendChild(child);
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

  const result = await api.executeInFigma(`
    const node = figma.getNodeById("${nodeId}");
    if (!node) {
      throw new Error("Node not found: ${nodeId}");
    }

    const properties = ${JSON.stringify(properties)};
    const modified = {};

    // Apply each property
    for (const [key, value] of Object.entries(properties)) {
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

  const result = await api.executeInFigma(`
    // Load the font first
    await figma.loadFontAsync({ family: "${fontFamily}", style: "${fontStyle}" });

    const textStyle = figma.createTextStyle();
    textStyle.name = "${name}";
    textStyle.fontName = { family: "${fontFamily}", style: "${fontStyle}" };
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

module.exports = {
  create_component: createComponent,
  create_auto_layout: createAutoLayout,
  create_text_node: createTextNode,
  bind_variable: bindVariable,
  batch_bind_variables: batchBindVariables,
  create_instance: createInstance,
  add_children: addChildren,
  modify_node: modifyNode,
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
  execute_figma_script: executeFigmaScript,
  set_nested_instance_exposure: setNestedInstanceExposure,
  expose_nested_instance_by_path: exposeNestedInstanceByPath,
  copy_bindings: copyBindings,
  copy_all_properties: copyAllProperties
};
