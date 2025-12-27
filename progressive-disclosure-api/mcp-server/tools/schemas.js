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

const getComponentVariants = {
  name: 'get_component_variants',
  description: 'Get all variants from a ComponentSet with their properties, IDs, and metadata. Use this to discover what variants exist before modifying or cloning them.',
  inputSchema: {
    type: 'object',
    properties: {
      componentSetId: {
        type: 'string',
        description: 'ComponentSet node ID (e.g., "231:20305")'
      }
    },
    required: ['componentSetId']
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

const editComponentProperty = {
  name: 'edit_component_property',
  description: 'Edit an existing component property definition (name, default value, or preferred values). Supports BOOLEAN, TEXT, INSTANCE_SWAP, and VARIANT property types. Returns the updated property key (which may change if the name changed).',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'Component or ComponentSet node ID'
      },
      propertyName: {
        type: 'string',
        description: 'Current property name to edit (e.g., "Title", "ShowCode")'
      },
      newDefinition: {
        type: 'object',
        description: 'New property definition. Can update defaultValue, preferredValues (for TEXT), variantOptions (for VARIANT), or rename by providing new property name as key.',
        properties: {
          defaultValue: {
            description: 'New default value (string for TEXT, boolean for BOOLEAN, node ID for INSTANCE_SWAP)'
          },
          preferredValues: {
            type: 'array',
            items: { type: 'object' },
            description: 'Preferred values for TEXT properties (array of {type: "TEXT", value: "..."})'
          },
          variantOptions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Variant options for VARIANT properties'
          }
        }
      }
    },
    required: ['componentId', 'propertyName', 'newDefinition']
  }
};

const deleteComponentProperty = {
  name: 'delete_component_property',
  description: 'Delete a component property definition from a component or component set. Returns information about the deleted property and remaining property count.',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'Component or ComponentSet node ID'
      },
      propertyName: {
        type: 'string',
        description: 'Property name to delete (e.g., "Title", "ShowCode")'
      }
    },
    required: ['componentId', 'propertyName']
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

const deleteNode = {
  name: 'delete_node',
  description: 'Delete a node from the Figma canvas. Cannot delete children of instance nodes.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Node ID to delete (e.g., "221:18055")'
      }
    },
    required: ['nodeId']
  }
};

const cloneNode = {
  name: 'clone_node',
  description: 'Clone any Figma node (component, frame, group, text, rectangle, etc.) with optional positioning and renaming. Works with all SceneNode types. Preserves all properties, children, styling, and variable bindings of the original. Useful for creating component variants, duplicating screens, or reusing element groups.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Node ID to clone - works with any node type (e.g., "231:20301")'
      },
      newName: {
        type: 'string',
        description: 'Optional new name for the cloned node'
      },
      offsetX: {
        type: 'number',
        default: 100,
        description: 'Horizontal offset from original position in pixels'
      },
      offsetY: {
        type: 'number',
        default: 0,
        description: 'Vertical offset from original position in pixels'
      }
    },
    required: ['nodeId']
  }
};

const reorderChildren = {
  name: 'reorder_children',
  description: 'Reorder children within a parent node. Supports two modes: (1) Full reorder - provide complete childOrder array with all child IDs in desired order, or (2) Single move - provide nodeId of one child and newIndex to move it to. Works with any node type that has children: ComponentSets (variants), auto-layout frames, groups, etc. Children array ordering represents z-index (index 0 = bottom/back, last index = top/front).',
  inputSchema: {
    type: 'object',
    properties: {
      parentId: {
        type: 'string',
        description: 'Parent node ID whose children to reorder (e.g., "231:20305" for ComponentSet)'
      },
      childOrder: {
        type: 'array',
        items: { type: 'string' },
        description: 'Full reorder mode: Array of all child node IDs in desired order (e.g., ["231:20303", "231:20301"] to reverse 2 variants)'
      },
      nodeId: {
        type: 'string',
        description: 'Single move mode: ID of child node to move to new position'
      },
      newIndex: {
        type: 'number',
        description: 'Single move mode: Target index (0 = bottom/back, higher = towards top/front)'
      }
    },
    required: ['parentId']
  }
};

const addVariantToComponentSet = {
  name: 'add_variant_to_component_set',
  description: 'Add a new variant to an existing ComponentSet by cloning an existing variant and optionally modifying it. Automatically appends the clone to the ComponentSet.',
  inputSchema: {
    type: 'object',
    properties: {
      componentSetId: {
        type: 'string',
        description: 'ComponentSet node ID to add variant to (e.g., "221:18176")'
      },
      sourceVariantId: {
        type: 'string',
        description: 'Existing variant node ID to clone from (e.g., "221:18053")'
      },
      variantName: {
        type: 'string',
        description: 'Name for the new variant following PropertyName=Value pattern (e.g., "State=Filled")'
      },
      position: {
        type: 'object',
        description: 'Optional position offset from source variant',
        properties: {
          x: {
            type: 'number',
            description: 'X offset in pixels (default: 400)'
          },
          y: {
            type: 'number',
            description: 'Y offset in pixels (default: 0)'
          }
        }
      },
      modifications: {
        type: 'object',
        description: 'Optional modifications to apply after cloning',
        properties: {
          textNodes: {
            type: 'array',
            description: 'Text node modifications',
            items: {
              type: 'object',
              properties: {
                path: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Path to text node (e.g., ["Placeholder"] or ["Container", "Text"])'
                },
                characters: {
                  type: 'string',
                  description: 'New text content'
                },
                fontName: {
                  type: 'object',
                  description: 'Font to apply',
                  properties: {
                    family: { type: 'string' },
                    style: { type: 'string' }
                  }
                }
              },
              required: ['path']
            }
          },
          nodes: {
            type: 'array',
            description: 'General node modifications',
            items: {
              type: 'object',
              properties: {
                path: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Path to target node'
                },
                opacity: {
                  type: 'number',
                  description: 'Set opacity (0.0 to 1.0)'
                },
                visible: {
                  type: 'boolean',
                  description: 'Set visibility'
                }
              },
              required: ['path']
            }
          }
        }
      }
    },
    required: ['componentSetId', 'sourceVariantId', 'variantName']
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

const bindPropertyReference = {
  name: 'bind_property_reference',
  description: 'Bind a node property (visible, opacity, etc.) to a component property. Used to make properties controllable from component instances.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Node ID whose property should be bound'
      },
      nodeProperty: {
        type: 'string',
        enum: ['visible', 'opacity', 'mainComponent'],
        description: 'Node property to bind (visible for BOOLEAN properties, opacity for NUMBER properties, mainComponent for INSTANCE_SWAP)'
      },
      componentPropertyKey: {
        type: 'string',
        description: 'Component property key with ID suffix (e.g., "ShowCode#228:93" from add_component_property)'
      }
    },
    required: ['nodeId', 'nodeProperty', 'componentPropertyKey']
  }
};

const importImageFromUrl = {
  name: 'import_image_from_url',
  description: 'Import an image from a URL into Figma. Returns image hash and dimensions. Works with PNG, JPEG, GIF (max 4096px). Use for icons, flags, avatars, photos, etc.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Image URL (must be PNG, JPEG, or GIF)'
      },
      name: {
        type: 'string',
        description: 'Name/identifier for this image (for reference)'
      }
    },
    required: ['url', 'name']
  }
};

const createImageComponent = {
  name: 'create_image_component',
  description: 'Complete workflow: import image from URL, create rectangle with image fill, convert to component. One-step solution for creating image-based components.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Image URL (PNG, JPEG, or GIF)'
      },
      componentName: {
        type: 'string',
        description: 'Component name (e.g., "Flag/Indonesia", "Icon/Search")'
      },
      width: {
        type: 'number',
        description: 'Component width in pixels. If not specified, uses image width from getSizeAsync()'
      },
      height: {
        type: 'number',
        description: 'Component height in pixels. If not specified, uses image height from getSizeAsync()'
      },
      maxWidth: {
        type: 'number',
        description: 'Maximum width - if image is larger, scales down proportionally'
      },
      maxHeight: {
        type: 'number',
        description: 'Maximum height - if image is larger, scales down proportionally'
      },
      scaleMode: {
        type: 'string',
        enum: ['FILL', 'FIT', 'CROP', 'TILE'],
        description: 'How image should scale within rectangle',
        default: 'FILL'
      },
      cornerRadius: {
        type: 'number',
        description: 'Corner radius in pixels (optional)',
        default: 0
      }
    },
    required: ['url', 'componentName']
  }
};

const batchCreateImageComponents = {
  name: 'batch_create_image_components',
  description: 'Batch create multiple image components from URLs. Optionally combine into ComponentSet with variants. Efficient for creating icon sets, flag sets, avatar sets, etc.',
  inputSchema: {
    type: 'object',
    properties: {
      images: {
        type: 'array',
        description: 'Array of image specifications',
        items: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Image URL'
            },
            name: {
              type: 'string',
              description: 'Component name (used for variant value if creating ComponentSet)'
            },
            width: {
              type: 'number',
              description: 'Width in pixels. If not specified, uses image width'
            },
            height: {
              type: 'number',
              description: 'Height in pixels. If not specified, uses image height'
            },
            maxWidth: {
              type: 'number',
              description: 'Maximum width - scales down proportionally if exceeded'
            },
            maxHeight: {
              type: 'number',
              description: 'Maximum height - scales down proportionally if exceeded'
            }
          },
          required: ['url', 'name']
        }
      },
      createComponentSet: {
        type: 'boolean',
        description: 'Whether to combine all components into a ComponentSet (default: false)',
        default: false
      },
      variantProperty: {
        type: 'string',
        description: 'Variant property name if creating ComponentSet (e.g., "Country", "Icon", "Type")',
        default: 'Type'
      },
      scaleMode: {
        type: 'string',
        enum: ['FILL', 'FIT', 'CROP', 'TILE'],
        description: 'Image scale mode for all components (default: FILL)',
        default: 'FILL'
      },
      cornerRadius: {
        type: 'number',
        description: 'Corner radius for all components (default: 0)',
        default: 0
      }
    },
    required: ['images']
  }
};

const executeFigmaScript = {
  name: 'execute_figma_script',
  description: 'Execute arbitrary Figma Plugin API code. Use this for custom operations, complex workflows, or when existing tools don\'t cover your needs. The script runs in the Figma plugin context with full API access.',
  inputSchema: {
    type: 'object',
    properties: {
      script: {
        type: 'string',
        description: 'JavaScript code to execute in Figma. Has access to full Figma Plugin API (figma.*). Can use async/await. Must return a value (will be serialized to JSON).'
      },
      description: {
        type: 'string',
        description: 'Optional description of what the script does (for logging/debugging)'
      }
    },
    required: ['script']
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
    getComponentVariants,
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
    editComponentProperty,
    deleteComponentProperty,
    bindTextToProperty,
    bindPropertyReference,
    setTextTruncation,
    setInstanceProperties,
    createComponentVariants,
    addVariantToComponentSet,
    createVariable,
    createTextStyle,
    deleteTextStyle,
    deleteNode,
    cloneNode,
    reorderChildren,
    // IMAGE tools
    importImageFromUrl,
    createImageComponent,
    batchCreateImageComponents,
    // UTILITY tools
    executeFigmaScript
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
  getComponentVariants,
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
  editComponentProperty,
  deleteComponentProperty,
  bindTextToProperty,
  bindPropertyReference,
  setTextTruncation,
  setInstanceProperties,
  createComponentVariants,
  addVariantToComponentSet,
  createVariable,
  createTextStyle,
  deleteTextStyle,
  deleteNode,
  cloneNode,
  reorderChildren,
  importImageFromUrl,
  createImageComponent,
  batchCreateImageComponents
};
