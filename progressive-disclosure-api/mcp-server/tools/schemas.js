/**
 * MCP Tool Schemas
 *
 * JSON Schema definitions for all MCP tools
 * Defines input parameters and validation rules
 */

// READ Tools (Progressive Disclosure Layers 0-4)

const getDesignSystem = {
  name: 'get_design_system',
  description: 'Layer 0: Get complete design system audit including all variables (Primitives + Tokens with Light/Dark modes), text styles, paint styles, and effect styles. Cache this result as it is needed to resolve variable bindings from other tools.',
  inputSchema: {
    type: 'object',
    properties: {
      includeVariables: {
        type: 'boolean',
        default: true,
        description: 'Include variable collections'
      },
      includeStyles: {
        type: 'boolean',
        default: true,
        description: 'Include text/paint/effect styles'
      }
    }
  }
};

const getScreenshot = {
  name: 'get_screenshot',
  description: 'Layer 1: Capture a PNG screenshot of a Figma node. Returns path to image file with metadata (dimensions, scale).',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Figma node ID (e.g., "146:4867")'
      },
      scale: {
        type: 'number',
        default: 2,
        description: 'Retina scale multiplier (1-3)'
      },
      format: {
        type: 'string',
        enum: ['PNG', 'JPG'],
        default: 'PNG',
        description: 'Image format'
      }
    },
    required: ['nodeId']
  }
};

const getComponentStructure = {
  name: 'get_component_structure',
  description: 'Layer 2: Get component hierarchy map with node IDs. Returns tree structure showing all child components, instances, and text nodes. Use returned node IDs to drill down with get_node_details.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Root node ID to map'
      },
      depth: {
        type: 'number',
        default: -1,
        description: 'Traversal depth (-1 for unlimited, 2 for top 2 levels)'
      },
      includeText: {
        type: 'boolean',
        default: true,
        description: 'Include text content preview (first 60 characters)'
      }
    },
    required: ['nodeId']
  }
};

const getNodeDetails = {
  name: 'get_node_details',
  description: 'Layer 3: Extract detailed properties and variable bindings for a specific node. Returns dimensions, layout, fills, strokes, effects, and bound variables. Cross-reference bindings with Layer 0 (get_design_system) to resolve actual values.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Node ID to analyze'
      },
      resolveBindings: {
        type: 'boolean',
        default: false,
        description: 'Auto-resolve variable names (requires cached design system)'
      }
    },
    required: ['nodeId']
  }
};

const analyzeComplete = {
  name: 'analyze_complete',
  description: 'Layer 4: Complete workflow - runs all layers (0-3) and cross-references bindings. Returns design system, screenshot, structure, and detailed properties in one call.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Node ID to analyze'
      },
      layers: {
        type: 'array',
        items: {
          type: 'number',
          enum: [0, 1, 2, 3]
        },
        default: [0, 1, 2, 3],
        description: 'Which layers to include'
      },
      screenshotScale: {
        type: 'number',
        default: 2,
        description: 'Screenshot scale (1-3)'
      }
    },
    required: ['nodeId']
  }
};

// WRITE Tools (Component Creation & Modification)

const createComponent = {
  name: 'create_component',
  description: 'Create a new Figma component with specified properties and layout configuration.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Component name'
      },
      width: {
        type: 'number',
        description: 'Component width in pixels'
      },
      height: {
        type: 'number',
        description: 'Component height in pixels'
      },
      layoutMode: {
        type: 'string',
        enum: ['NONE', 'HORIZONTAL', 'VERTICAL'],
        default: 'NONE',
        description: 'Auto-layout mode'
      }
    },
    required: ['name']
  }
};

const createAutoLayout = {
  name: 'create_auto_layout',
  description: 'Create an auto-layout frame with specified direction, spacing, and padding.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Frame name'
      },
      direction: {
        type: 'string',
        enum: ['VERTICAL', 'HORIZONTAL'],
        description: 'Layout direction'
      },
      itemSpacing: {
        type: 'number',
        default: 0,
        description: 'Spacing between children in pixels'
      },
      padding: {
        type: 'number',
        default: 0,
        description: 'Padding on all sides in pixels'
      },
      parentId: {
        type: 'string',
        description: 'Optional parent node ID to append to'
      }
    },
    required: ['name', 'direction']
  }
};

const createTextNode = {
  name: 'create_text_node',
  description: 'Create a text node with specified content and optional text style binding.',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text content'
      },
      textStyleName: {
        type: 'string',
        description: 'Text style to apply (e.g., "Body/Medium")'
      },
      fontSize: {
        type: 'number',
        description: 'Font size in pixels if not using text style'
      },
      fontFamily: {
        type: 'string',
        default: 'DM Sans',
        description: 'Font family'
      }
    },
    required: ['text']
  }
};

const bindVariable = {
  name: 'bind_variable',
  description: 'Bind a design system variable to a node property (fills, width, padding, etc.).',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Node ID to bind to'
      },
      property: {
        type: 'string',
        enum: ['fills', 'strokes', 'width', 'height', 'cornerRadius', 'padding', 'itemSpacing'],
        description: 'Property to bind'
      },
      variableName: {
        type: 'string',
        description: 'Variable name (e.g., "Fills/card-background")'
      }
    },
    required: ['nodeId', 'property', 'variableName']
  }
};

const createInstance = {
  name: 'create_instance',
  description: 'Create an instance of an existing component.',
  inputSchema: {
    type: 'object',
    properties: {
      componentName: {
        type: 'string',
        description: 'Name of component to instance'
      },
      parentId: {
        type: 'string',
        description: 'Optional parent node ID to append to'
      },
      layoutAlign: {
        type: 'string',
        enum: ['INHERIT', 'STRETCH', 'MIN', 'CENTER', 'MAX'],
        description: 'Layout alignment within parent'
      }
    },
    required: ['componentName']
  }
};

const addChildren = {
  name: 'add_children',
  description: 'Add child nodes (instances, text, frames) to an existing parent node. Supports adding multiple children in one call.',
  inputSchema: {
    type: 'object',
    properties: {
      parentId: {
        type: 'string',
        description: 'Parent node ID to add children to'
      },
      children: {
        type: 'array',
        description: 'Array of child node specifications',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['instance', 'text', 'frame', 'rectangle'],
              description: 'Type of child node to create'
            },
            name: {
              type: 'string',
              description: 'Name for the child node'
            },
            componentId: {
              type: 'string',
              description: 'For instances: component ID to instance'
            },
            characters: {
              type: 'string',
              description: 'For text nodes: text content'
            },
            fontSize: {
              type: 'number',
              description: 'For text nodes: font size'
            },
            fontFamily: {
              type: 'string',
              description: 'For text nodes: font family'
            },
            fontStyle: {
              type: 'string',
              description: 'For text nodes: font style (Regular, Medium, Bold)'
            },
            textStyleId: {
              type: 'string',
              description: 'For text nodes: text style ID to apply (overrides fontSize, fontFamily, fontStyle if provided)'
            },
            fills: {
              type: 'array',
              description: 'Fill colors for the node'
            },
            layoutMode: {
              type: 'string',
              enum: ['NONE', 'HORIZONTAL', 'VERTICAL'],
              description: 'For frames: auto-layout mode'
            }
          },
          required: ['type', 'name']
        }
      }
    },
    required: ['parentId', 'children']
  }
};

const getComponents = {
  name: 'get_components',
  description: 'Get list of all local components in the Figma file with their IDs, names, and dimensions. Useful for discovering what components are available before creating instances.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        default: 50,
        description: 'Maximum number of components to return'
      },
      searchTerm: {
        type: 'string',
        description: 'Optional search term to filter component names'
      }
    }
  }
};

const modifyNode = {
  name: 'modify_node',
  description: 'Modify properties of an existing node including layout, appearance, and dimensions.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Node ID to modify'
      },
      properties: {
        type: 'object',
        description: 'Properties to modify',
        properties: {
          fills: {
            type: 'array',
            description: 'Fill colors (empty array for transparent)'
          },
          strokes: {
            type: 'array',
            description: 'Stroke colors'
          },
          itemSpacing: {
            type: 'number',
            description: 'Spacing between children in auto-layout'
          },
          padding: {
            type: 'number',
            description: 'Padding on all sides'
          },
          paddingLeft: {
            type: 'number',
            description: 'Left padding'
          },
          paddingRight: {
            type: 'number',
            description: 'Right padding'
          },
          paddingTop: {
            type: 'number',
            description: 'Top padding'
          },
          paddingBottom: {
            type: 'number',
            description: 'Bottom padding'
          },
          cornerRadius: {
            type: 'number',
            description: 'Corner radius'
          },
          layoutMode: {
            type: 'string',
            enum: ['NONE', 'HORIZONTAL', 'VERTICAL'],
            description: 'Auto-layout direction'
          },
          primaryAxisSizingMode: {
            type: 'string',
            enum: ['FIXED', 'AUTO'],
            description: 'Primary axis sizing'
          },
          counterAxisSizingMode: {
            type: 'string',
            enum: ['FIXED', 'AUTO'],
            description: 'Counter axis sizing'
          },
          width: {
            type: 'number',
            description: 'Node width'
          },
          height: {
            type: 'number',
            description: 'Node height'
          }
        }
      }
    },
    required: ['nodeId', 'properties']
  }
};

const addComponentProperty = {
  name: 'add_component_property',
  description: 'Add a TEXT, BOOLEAN, or INSTANCE_SWAP property to a component. Returns the property key with unique ID suffix.',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'Component node ID'
      },
      propertyName: {
        type: 'string',
        description: 'Property name (e.g., "Title", "Description")'
      },
      propertyType: {
        type: 'string',
        enum: ['TEXT', 'BOOLEAN', 'INSTANCE_SWAP'],
        description: 'Type of component property'
      },
      defaultValue: {
        description: 'Default value for the property (string for TEXT, boolean for BOOLEAN, node ID for INSTANCE_SWAP)'
      }
    },
    required: ['componentId', 'propertyName', 'propertyType', 'defaultValue']
  }
};

const bindTextToProperty = {
  name: 'bind_text_to_property',
  description: 'Bind a text node\'s characters to a component property. The text will then be editable from instances.',
  inputSchema: {
    type: 'object',
    properties: {
      textNodeId: {
        type: 'string',
        description: 'Text node ID to bind'
      },
      propertyKey: {
        type: 'string',
        description: 'Property key with unique ID suffix (e.g., "Title#4:3" from add_component_property)'
      }
    },
    required: ['textNodeId', 'propertyKey']
  }
};

const setTextTruncation = {
  name: 'set_text_truncation',
  description: 'Configure text truncation with ellipsis and maximum line limit.',
  inputSchema: {
    type: 'object',
    properties: {
      textNodeId: {
        type: 'string',
        description: 'Text node ID'
      },
      truncation: {
        type: 'string',
        enum: ['ENDING', 'DISABLED'],
        description: 'Truncation mode (ENDING = ellipsis, DISABLED = no truncation)'
      },
      maxLines: {
        type: 'number',
        description: 'Maximum number of lines before truncation (only works with ENDING mode)'
      },
      autoResize: {
        type: 'string',
        enum: ['NONE', 'HEIGHT', 'WIDTH_AND_HEIGHT'],
        description: 'Text auto-resize mode (use NONE for truncation to work)'
      }
    },
    required: ['textNodeId', 'truncation']
  }
};

const setInstanceProperties = {
  name: 'set_instance_properties',
  description: 'Update component property values on an instance. Use property keys returned from add_component_property.',
  inputSchema: {
    type: 'object',
    properties: {
      instanceId: {
        type: 'string',
        description: 'Instance node ID'
      },
      properties: {
        type: 'object',
        description: 'Object with property keys and new values (e.g., {"Title#4:3": "New Title"})',
        additionalProperties: true
      }
    },
    required: ['instanceId', 'properties']
  }
};

const createComponentVariants = {
  name: 'create_component_variants',
  description: 'Create component variants by duplicating a component, applying modifications to each variant, and combining them into a ComponentSet. Variants are automatically named using PropertyName=Value pattern.',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'Component node ID to create variants from'
      },
      variants: {
        type: 'array',
        description: 'Array of variant specifications',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Variant name following PropertyName=Value pattern (e.g., "State=Unread")'
            },
            modifications: {
              type: 'object',
              description: 'Optional modifications to apply to this variant',
              properties: {
                nodes: {
                  type: 'array',
                  description: 'Node modifications (opacity, component swaps)',
                  items: {
                    type: 'object',
                    properties: {
                      path: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Path to target node (e.g., ["Icon Container"])'
                      },
                      opacity: {
                        type: 'number',
                        description: 'Set node opacity (0.0 to 1.0)'
                      },
                      swapComponentId: {
                        type: 'string',
                        description: 'Component ID to swap nested instance to'
                      }
                    },
                    required: ['path']
                  }
                },
                textNodes: {
                  type: 'array',
                  description: 'Text node modifications (font, color)',
                  items: {
                    type: 'object',
                    properties: {
                      path: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Path to text node (e.g., ["Text Container", "Title"])'
                      },
                      fontName: {
                        type: 'object',
                        description: 'Font to apply (e.g., {"family": "DM Sans", "style": "Bold"})',
                        properties: {
                          family: { type: 'string' },
                          style: { type: 'string' }
                        }
                      },
                      fillVariableName: {
                        type: 'string',
                        description: 'Variable name to bind to text fill color (e.g., "Text/text-primary")'
                      }
                    },
                    required: ['path']
                  }
                }
              }
            }
          },
          required: ['name']
        }
      }
    },
    required: ['componentId', 'variants']
  }
};

const renameNode = {
  name: 'rename_node',
  description: 'Rename any Figma node (component, frame, instance, ComponentSet, etc.).',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Node ID to rename'
      },
      name: {
        type: 'string',
        description: 'New name for the node'
      }
    },
    required: ['nodeId', 'name']
  }
};

const createVariable = {
  name: 'create_variable',
  description: 'Create a new variable in a variable collection. Supports single-mode (Primitives) and multi-mode (Tokens with Light/Dark) variables.',
  inputSchema: {
    type: 'object',
    properties: {
      collectionName: {
        type: 'string',
        description: 'Variable collection name (e.g., "Primitives" or "Tokens")'
      },
      variableName: {
        type: 'string',
        description: 'Variable name with path (e.g., "Colors/White - 15%")'
      },
      variableType: {
        type: 'string',
        enum: ['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'],
        description: 'Variable type'
      },
      value: {
        description: 'Single value for single-mode collections (Primitives). For COLOR use {r, g, b, a}, for FLOAT use number.'
      },
      modeValues: {
        type: 'object',
        description: 'Values for multi-mode collections (Tokens). Keys are mode names (Light/Dark), values are either color objects or {alias: "VariableName"}',
        additionalProperties: true
      }
    },
    required: ['collectionName', 'variableName', 'variableType']
  }
};

const swapComponent = {
  name: 'swap_component',
  description: 'Swap a nested component instance inside a parent instance. Use this to change icons inside Icon Containers or swap any nested component.',
  inputSchema: {
    type: 'object',
    properties: {
      instanceId: {
        type: 'string',
        description: 'Parent instance node ID'
      },
      childPath: {
        type: 'array',
        items: { type: 'string' },
        description: 'Path to the container holding the instance to swap (e.g., ["Icon Container"] to access Icon Container child)'
      },
      newComponentId: {
        type: 'string',
        description: 'Component ID to swap to'
      }
    },
    required: ['instanceId', 'childPath', 'newComponentId']
  }
};

const getComponentProperties = {
  name: 'get_component_properties',
  description: 'Get all component property definitions for a component, including property keys, names, types, and default values.',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'Component node ID'
      }
    },
    required: ['componentId']
  }
};

const getInstanceProperties = {
  name: 'get_instance_properties',
  description: 'Get all available property keys and values on a component instance, including exposed nested instance properties.',
  inputSchema: {
    type: 'object',
    properties: {
      instanceId: {
        type: 'string',
        description: 'Instance node ID'
      }
    },
    required: ['instanceId']
  }
};

const deleteTextStyle = {
  name: 'delete_text_style',
  description: 'Delete a text style by name or ID. If deleting by name and multiple styles with same name exist, deletes all matches.',
  inputSchema: {
    type: 'object',
    properties: {
      styleId: {
        type: 'string',
        description: 'Text style ID to delete (takes priority over name if both provided)'
      },
      name: {
        type: 'string',
        description: 'Text style name to delete (deletes all matching styles if duplicates exist)'
      }
    }
  }
};

const createTextStyle = {
  name: 'create_text_style',
  description: 'Create a new text style with specified typography properties.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Text style name (e.g., "Body/Regular", "OTP Digit")'
      },
      fontFamily: {
        type: 'string',
        description: 'Font family name (e.g., "DM Sans", "Inter")'
      },
      fontStyle: {
        type: 'string',
        description: 'Font style (e.g., "Regular", "Medium", "SemiBold", "Bold")'
      },
      fontSize: {
        type: 'number',
        description: 'Font size in pixels'
      },
      lineHeight: {
        type: 'object',
        description: 'Line height configuration. Examples: {"unit":"AUTO"} or {"unit":"PERCENT","value":140} or {"unit":"PIXELS","value":22.4}',
        properties: {
          unit: {
            type: 'string',
            enum: ['AUTO', 'PIXELS', 'PERCENT'],
            description: 'Line height unit type'
          },
          value: {
            type: 'number',
            description: 'Line height value (required for PIXELS and PERCENT units)'
          }
        },
        required: ['unit']
      },
      letterSpacing: {
        type: 'object',
        description: 'Letter spacing configuration. Example: {"unit":"PERCENT","value":0}',
        properties: {
          unit: {
            type: 'string',
            enum: ['PIXELS', 'PERCENT'],
            description: 'Letter spacing unit type'
          },
          value: {
            type: 'number',
            description: 'Letter spacing value'
          }
        },
        required: ['unit', 'value']
      }
    },
    required: ['name', 'fontFamily', 'fontStyle', 'fontSize']
  }
};

// Export all schemas

function getAllSchemas() {
  return [
    // READ tools
    getDesignSystem,
    getScreenshot,
    getComponentStructure,
    getNodeDetails,
    analyzeComplete,
    getComponents,
    getComponentProperties,
    getInstanceProperties,
    // WRITE tools
    createComponent,
    createAutoLayout,
    createTextNode,
    bindVariable,
    createInstance,
    addChildren,
    modifyNode,
    swapComponent,
    renameNode,
    // COMPONENT PROPERTY tools
    addComponentProperty,
    bindTextToProperty,
    setTextTruncation,
    setInstanceProperties,
    createComponentVariants,
    createVariable,
    createTextStyle,
    deleteTextStyle
  ];
}

module.exports = {
  getAllSchemas,
  // Individual exports for reference
  getDesignSystem,
  getScreenshot,
  getComponentStructure,
  getNodeDetails,
  analyzeComplete,
  getComponents,
  getComponentProperties,
  getInstanceProperties,
  createComponent,
  createAutoLayout,
  createTextNode,
  bindVariable,
  createInstance,
  addChildren,
  modifyNode,
  swapComponent,
  renameNode,
  addComponentProperty,
  bindTextToProperty,
  setTextTruncation,
  setInstanceProperties,
  createComponentVariants,
  createVariable,
  createTextStyle,
  deleteTextStyle
};
