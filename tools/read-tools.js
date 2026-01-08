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
        id: s.id,
        fontName: s.fontName,
        fontSize: s.fontSize,
        letterSpacing: s.letterSpacing,
        lineHeight: s.lineHeight
      })) : [],
      paintStyles: ${includeStyles} ? paintStyles.map(s => ({
        name: s.name,
        id: s.id,
        paints: s.paints,
        description: s.description
      })) : [],
      effectStyles: ${includeStyles} ? effectStyles.map(s => ({
        name: s.name,
        id: s.id,
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

/**
 * Tool 10: find_nodes_by_name
 * Search for nodes by name pattern with wildcard and regex support
 * Core GYOC-enabling tool for autonomous node discovery
 */
async function findNodesByName(api, args, sendProgress) {
  const {
    searchTerm,
    nodeType = null,
    scope = 'page',
    parentId = null,
    limit = 50
  } = args;

  if (!searchTerm) {
    throw {
      code: -32602,
      message: 'Missing required parameter: searchTerm'
    };
  }

  sendProgress({ status: `Searching for nodes matching "${searchTerm}"...` });

  // Serialize parameters for Figma script
  const searchTermEscaped = searchTerm.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const result = await api.executeInFigma(`
    const searchTerm = "${searchTermEscaped}";
    const nodeType = ${nodeType ? `"${nodeType}"` : 'null'};
    const scope = "${scope}";
    const parentId = ${parentId ? `"${parentId}"` : 'null'};
    const maxLimit = ${limit};

    // Helper: Convert wildcard pattern to regex
    function wildcardToRegex(pattern) {
      // Check if pattern looks like a regex (starts with ^ or ends with $ or contains unescaped special chars)
      const isRegex = pattern.startsWith('^') || pattern.endsWith('$') || /[.+?|\\[\\]{}()]/.test(pattern.replace(/\\*/g, ''));

      if (isRegex) {
        try {
          return new RegExp(pattern, 'i');
        } catch (e) {
          // If regex is invalid, fall back to exact match
          return null;
        }
      }

      // Has wildcards - convert to regex
      if (pattern.includes('*')) {
        const escaped = pattern.replace(/[.+?^$()|[\\]\\\\]/g, '\\\\$&');
        const regex = escaped.replace(/\\*/g, '.*');
        return new RegExp('^' + regex + '$', 'i');
      }

      // No wildcards - return null to use exact match
      return null;
    }

    // Helper: Test if node name matches pattern
    function matchesPattern(nodeName, pattern) {
      const regex = wildcardToRegex(pattern);

      if (regex) {
        return regex.test(nodeName);
      }

      // Exact match (case-insensitive)
      return nodeName.toLowerCase() === pattern.toLowerCase();
    }

    // Determine search root
    let searchRoot;
    if (scope === 'document') {
      searchRoot = figma.root;
    } else if (scope === 'parent' && parentId) {
      searchRoot = figma.getNodeById(parentId);
      if (!searchRoot) {
        throw new Error(\`Parent node not found: \${parentId}\`);
      }
    } else if (scope === 'selection') {
      // For selection, we'll handle differently below
      searchRoot = null;
    } else {
      // Default: page scope
      searchRoot = figma.currentPage;
    }

    // Find matching nodes
    let allMatches = [];

    if (scope === 'selection') {
      // Search within selected nodes
      for (const selected of figma.currentPage.selection) {
        const matches = selected.findAll(node => {
          const nameMatches = matchesPattern(node.name, searchTerm);
          const typeMatches = !nodeType || node.type === nodeType;
          return nameMatches && typeMatches;
        });
        allMatches = allMatches.concat(matches);
      }
    } else if (searchRoot) {
      // Normal search
      allMatches = searchRoot.findAll(node => {
        const nameMatches = matchesPattern(node.name, searchTerm);
        const typeMatches = !nodeType || node.type === nodeType;
        return nameMatches && typeMatches;
      });
    }

    // Limit results
    const limitedMatches = maxLimit > 0 ? allMatches.slice(0, maxLimit) : allMatches;

    // Map to return structure
    const matches = limitedMatches.map(node => {
      const info = {
        id: node.id,
        name: node.name,
        type: node.type
      };

      // Add parent info if available
      if (node.parent) {
        info.parentId = node.parent.id;
        info.parentName = node.parent.name;
      }

      // Add page info
      let current = node;
      while (current && current.type !== 'PAGE') {
        current = current.parent;
      }
      if (current) {
        info.pageId = current.id;
        info.pageName = current.name;
      }

      // Add position and size if available
      if ('x' in node) info.x = node.x;
      if ('y' in node) info.y = node.y;
      if ('width' in node) info.width = node.width;
      if ('height' in node) info.height = node.height;

      return info;
    });

    return {
      matches,
      totalMatches: allMatches.length,
      returnedMatches: matches.length,
      searchTerm,
      scope,
      nodeType: nodeType || 'all',
      limited: allMatches.length > maxLimit
    };
  `);

  const resultData = result.result;
  sendProgress({
    status: `Found ${resultData.totalMatches} matches (returning ${resultData.returnedMatches})`
  });

  return resultData;
}

/**
 * Tool 11: validate_responsive_layout
 * Validate responsive sizing patterns and identify layout issues
 */
async function validateResponsiveLayout(api, args, sendProgress) {
  const {
    nodeId,
    checkOverflow = true,
    checkSizingModes = true,
    checkAlignment = true,
    recursive = true
  } = args;

  if (!nodeId) {
    throw {
      code: -32602,
      message: 'Missing required parameter: nodeId'
    };
  }

  sendProgress({
    status: `Validating responsive layout for node ${nodeId}...`
  });

  const result = await api.executeInFigma(`
    const rootNode = figma.getNodeById("${nodeId}");
    if (!rootNode) {
      throw new Error("Node not found: ${nodeId}");
    }

    const checkOverflow = ${checkOverflow};
    const checkSizingModes = ${checkSizingModes};
    const checkAlignment = ${checkAlignment};
    const recursive = ${recursive};

    const issues = [];
    let totalNodesChecked = 0;

    /**
     * Validate a single node and its children
     */
    function validateNode(node, depth = 0) {
      totalNodesChecked++;

      // Skip non-container nodes
      if (!node.children || node.children.length === 0) {
        return;
      }

      const isAutoLayout = node.layoutMode && node.layoutMode !== 'NONE';
      const isVertical = node.layoutMode === 'VERTICAL';
      const isHorizontal = node.layoutMode === 'HORIZONTAL';

      // Check each child
      for (const child of node.children) {
        // Check 1: Overflow Detection
        if (checkOverflow && isAutoLayout) {
          checkOverflowIssues(node, child);
        }

        // Check 2: Sizing Mode Validation (Flexbox Fractal Pattern)
        if (checkSizingModes && isAutoLayout) {
          checkSizingModeIssues(node, child, isVertical, isHorizontal);
        }

        // Check 3: Alignment Validation
        if (checkAlignment && isAutoLayout) {
          checkAlignmentIssues(node, child, isVertical, isHorizontal);
        }

        // Recurse into child if enabled
        if (recursive && child.children && child.children.length > 0) {
          validateNode(child, depth + 1);
        }
      }
    }

    /**
     * Check for overflow issues
     */
    function checkOverflowIssues(parent, child) {
      // Only check if parent has FIXED sizing
      const parentHasFixedWidth = parent.primaryAxisSizingMode === 'FIXED' && parent.layoutMode === 'HORIZONTAL';
      const parentHasFixedHeight = parent.counterAxisSizingMode === 'FIXED' && parent.layoutMode === 'VERTICAL';

      if (parent.layoutMode === 'VERTICAL' && parentHasFixedHeight) {
        // Check if child height causes overflow
        const childHeight = child.height || 0;
        const parentHeight = parent.height || 0;
        const parentPadding = (parent.paddingTop || 0) + (parent.paddingBottom || 0);
        const availableHeight = parentHeight - parentPadding;

        if (childHeight > availableHeight) {
          issues.push({
            nodeId: child.id,
            nodeName: child.name,
            parentId: parent.id,
            parentName: parent.name,
            issue: 'OVERFLOW',
            severity: 'medium',
            description: \`Content height (\${Math.round(childHeight)}px) exceeds container (\${Math.round(availableHeight)}px)\`,
            recommendation: \`Set parent counterAxisSizingMode to 'AUTO' or reduce child height\`,
            context: {
              childHeight: Math.round(childHeight),
              parentHeight: Math.round(parentHeight),
              availableHeight: Math.round(availableHeight)
            }
          });
        }
      }

      if (parent.layoutMode === 'HORIZONTAL' && parentHasFixedWidth) {
        // Check if child width causes overflow
        const childWidth = child.width || 0;
        const parentWidth = parent.width || 0;
        const parentPadding = (parent.paddingLeft || 0) + (parent.paddingRight || 0);
        const availableWidth = parentWidth - parentPadding;

        if (childWidth > availableWidth) {
          issues.push({
            nodeId: child.id,
            nodeName: child.name,
            parentId: parent.id,
            parentName: parent.name,
            issue: 'OVERFLOW',
            severity: 'medium',
            description: \`Content width (\${Math.round(childWidth)}px) exceeds container (\${Math.round(availableWidth)}px)\`,
            recommendation: \`Set parent primaryAxisSizingMode to 'AUTO' or reduce child width\`,
            context: {
              childWidth: Math.round(childWidth),
              parentWidth: Math.round(parentWidth),
              availableWidth: Math.round(availableWidth)
            }
          });
        }
      }
    }

    /**
     * Check for incorrect sizing modes (Flexbox Fractal Pattern violations)
     */
    function checkSizingModeIssues(parent, child, isVertical, isHorizontal) {
      const childHorizontalSizing = child.layoutSizingHorizontal || 'HUG';
      const childVerticalSizing = child.layoutSizingVertical || 'HUG';

      // Flexbox Fractal Pattern rules:
      // VERTICAL parent → children should be FILL/HUG
      // HORIZONTAL parent → children should be HUG/FILL

      if (isVertical) {
        // Expected: FILL width, HUG height
        if (childHorizontalSizing === 'FIXED') {
          issues.push({
            nodeId: child.id,
            nodeName: child.name,
            parentId: parent.id,
            parentName: parent.name,
            issue: 'INCORRECT_SIZING',
            severity: 'low',
            description: \`VERTICAL container child has FIXED width instead of FILL (less responsive)\`,
            recommendation: \`Change layoutSizingHorizontal to 'FILL' for responsive width\`,
            context: {
              parentMode: 'VERTICAL',
              currentHorizontal: childHorizontalSizing,
              currentVertical: childVerticalSizing,
              expectedHorizontal: 'FILL',
              expectedVertical: 'HUG'
            }
          });
        }

        if (childVerticalSizing === 'FILL') {
          issues.push({
            nodeId: child.id,
            nodeName: child.name,
            parentId: parent.id,
            parentName: parent.name,
            issue: 'INCORRECT_SIZING',
            severity: 'medium',
            description: \`VERTICAL container child has FILL height (may cause overflow or unexpected behavior)\`,
            recommendation: \`Change layoutSizingVertical to 'HUG' to respect content height\`,
            context: {
              parentMode: 'VERTICAL',
              currentHorizontal: childHorizontalSizing,
              currentVertical: childVerticalSizing,
              expectedHorizontal: 'FILL',
              expectedVertical: 'HUG'
            }
          });
        }
      }

      if (isHorizontal) {
        // Expected: HUG width, FILL height
        if (childHorizontalSizing === 'FILL') {
          issues.push({
            nodeId: child.id,
            nodeName: child.name,
            parentId: parent.id,
            parentName: parent.name,
            issue: 'INCORRECT_SIZING',
            severity: 'medium',
            description: \`HORIZONTAL container child has FILL width (may cause overflow or unexpected behavior)\`,
            recommendation: \`Change layoutSizingHorizontal to 'HUG' to respect content width\`,
            context: {
              parentMode: 'HORIZONTAL',
              currentHorizontal: childHorizontalSizing,
              currentVertical: childVerticalSizing,
              expectedHorizontal: 'HUG',
              expectedVertical: 'FILL'
            }
          });
        }

        if (childVerticalSizing === 'FIXED') {
          issues.push({
            nodeId: child.id,
            nodeName: child.name,
            parentId: parent.id,
            parentName: parent.name,
            issue: 'INCORRECT_SIZING',
            severity: 'low',
            description: \`HORIZONTAL container child has FIXED height instead of FILL (less responsive)\`,
            recommendation: \`Change layoutSizingVertical to 'FILL' for responsive height\`,
            context: {
              parentMode: 'HORIZONTAL',
              currentHorizontal: childHorizontalSizing,
              currentVertical: childVerticalSizing,
              expectedHorizontal: 'HUG',
              expectedVertical: 'FILL'
            }
          });
        }
      }
    }

    /**
     * Check for alignment anti-patterns
     */
    function checkAlignmentIssues(parent, child, isVertical, isHorizontal) {
      // Check for common misalignment patterns
      const childLayoutAlign = child.layoutAlign;
      const childHorizontalSizing = child.layoutSizingHorizontal || 'HUG';
      const childVerticalSizing = child.layoutSizingVertical || 'HUG';

      // If child has FILL sizing, STRETCH alignment is redundant
      if (isVertical && childHorizontalSizing === 'FILL' && childLayoutAlign === 'STRETCH') {
        issues.push({
          nodeId: child.id,
          nodeName: child.name,
          parentId: parent.id,
          parentName: parent.name,
          issue: 'REDUNDANT_ALIGNMENT',
          severity: 'low',
          description: \`Child has FILL width with STRETCH alignment (redundant)\`,
          recommendation: \`Change layoutAlign to 'INHERIT' or remove FILL sizing\`,
          context: {
            layoutAlign: childLayoutAlign,
            horizontalSizing: child.layoutSizingHorizontal
          }
        });
      }

      if (isHorizontal && childVerticalSizing === 'FILL' && childLayoutAlign === 'STRETCH') {
        issues.push({
          nodeId: child.id,
          nodeName: child.name,
          parentId: parent.id,
          parentName: parent.name,
          issue: 'REDUNDANT_ALIGNMENT',
          severity: 'low',
          description: \`Child has FILL height with STRETCH alignment (redundant)\`,
          recommendation: \`Change layoutAlign to 'INHERIT' or remove FILL sizing\`,
          context: {
            layoutAlign: childLayoutAlign,
            verticalSizing: child.layoutSizingVertical
          }
        });
      }
    }

    // Start validation
    validateNode(rootNode);

    // Calculate summary
    const isValid = issues.length === 0;
    const issuesBySeverity = {
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };

    return {
      isValid: isValid,
      nodeId: "${nodeId}",
      nodeName: rootNode.name,
      totalIssues: issues.length,
      totalNodesChecked: totalNodesChecked,
      issuesBySeverity: issuesBySeverity,
      issues: issues,
      validationSettings: {
        checkOverflow: checkOverflow,
        checkSizingModes: checkSizingModes,
        checkAlignment: checkAlignment,
        recursive: recursive
      }
    };
  `);

  // Handle result wrapping (executeInFigma wraps result in {result: ...})
  const validationResult = result.result || result;

  const summary = validationResult.isValid
    ? `✅ Layout valid - no issues found (${validationResult.totalNodesChecked} nodes checked)`
    : `⚠️ Found ${validationResult.totalIssues} issues (${validationResult.issuesBySeverity.high} high, ${validationResult.issuesBySeverity.medium} medium, ${validationResult.issuesBySeverity.low} low)`;

  sendProgress({ status: summary });

  return validationResult;
}

/**
 * Tool 12: get_page_structure
 * Get all top-level nodes on current page with optional children
 */
async function getPageStructure(api, args, sendProgress) {
  const { includeChildren = false } = args;

  sendProgress({ status: 'Getting page structure...' });

  const result = await api.executeInFigma(`
    const page = figma.currentPage;

    const nodes = page.children.map(node => {
      const nodeData = {
        id: node.id,
        name: node.name,
        type: node.type,
        width: node.width || 0,
        height: node.height || 0,
        x: node.x || 0,
        y: node.y || 0,
        visible: node.visible,
        locked: node.locked,
        childCount: 'children' in node ? node.children.length : 0
      };

      if (${includeChildren} && 'children' in node) {
        nodeData.children = node.children.map(child => ({
          id: child.id,
          name: child.name,
          type: child.type,
          width: child.width || 0,
          height: child.height || 0,
          childCount: 'children' in child ? child.children.length : 0
        }));
      }

      return nodeData;
    });

    return {
      pageName: page.name,
      pageId: page.id,
      nodes: nodes,
      totalNodes: nodes.length
    };
  `);

  const pageStructure = result.result || result;

  sendProgress({
    status: `Found ${pageStructure.totalNodes} top-level nodes on page "${pageStructure.pageName}"`
  });

  return pageStructure;
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
  get_nested_instance_tree: getNestedInstanceTree,
  find_nodes_by_name: findNodesByName,
  validate_responsive_layout: validateResponsiveLayout,
  get_page_structure: getPageStructure
};
