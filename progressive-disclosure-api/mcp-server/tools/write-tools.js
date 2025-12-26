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
      const fills = node.fills && node.fills.length > 0 ? node.fills : [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      const boundPaint = figma.variables.setBoundVariableForPaint(fills[0], 'color', variable);
      node.fills = [boundPaint];
    } else if (property === 'strokes') {
      // For strokes, use setBoundVariableForPaint on first stroke
      const strokes = node.strokes && node.strokes.length > 0 ? node.strokes : [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
      const boundPaint = figma.variables.setBoundVariableForPaint(strokes[0], 'color', variable);
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

    if (component.type !== "COMPONENT") {
      throw new Error("Node is not a component: " + component.type);
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

module.exports = {
  create_component: createComponent,
  create_auto_layout: createAutoLayout,
  create_text_node: createTextNode,
  bind_variable: bindVariable,
  create_instance: createInstance,
  add_children: addChildren,
  modify_node: modifyNode,
  add_component_property: addComponentProperty,
  bind_text_to_property: bindTextToProperty,
  set_text_truncation: setTextTruncation,
  set_instance_properties: setInstanceProperties,
  swap_component: swapComponent,
  get_component_properties: getComponentProperties,
  get_instance_properties: getInstanceProperties,
  create_component_variants: createComponentVariants,
  rename_node: renameNode,
  create_variable: createVariable,
  create_text_style: createTextStyle,
  delete_text_style: deleteTextStyle
};
