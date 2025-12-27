/**
 * READ Tools - Progressive Disclosure Layers 0-4
 *
 * Implements 5 READ tools that expose Progressive Disclosure API layers
 * Wraps existing example scripts and lib functions
 */

const { getCachedDesignSystem, setCachedDesignSystem } = require('../utils/cache');

/**
 * Tool 1: get_design_system
 * Layer 0: Design System Context (cached)
 */
async function getDesignSystem(api, args, sendProgress) {
  const { includeVariables = true, includeStyles = true } = args;

  // Check cache first
  const cached = getCachedDesignSystem();
  if (cached) {
    sendProgress({ status: 'Using cached design system (15min TTL)' });
    return cached;
  }

  sendProgress({ status: 'Fetching design system from Figma...' });

  // Execute design system audit (from 00-design-system-audit.js)
  const result = await api.executeInFigma(`
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const allVars = await figma.variables.getLocalVariablesAsync();
    const textStyles = await figma.getLocalTextStylesAsync();
    const paintStyles = await figma.getLocalPaintStylesAsync();
    const effectStyles = await figma.getLocalEffectStylesAsync();

    // Helper to format variable value
    function formatValue(value, type) {
      if (value.type === "VARIABLE_ALIAS") {
        const aliasVar = allVars.find(v => v.id === value.id);
        return { alias: aliasVar ? aliasVar.name : value.id };
      }

      if (type === "COLOR") {
        const r = Math.round(value.r * 255);
        const g = Math.round(value.g * 255);
        const b = Math.round(value.b * 255);
        const a = value.a !== undefined ? value.a : 1;
        return a < 1 ? \`rgba(\${r},\${g},\${b},\${a})\` : \`rgb(\${r},\${g},\${b})\`;
      }

      if (type === "FLOAT") return value;

      return value;
    }

    const varsByCollection = {};
    collections.forEach(col => {
      const vars = allVars.filter(v => v.variableCollectionId === col.id);
      varsByCollection[col.name] = {
        modes: col.modes.map(m => ({ name: m.name, modeId: m.modeId })),
        variables: vars.map(v => {
          const valuesByMode = {};
          Object.entries(v.valuesByMode).forEach(([modeId, value]) => {
            const mode = col.modes.find(m => m.modeId === modeId);
            const modeName = mode ? mode.name : modeId;
            valuesByMode[modeName] = formatValue(value, v.resolvedType);
          });

          return {
            name: v.name,
            type: v.resolvedType,
            values: valuesByMode
          };
        })
      };
    });

    return {
      collections: ${includeVariables} ? varsByCollection : {},
      textStyles: ${includeStyles} ? textStyles.map(s => ({
        name: s.name,
        id: s.id.replace(/,$/,''),
        fontName: s.fontName,
        fontSize: s.fontSize,
        letterSpacing: s.letterSpacing,
        lineHeight: s.lineHeight
      })) : [],
      paintStyles: ${includeStyles} ? paintStyles.map(s => ({
        name: s.name,
        id: s.id.replace(/,$/,''),
        paints: s.paints,
        description: s.description
      })) : [],
      effectStyles: ${includeStyles} ? effectStyles.map(s => ({
        name: s.name,
        id: s.id.replace(/,$/,''),
        effects: s.effects,
        description: s.description
      })) : []
    };
  `);

  // Cache the result
  setCachedDesignSystem(result.result);

  return result.result;
}

/**
 * Tool 2: get_screenshot
 * Layer 1: Visual (PNG screenshot)
 */
async function getScreenshot(api, args, sendProgress) {
  const { nodeId, scale = 2, format = 'PNG' } = args;

  // Convert format to uppercase (Figma API requires uppercase)
  const upperFormat = format.toUpperCase();

  sendProgress({ status: `Capturing screenshot of node ${nodeId}...` });

  // Use existing screenshot helper from lib
  const screenshot = api.createScreenshotHelper(api);
  const result = await screenshot.screenshotById(nodeId, {
    scale,
    format: upperFormat
  });

  return result;
}

/**
 * Tool 3: get_component_structure
 * Layer 2: Structural (component map with node IDs)
 */
async function getComponentStructure(api, args, sendProgress) {
  const { nodeId, depth = -1, includeText = true } = args;

  sendProgress({ status: `Mapping structure for node ${nodeId}...` });

  // Execute component map script (from 02-structural-layer.js)
  const result = await api.executeInFigma(`
    const nodeId = "${nodeId}";
    const root = figma.getNodeById(nodeId);

    if (!root) {
      throw new Error("Node not found: " + nodeId);
    }

    function mapNode(node, currentDepth = 0) {
      const info = {
        name: node.name,
        type: node.type,
        id: node.id
      };

      if (node.type === "INSTANCE" && node.mainComponent) {
        info.component = node.mainComponent.name;
        info.componentId = node.mainComponent.id;
      }

      if (${includeText} && node.type === "TEXT") {
        info.text = (node.characters || "").substring(0, 60);
      }

      const maxDepth = ${depth};
      if (node.children && (maxDepth === -1 || currentDepth < maxDepth)) {
        info.children = node.children.map(c => mapNode(c, currentDepth + 1));
      }

      return info;
    }

    return mapNode(root);
  `);

  return result.result;
}

/**
 * Tool 4: get_node_details
 * Layer 3: Detailed (properties, bindings, dimensions)
 */
async function getNodeDetails(api, args, sendProgress) {
  const { nodeId, resolveBindings = false } = args;

  sendProgress({ status: `Extracting details for node ${nodeId}...` });

  // Execute node details script (from 03-detailed-layer.js)
  const result = await api.executeInFigma(`
    const nodeId = "${nodeId}";
    const node = figma.getNodeById(nodeId);

    if (!node) {
      throw new Error("Node not found: " + nodeId);
    }

    const allVars = await figma.variables.getLocalVariablesAsync();

    // Helper to resolve variable binding
    function resolveVar(varId) {
      const variable = allVars.find(v => v.id === varId);
      return variable ? variable.name : varId;
    }

    // Extract basic properties
    const details = {
      identity: {
        name: node.name,
        id: node.id,
        type: node.type
      },
      dimensions: {
        width: node.width,
        height: node.height
      }
    };

    // Extract layout if frame/component
    if (node.layoutMode) {
      details.layout = {
        mode: node.layoutMode,
        primaryAxisSizingMode: node.primaryAxisSizingMode,
        counterAxisSizingMode: node.counterAxisSizingMode,
        itemSpacing: node.itemSpacing,
        padding: {
          left: node.paddingLeft,
          right: node.paddingRight,
          top: node.paddingTop,
          bottom: node.paddingBottom
        }
      };
    }

    // Extract appearance
    details.appearance = {
      fills: node.fills ? node.fills.map((fill, i) => {
        const fillData = {
          type: fill.type,
          visible: fill.visible,
          opacity: fill.opacity
        };

        if (fill.type === 'SOLID' && fill.color) {
          fillData.color = {
            r: Math.round(fill.color.r * 255),
            g: Math.round(fill.color.g * 255),
            b: Math.round(fill.color.b * 255),
            a: fill.color.a !== undefined ? fill.color.a : 1
          };
        }

        // Check for variable binding
        if (node.boundVariables && node.boundVariables.fills) {
          const binding = node.boundVariables.fills[i];
          if (binding && binding.id) {
            fillData.boundTo = resolveVar(binding.id);
          }
        }

        return fillData;
      }) : [],
      strokes: node.strokes ? node.strokes.map((stroke, i) => {
        const strokeData = {
          type: stroke.type,
          visible: stroke.visible
        };

        if (stroke.type === 'SOLID' && stroke.color) {
          strokeData.color = {
            r: Math.round(stroke.color.r * 255),
            g: Math.round(stroke.color.g * 255),
            b: Math.round(stroke.color.b * 255),
            a: stroke.color.a !== undefined ? stroke.color.a : 1
          };
        }

        // Check for variable binding on stroke paint
        if (stroke.boundVariables && stroke.boundVariables.color) {
          const binding = stroke.boundVariables.color;
          if (binding && binding.id) {
            strokeData.boundTo = resolveVar(binding.id);
          }
        }

        return strokeData;
      }) : [],
      strokeWeight: node.strokeWeight,
      cornerRadius: node.cornerRadius,
      opacity: node.opacity
    };

    // Extract bindings
    details.bindings = {};
    if (node.boundVariables) {
      Object.keys(node.boundVariables).forEach(key => {
        if (node.boundVariables[key] && node.boundVariables[key].id) {
          details.bindings[key] = resolveVar(node.boundVariables[key].id);
        }
      });
    }

    // Extract children info
    if (node.children) {
      details.structure = {
        childCount: node.children.length,
        children: node.children.map(child => ({
          id: child.id,
          name: child.name,
          type: child.type
        }))
      };
    }

    return details;
  `);

  return result.result;
}

/**
 * Tool 5: analyze_complete
 * Layer 4: Complete workflow (all layers combined)
 */
async function analyzeComplete(api, args, sendProgress) {
  const { nodeId, layers = [0, 1, 2, 3], screenshotScale = 2 } = args;

  const results = {};

  // Layer 0: Design System
  if (layers.includes(0)) {
    sendProgress({ status: 'Layer 0: Fetching design system...' });
    results.designSystem = await getDesignSystem(api, {}, sendProgress);
  }

  // Layer 1: Screenshot
  if (layers.includes(1)) {
    sendProgress({ status: 'Layer 1: Capturing screenshot...' });
    results.screenshot = await getScreenshot(api, { nodeId, scale: screenshotScale }, sendProgress);
  }

  // Layer 2: Structure
  if (layers.includes(2)) {
    sendProgress({ status: 'Layer 2: Mapping structure...' });
    results.structure = await getComponentStructure(api, { nodeId, depth: 2 }, sendProgress);
  }

  // Layer 3: Details
  if (layers.includes(3)) {
    sendProgress({ status: 'Layer 3: Extracting details...' });
    results.details = await getNodeDetails(api, { nodeId }, sendProgress);
  }

  sendProgress({ status: 'Complete! All layers fetched.' });

  return results;
}

/**
 * Tool 6: get_components
 * Get list of all local components
 */
async function getComponents(api, args, sendProgress) {
  const { limit = 50, searchTerm = '' } = args;

  sendProgress({ status: 'Fetching component list from Figma...' });

  const result = await api.executeInFigma(`
    const components = figma.root.findAll(node => node.type === 'COMPONENT');

    let filtered = components;

    // Filter by search term if provided
    if ("${searchTerm}") {
      const search = "${searchTerm}".toLowerCase();
      filtered = components.filter(c => c.name.toLowerCase().includes(search));
    }

    // Limit results
    const limited = filtered.slice(0, ${limit});

    return limited.map(comp => ({
      id: comp.id,
      name: comp.name,
      description: comp.description || '',
      width: comp.width,
      height: comp.height
    }));
  `);

  sendProgress({ status: `Found ${result.result.length} components` });

  return result.result;
}

/**
 * Get comprehensive component metadata including properties, description, and location
 * Enhanced workflow tool combining multiple data sources
 */
async function getComponentMetadata(api, args, sendProgress) {
  const { componentId } = args;

  if (!componentId) {
    throw {
      code: -32602,
      message: 'Missing required parameter: componentId'
    };
  }

  sendProgress({ status: `Getting metadata for component ${componentId}...` });

  const result = await api.executeInFigma(`
    const component = figma.getNodeById("${componentId}");
    if (!component) {
      throw new Error("Component not found: ${componentId}");
    }

    // Validate component type
    if (component.type !== 'COMPONENT' && component.type !== 'COMPONENT_SET') {
      throw new Error("Node is not a component. Type: " + component.type);
    }

    // Basic metadata
    const metadata = {
      id: component.id,
      name: component.name,
      type: component.type,
      description: component.description || "",
      dimensions: {
        width: component.width,
        height: component.height
      }
    };

    // Parent information
    if (component.parent) {
      metadata.parent = {
        type: component.parent.type,
        name: component.parent.name,
        id: component.parent.id
      };
    }

    // Component properties (reuse existing logic)
    if (component.type === 'COMPONENT') {
      metadata.properties = {};
      const propDefs = component.componentPropertyDefinitions;

      if (propDefs) {
        for (const [key, def] of Object.entries(propDefs)) {
          metadata.properties[key] = {
            type: def.type,
            defaultValue: def.defaultValue
          };

          // Add preferred values for TEXT properties
          if (def.type === 'TEXT' && def.preferredValues) {
            metadata.properties[key].preferredValues = def.preferredValues;
          }

          // Add preferred values for INSTANCE_SWAP
          if (def.type === 'INSTANCE_SWAP' && def.preferredValues) {
            metadata.properties[key].preferredValues = def.preferredValues.map(v => v.id);
          }
        }
      }

      metadata.variantGroupProperties = null;
    }

    // ComponentSet-specific: variant group properties
    if (component.type === 'COMPONENT_SET') {
      metadata.variantGroupProperties = {};

      // Extract variant properties from children
      const variantProps = component.variantGroupProperties;
      if (variantProps) {
        for (const [propName, propValues] of Object.entries(variantProps)) {
          metadata.variantGroupProperties[propName] = propValues.values || [];
        }
      }

      // Also get component properties for the set
      metadata.properties = {};
      const propDefs = component.componentPropertyDefinitions;
      if (propDefs) {
        for (const [key, def] of Object.entries(propDefs)) {
          metadata.properties[key] = {
            type: def.type,
            defaultValue: def.defaultValue
          };
        }
      }
    }

    return metadata;
  `);

  sendProgress({ status: 'Component metadata retrieved successfully' });
  return result.result;
}

/**
 * Tool 7: get_component_variants
 * Get all variants from a ComponentSet
 */
async function getComponentVariants(api, args, sendProgress) {
  const { componentSetId } = args;

  sendProgress({ status: `Fetching variants from ComponentSet ${componentSetId}...` });

  const result = await api.executeInFigma(`
    const componentSetId = "${componentSetId}";
    const componentSet = figma.getNodeById(componentSetId);

    if (!componentSet) {
      throw new Error("ComponentSet not found: " + componentSetId);
    }

    if (componentSet.type !== "COMPONENT_SET") {
      throw new Error("Node is not a ComponentSet. Found type: " + componentSet.type);
    }

    // Extract variants
    const variants = componentSet.children.map(variant => {
      // Parse variant properties from name (e.g., "State=On" -> {State: "On"})
      const properties = {};
      if (variant.name.includes('=')) {
        const pairs = variant.name.split(',').map(p => p.trim());
        pairs.forEach(pair => {
          const [key, value] = pair.split('=').map(s => s.trim());
          if (key && value) {
            properties[key] = value;
          }
        });
      }

      return {
        id: variant.id,
        name: variant.name,
        type: variant.type,
        properties: properties,
        position: {
          x: variant.x,
          y: variant.y
        },
        dimensions: {
          width: variant.width,
          height: variant.height
        },
        childCount: variant.children ? variant.children.length : 0
      };
    });

    return {
      componentSetId: componentSet.id,
      componentSetName: componentSet.name,
      totalVariants: variants.length,
      variants: variants
    };
  `);

  sendProgress({ status: `Found ${result.result.totalVariants} variants` });

  return result.result;
}

/**
 * Tool 8: get_nested_instance_tree
 * Get complete hierarchy of nested instances with properties, exposed instances, and bindings
 * Essential for understanding nested component relationships before manipulation
 */
async function getNestedInstanceTree(api, args, sendProgress) {
  const { instanceId, depth = -1 } = args;

  sendProgress({ status: `Building nested instance tree for ${instanceId}...` });

  const result = await api.executeInFigma(`
    const instanceId = "${instanceId}";
    const maxDepth = ${depth};
    const instance = figma.getNodeById(instanceId);

    if (!instance) {
      throw new Error("Instance not found: " + instanceId);
    }

    if (instance.type !== "INSTANCE") {
      throw new Error("Node is not an instance. Found type: " + instance.type);
    }

    // Recursive function to build instance tree
    function buildInstanceTree(node, currentDepth = 0) {
      const tree = {
        id: node.id,
        name: node.name,
        type: node.type
      };

      // Add main component info if instance
      if (node.type === "INSTANCE" && node.mainComponent) {
        tree.mainComponent = {
          id: node.mainComponent.id,
          name: node.mainComponent.name,
          key: node.mainComponent.key
        };
      }

      // Extract component properties (for instances)
      if (node.type === "INSTANCE" && node.componentProperties) {
        tree.properties = [];
        Object.entries(node.componentProperties).forEach(([key, value]) => {
          const propEntry = {
            key: key,
            value: value
          };

          // Determine property type from component definition
          if (node.mainComponent && node.mainComponent.componentPropertyDefinitions) {
            const propDef = node.mainComponent.componentPropertyDefinitions[key];
            if (propDef) {
              propEntry.type = propDef.type;

              // For INSTANCE_SWAP, resolve to component name
              if (propDef.type === "INSTANCE_SWAP" && typeof value === "string") {
                const swappedComp = figma.getNodeById(value);
                if (swappedComp) {
                  propEntry.componentName = swappedComp.name;
                }
              }
            }
          }

          tree.properties.push(propEntry);
        });
      }

      // Extract exposed instances
      if (node.type === "INSTANCE" && node.exposedInstances && node.exposedInstances.length > 0) {
        tree.exposedInstances = node.exposedInstances.map(expInst => {
          const expData = {
            id: expInst.id,
            name: expInst.name,
            isExposed: true
          };

          // Get exposed instance properties
          if (expInst.componentProperties) {
            expData.properties = [];
            Object.entries(expInst.componentProperties).forEach(([key, value]) => {
              const propEntry = {
                key: key,
                value: value
              };

              // Determine property type
              if (expInst.mainComponent && expInst.mainComponent.componentPropertyDefinitions) {
                const propDef = expInst.mainComponent.componentPropertyDefinitions[key];
                if (propDef) {
                  propEntry.type = propDef.type;
                }
              }

              expData.properties.push(propEntry);
            });
          }

          return expData;
        });
      }

      // Extract property bindings (componentPropertyReferences)
      if (node.componentPropertyReferences) {
        tree.propertyBindings = [];
        Object.entries(node.componentPropertyReferences).forEach(([targetField, propertyKey]) => {
          tree.propertyBindings.push({
            targetField: targetField,
            propertyKey: propertyKey
          });
        });
      }

      // Extract variable bindings
      if (node.boundVariables) {
        tree.variableBindings = [];
        Object.entries(node.boundVariables).forEach(([field, binding]) => {
          if (binding && binding.id) {
            tree.variableBindings.push({
              field: field,
              variableId: binding.id
            });
          }
        });
      }

      // Extract children (recursive traversal with depth limit)
      if (node.children && node.children.length > 0 && (maxDepth === -1 || currentDepth < maxDepth)) {
        tree.children = node.children.map(child => {
          // For instances, recursively build tree
          if (child.type === "INSTANCE") {
            return buildInstanceTree(child, currentDepth + 1);
          } else {
            // For non-instances, just return basic info
            return {
              id: child.id,
              name: child.name,
              type: child.type
            };
          }
        });
      } else if (node.children && node.children.length > 0) {
        // If depth limit reached, just list children without recursion
        tree.childrenSummary = {
          count: node.children.length,
          types: node.children.map(c => ({ name: c.name, type: c.type, id: c.id }))
        };
      }

      return tree;
    }

    const tree = buildInstanceTree(instance);

    return tree;
  `);

  sendProgress({ status: 'Instance tree built successfully' });

  return result.result;
}

module.exports = {
  get_design_system: getDesignSystem,
  get_screenshot: getScreenshot,
  get_component_structure: getComponentStructure,
  get_node_details: getNodeDetails,
  analyze_complete: analyzeComplete,
  get_components: getComponents,
  get_component_metadata: getComponentMetadata,
  get_component_variants: getComponentVariants,
  get_nested_instance_tree: getNestedInstanceTree
};
