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

const convertToComponent = {
  name: 'convert_to_component',
  description: 'Convert an existing node (frame, group, etc.) into a component with full design system integration. Supports component properties, auto-exposing instances, variable bindings, and style application. Most powerful design-to-component workflow.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Node ID to convert to component'
      },
      componentName: {
        type: 'string',
        description: 'Optional: Rename component (defaults to current node name)'
      },
      description: {
        type: 'string',
        description: 'Optional: Component description for documentation'
      },
      moveToComponentsPage: {
        type: 'boolean',
        default: false,
        description: 'Move component to Components page (creates page if doesn\'t exist)'
      },
      componentProperties: {
        type: 'array',
        description: 'Optional: Add component properties (TEXT, BOOLEAN, INSTANCE_SWAP) with auto-binding to nodes',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Property display name (e.g., "Label", "ShowIcon")'
            },
            type: {
              type: 'string',
              enum: ['TEXT', 'BOOLEAN', 'INSTANCE_SWAP', 'VARIANT'],
              description: 'Property type'
            },
            defaultValue: {
              description: 'Default value (string for TEXT, boolean for BOOLEAN, null for INSTANCE_SWAP)'
            },
            bindToNode: {
              description: 'Optional: Auto-bind to node. Can be ["path", "to", "node"], nodeId string, or "$self". TEXT binds to characters, BOOLEAN to visible, INSTANCE_SWAP to mainComponent'
            }
          },
          required: ['name', 'type', 'defaultValue']
        }
      },
      autoExposeInstances: {
        type: 'boolean',
        default: false,
        description: 'Automatically expose all nested instances for swapping at parent level'
      },
      exposeInstances: {
        type: 'array',
        description: 'Selectively expose specific nested instances by path (alternative to autoExposeInstances)',
        items: {
          type: 'array',
          description: 'Path to instance as array of names, e.g., ["Icon Container", "Icon"]'
        }
      },
      variableBindings: {
        type: 'array',
        description: 'Bind design system variables to node properties (fills, strokes, dimensions, etc.)',
        items: {
          type: 'object',
          properties: {
            nodePath: {
              description: 'Path to target node: "$self" for component, nodeId string, or ["path", "to", "node"] array'
            },
            property: {
              type: 'string',
              description: 'Property to bind: fills, strokes, width, height, cornerRadius, opacity, itemSpacing, paddingTop, paddingRight, paddingBottom, paddingLeft, etc.'
            },
            variableName: {
              type: 'string',
              description: 'Variable name from design system (e.g., "Colors/Primary", "Radius/button")'
            }
          },
          required: ['property', 'variableName']
        }
      },
      textStyles: {
        type: 'array',
        description: 'Apply text styles to text nodes',
        items: {
          type: 'object',
          properties: {
            nodePath: {
              description: 'Path to text node: "$self", nodeId, or ["path", "to", "node"]'
            },
            textStyleId: {
              type: 'string',
              description: 'Text style ID (e.g., "S:abc123")'
            },
            textStyleName: {
              type: 'string',
              description: 'Or lookup by name (e.g., "Heading/H3")'
            }
          },
          required: ['nodePath']
        }
      },
      effectStyleId: {
        type: 'string',
        description: 'Apply effect style (shadow, blur) to component itself'
      },
      effects: {
        type: 'array',
        description: 'Apply effect styles to specific child nodes',
        items: {
          type: 'object',
          properties: {
            nodePath: {
              description: 'Path to target node'
            },
            effectStyleId: {
              type: 'string',
              description: 'Effect style ID'
            }
          },
          required: ['nodePath', 'effectStyleId']
        }
      },
      fillStyleId: {
        type: 'string',
        description: 'Apply fill style to component itself'
      },
      strokeStyleId: {
        type: 'string',
        description: 'Apply stroke style to component itself'
      }
    },
    required: ['nodeId']
  }
};

const createAutoLayout = {
  name: 'create_auto_layout',
  description: 'Create an auto-layout frame with specified direction, spacing, padding, and dimensions.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Frame name',
        default: 'Auto Layout Frame'
      },
      layoutMode: {
        type: 'string',
        enum: ['VERTICAL', 'HORIZONTAL'],
        description: 'Layout direction',
        default: 'HORIZONTAL'
      },
      width: {
        type: 'number',
        description: 'Frame width in pixels',
        default: 100
      },
      height: {
        type: 'number',
        description: 'Frame height in pixels',
        default: 100
      },
      primaryAxisSizingMode: {
        type: 'string',
        enum: ['FIXED', 'AUTO'],
        description: 'Sizing mode along layout direction (FIXED = respect width/height, AUTO = hug contents)',
        default: 'AUTO'
      },
      counterAxisSizingMode: {
        type: 'string',
        enum: ['FIXED', 'AUTO'],
        description: 'Sizing mode perpendicular to layout direction (FIXED = respect width/height, AUTO = hug contents)',
        default: 'AUTO'
      },
      itemSpacing: {
        type: 'number',
        default: 8,
        description: 'Spacing between children in pixels'
      },
      padding: {
        type: 'number',
        default: 16,
        description: 'Padding on all sides in pixels (overridden by individual padding properties)'
      },
      paddingLeft: {
        type: 'number',
        description: 'Left padding in pixels'
      },
      paddingRight: {
        type: 'number',
        description: 'Right padding in pixels'
      },
      paddingTop: {
        type: 'number',
        description: 'Top padding in pixels'
      },
      paddingBottom: {
        type: 'number',
        description: 'Bottom padding in pixels'
      },
      fills: {
        type: 'array',
        description: 'Fill paints. Supports SOLID and GRADIENT types with variable bindings. CSS-like alpha: [{type: "SOLID", color: {r: 0.1, g: 0.1, b: 0.15, a: 0.8}}]. For gradients with variables: [{type: "GRADIENT_LINEAR", gradientStops: [{position: 0, color: {r:1,g:1,b:1,a:1}, boundVariables: {color: {type: "VARIABLE_ALIAS", id: "VariableID:123:456"}}}], gradientTransform: [[1,0,0],[0,1,0]]}]. Tip: Use apply_gradient_fill with colorVariables for easier gradient variable binding.',
        default: []
      },
      cornerRadius: {
        type: 'number',
        description: 'Corner radius in pixels',
        default: 0
      },
      x: {
        type: 'number',
        description: 'X position in pixels (optional, defaults to viewport center)'
      },
      y: {
        type: 'number',
        description: 'Y position in pixels (optional, defaults to viewport center)'
      }
    },
    required: []
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

const batchBindVariables = {
  name: 'batch_bind_variables',
  description: 'WORKFLOW: Bind variables to multiple nodes in a single operation. Reduces API calls by processing all bindings in one executeInFigma call. Use for bulk variable binding operations.',
  inputSchema: {
    type: 'object',
    properties: {
      bindings: {
        type: 'array',
        description: 'Array of binding specifications',
        items: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: 'Node ID to bind variable to'
            },
            variableName: {
              type: 'string',
              description: 'Variable name to bind'
            },
            property: {
              type: 'string',
              description: 'Property to bind (fills, strokes, width, height, opacity, etc.)'
            }
          },
          required: ['nodeId', 'variableName', 'property']
        }
      }
    },
    required: ['bindings']
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

const createMultipleInstances = {
  name: 'create_multiple_instances',
  description: 'Create multiple instances of a component with automatic layout positioning. Supports two modes: (1) Simple mode - specify count and get auto-positioned identical instances. (2) Advanced mode - provide instanceConfigs array with custom positioning and properties per instance. Enables 10x faster instance creation compared to calling create_instance repeatedly.',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'Component ID to create instances from (e.g., "7:113")'
      },
      count: {
        type: 'number',
        description: 'Simple mode: Number of instances to create (e.g., 10). Ignored if instanceConfigs is provided.'
      },
      parentId: {
        type: 'string',
        description: 'Optional: Parent node ID to append instances to. If omitted, uses current page.'
      },
      layout: {
        type: 'string',
        enum: ['vertical', 'horizontal', 'grid'],
        description: 'Simple mode: Layout algorithm for positioning instances. Default: "vertical"',
        default: 'vertical'
      },
      spacing: {
        type: 'number',
        description: 'Simple mode: Spacing between instances in pixels. Default: 16',
        default: 16
      },
      columns: {
        type: 'number',
        description: 'Grid layout: Number of columns. Default: 3',
        default: 3
      },
      namingPattern: {
        type: 'string',
        description: 'Simple mode: Naming pattern with variables: {componentName}, {index} (1-based), {index0} (0-based). Example: "{componentName} {index}" produces "Post 1", "Post 2". Default: "{componentName} {index}"',
        default: '{componentName} {index}'
      },
      instanceConfigs: {
        type: 'array',
        description: 'Advanced mode: Array of instance configurations with custom positioning and properties. Takes precedence over simple mode.',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Instance name (optional, uses namingPattern if omitted)'
            },
            x: {
              type: 'number',
              description: 'X position in pixels (optional, uses layout calculation if omitted)'
            },
            y: {
              type: 'number',
              description: 'Y position in pixels (optional, uses layout calculation if omitted)'
            },
            componentProperties: {
              type: 'object',
              description: 'Component properties to set on this instance (e.g., {username: "user1", content: "Hello"})',
              additionalProperties: true
            }
          }
        }
      }
    },
    required: ['componentId']
  }
};

const applyResponsivePattern = {
  name: 'apply_responsive_pattern',
  description: 'Apply Flexbox Fractal Pattern to auto-layout containers for responsive design. VERTICAL containers → children get layoutSizingHorizontal=FILL & layoutSizingVertical=HUG. HORIZONTAL containers → children get layoutSizingHorizontal=HUG & layoutSizingVertical=FILL. Applies recursively to all descendants. Supports explicit exceptions for nodes that need FIXED sizing (avatars, icons, images). Includes dry run mode for preview.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Root node ID to apply pattern to (must be auto-layout container)'
      },
      recursive: {
        type: 'boolean',
        description: 'Apply pattern recursively to all descendant auto-layout containers',
        default: true
      },
      exceptions: {
        type: 'array',
        description: 'Array of explicit exceptions - nodes that need custom sizing instead of the pattern',
        items: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: 'Node ID to exclude from pattern'
            },
            sizing: {
              oneOf: [
                {
                  type: 'string',
                  enum: ['FIXED', 'FILL', 'HUG'],
                  description: 'Simple string applies to both horizontal and vertical (e.g., "FIXED" for avatars/icons)'
                },
                {
                  type: 'object',
                  properties: {
                    horizontal: {
                      type: 'string',
                      enum: ['FIXED', 'FILL', 'HUG'],
                      description: 'Horizontal sizing mode'
                    },
                    vertical: {
                      type: 'string',
                      enum: ['FIXED', 'FILL', 'HUG'],
                      description: 'Vertical sizing mode'
                    }
                  },
                  description: 'Object with horizontal/vertical specified separately (e.g., {horizontal: "FILL", vertical: "FIXED"} for images with aspect ratio)'
                }
              ]
            }
          },
          required: ['nodeId', 'sizing']
        },
        default: []
      },
      dryRun: {
        type: 'boolean',
        description: 'Preview changes without applying them. Returns list of changes that would be made.',
        default: false
      }
    },
    required: ['nodeId']
  }
};

const addChildren = {
  name: 'add_children',
  description: 'Add child nodes (instances, text, frames, rectangles) to an existing parent node with full auto-layout support. Supports nested children recursion, automatic responsive defaults, variable bindings, and comprehensive frame/rectangle properties. Creates complete hierarchies in one call.',
  inputSchema: {
    type: 'object',
    properties: {
      parentId: {
        type: 'string',
        description: 'Parent node ID to add children to'
      },
      children: {
        type: 'array',
        description: 'Array of child node specifications with full property support and nested children',
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
            // Instance properties
            componentId: {
              type: 'string',
              description: 'For instances: component ID to instantiate'
            },
            componentProperties: {
              type: 'object',
              description: 'For instances: Component properties to set during creation'
            },
            // Text properties
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
              description: 'For text nodes: font style. Supports all UI weight names: Thin, ExtraLight, Light, Regular, Medium, SemiBold, Bold, ExtraBold, Black. Automatically tries variations (SemiBold → Semi Bold, Semibold, Medium, etc.) to find available font style.'
            },
            textStyleId: {
              type: 'string',
              description: 'For text nodes: text style ID to apply'
            },
            textAlignHorizontal: {
              type: 'string',
              enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'],
              description: 'For text nodes: horizontal text alignment'
            },
            textAlignVertical: {
              type: 'string',
              enum: ['TOP', 'CENTER', 'BOTTOM'],
              description: 'For text nodes: vertical text alignment'
            },
            lineHeight: {
              type: 'object',
              properties: {
                unit: {
                  type: 'string',
                  enum: ['PIXELS', 'PERCENT', 'AUTO']
                },
                value: {
                  type: 'number'
                }
              },
              description: 'For text nodes: line height configuration. Example: {value: 24, unit: "PIXELS"} or {unit: "AUTO"}'
            },
            // Dimensions
            width: {
              type: 'number',
              description: 'Width in pixels (optional - prefer responsive sizing)'
            },
            height: {
              type: 'number',
              description: 'Height in pixels (optional - prefer responsive sizing)'
            },
            // Auto-layout properties
            layoutMode: {
              type: 'string',
              enum: ['NONE', 'HORIZONTAL', 'VERTICAL'],
              description: 'For frames: auto-layout direction'
            },
            itemSpacing: {
              type: 'number',
              description: 'For auto-layout frames: gap between children'
            },
            padding: {
              type: 'number',
              description: 'For auto-layout frames: unified padding on all sides'
            },
            paddingLeft: {
              type: 'number',
              description: 'For auto-layout frames: left padding'
            },
            paddingRight: {
              type: 'number',
              description: 'For auto-layout frames: right padding'
            },
            paddingTop: {
              type: 'number',
              description: 'For auto-layout frames: top padding'
            },
            paddingBottom: {
              type: 'number',
              description: 'For auto-layout frames: bottom padding'
            },
            primaryAxisAlignItems: {
              type: 'string',
              enum: ['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN'],
              description: 'For auto-layout frames: main axis alignment'
            },
            counterAxisAlignItems: {
              type: 'string',
              enum: ['MIN', 'CENTER', 'MAX'],
              description: 'For auto-layout frames: cross axis alignment'
            },
            primaryAxisSizingMode: {
              type: 'string',
              enum: ['FIXED', 'AUTO'],
              description: 'For auto-layout frames: main axis sizing mode'
            },
            counterAxisSizingMode: {
              type: 'string',
              enum: ['FIXED', 'AUTO'],
              description: 'For auto-layout frames: cross axis sizing mode'
            },
            // Responsive sizing (applied to children) - Issue #27: Declarative layout sizing
            layoutSizingHorizontal: {
              type: 'string',
              enum: ['FIXED', 'HUG', 'FILL'],
              description: 'Horizontal sizing mode (applied declaratively, takes effect after appendChild). For TEXT nodes: automatically sets textAutoResize="HEIGHT" when FILL or FIXED (enables text wrapping). For frames/rectangles: standard sizing behavior. Specify upfront in child spec - automatically deferred until after parent attachment.'
            },
            layoutSizingVertical: {
              type: 'string',
              enum: ['FIXED', 'HUG', 'FILL'],
              description: 'Vertical sizing mode (applied declaratively, takes effect after appendChild). For TEXT nodes: use HUG to allow height to grow with wrapped content. For frames/rectangles: standard sizing behavior. Specify upfront in child spec - automatically deferred until after parent attachment.'
            },
            textAutoResize: {
              type: 'string',
              enum: ['WIDTH_AND_HEIGHT', 'HEIGHT', 'NONE'],
              description: 'For text nodes: controls auto-resize behavior. WIDTH_AND_HEIGHT (default)=expands to fit content, HEIGHT=fixed width with auto height (enables wrapping), NONE=fixed width and height. Automatically set to HEIGHT when layoutSizingHorizontal is FILL.'
            },
            layoutAlign: {
              type: 'string',
              enum: ['INHERIT', 'STRETCH', 'MIN', 'CENTER', 'MAX'],
              description: 'Alignment within parent auto-layout'
            },
            // Corner radius
            cornerRadius: {
              type: 'number',
              description: 'Unified corner radius for all corners'
            },
            topLeftRadius: {
              type: 'number',
              description: 'Top-left corner radius'
            },
            topRightRadius: {
              type: 'number',
              description: 'Top-right corner radius'
            },
            bottomLeftRadius: {
              type: 'number',
              description: 'Bottom-left corner radius'
            },
            bottomRightRadius: {
              type: 'number',
              description: 'Bottom-right corner radius'
            },
            // Appearance
            fills: {
              type: 'array',
              description: 'Fill paints array. Supports SOLID and GRADIENT types with variable bindings. CSS-like alpha: {r, g, b, a: 0.8}. For gradients with variables, include boundVariables in gradientStops. Tip: Use apply_gradient_fill with colorVariables for easier gradient setup.'
            },
            strokes: {
              type: 'array',
              description: 'Stroke paints array. Supports SOLID and GRADIENT types with variable bindings. CSS-like alpha: {r, g, b, a: 0.8}. For gradients with variables, include boundVariables in gradientStops.'
            },
            strokeWeight: {
              type: 'number',
              description: 'Stroke weight in pixels'
            },
            // Nested children recursion
            children: {
              type: 'array',
              description: 'Nested children array (supports full recursion with same properties)'
            },
            // Variable bindings
            bindings: {
              type: 'object',
              description: 'Variable bindings as simple strings (e.g., {"fills": "Text/text-primary", "itemSpacing": "Spacing/spacing-4"})'
            },
            // Style IDs
            effectStyleId: {
              type: 'string',
              description: 'Effect style ID to apply'
            },
            fillStyleId: {
              type: 'string',
              description: 'Fill style ID to apply'
            },
            strokeStyleId: {
              type: 'string',
              description: 'Stroke style ID to apply'
            }
          },
          required: ['type', 'name']
        }
      }
    },
    required: ['parentId', 'children']
  }
};

const wrapInContainer = {
  name: 'wrap_in_container',
  description: `Wrap existing nodes in a new auto-layout container. Bottom-up construction approach.

USAGE PATTERNS:
1. Building nested structures: Create innermost elements first, then wrap progressively
2. Container sizing: The new container auto-sizes to its parent (FILL/HUG based on parent direction)
3. Wrapped nodes sizing: Control with wrappedNodesLayout parameter

DECISION TREE FOR wrappedNodesLayout:
- Use "AUTO": When wrapping primitives (text, rectangles) or frames that should adapt responsively
- Use {layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED"}: When wrapping containers with explicit width/height that MUST be preserved (e.g., wrapping a 96×96 icon container - it should stay 96×96, not shrink to hug its children)
- Use {layoutSizingHorizontal: "HUG", layoutSizingVertical: "HUG"}: When wrapping auto-layout frames without explicit dimensions that should hug their contents

EXAMPLE BOTTOM-UP FLOW:
1. Create Icon Placeholder (56×56 rectangle)
2. Wrap in Icon Container (96×96 fixed) → wrappedNodesLayout: "AUTO" or omit
3. Wrap Icon Container in Icon Section → wrappedNodesLayout: {layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED"} to preserve 96×96 size`,
  inputSchema: {
    type: 'object',
    properties: {
      nodeIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'IDs of nodes to wrap (will be moved into new container)'
      },
      containerSpec: {
        type: 'object',
        description: 'Specification for the new container frame',
        properties: {
          name: {
            type: 'string',
            description: 'Name for the container frame'
          },
          layoutMode: {
            type: 'string',
            enum: ['HORIZONTAL', 'VERTICAL'],
            description: 'Auto-layout direction'
          },
          width: {
            type: 'number',
            description: 'Fixed width (optional - omit for responsive sizing)'
          },
          height: {
            type: 'number',
            description: 'Fixed height (optional - omit for responsive sizing)'
          },
          itemSpacing: {
            type: 'number',
            description: 'Gap between children in auto-layout'
          },
          padding: {
            type: 'number',
            description: 'Unified padding on all sides'
          },
          paddingLeft: { type: 'number' },
          paddingRight: { type: 'number' },
          paddingTop: { type: 'number' },
          paddingBottom: { type: 'number' },
          primaryAxisAlignItems: {
            type: 'string',
            enum: ['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN'],
            description: 'Main axis alignment'
          },
          counterAxisAlignItems: {
            type: 'string',
            enum: ['MIN', 'CENTER', 'MAX'],
            description: 'Cross axis alignment'
          },
          primaryAxisSizingMode: {
            type: 'string',
            enum: ['FIXED', 'AUTO']
          },
          counterAxisSizingMode: {
            type: 'string',
            enum: ['FIXED', 'AUTO']
          },
          cornerRadius: {
            type: 'number',
            description: 'Unified corner radius'
          },
          topLeftRadius: { type: 'number' },
          topRightRadius: { type: 'number' },
          bottomLeftRadius: { type: 'number' },
          bottomRightRadius: { type: 'number' },
          fills: {
            type: 'array',
            description: 'Fill paints. Supports SOLID and GRADIENT types with variable bindings. CSS-like alpha: {r, g, b, a: 0.8}. For gradients with variables, include boundVariables in gradientStops. Tip: Use apply_gradient_fill with colorVariables for easier gradient setup.'
          },
          strokes: {
            type: 'array',
            description: 'Stroke paints. Supports SOLID and GRADIENT types with variable bindings. CSS-like alpha: {r, g, b, a: 0.8}. For gradients with variables, include boundVariables in gradientStops.'
          },
          strokeWeight: {
            type: 'number'
          },
          bindings: {
            type: 'object',
            description: 'Variable bindings for container properties'
          }
        },
        required: ['name', 'layoutMode']
      },
      wrappedNodesLayout: {
        description: `Controls how wrapped nodes size themselves INSIDE the new container. CRITICAL: This is different from the container's own sizing within its parent.

WHEN TO USE EACH OPTION:
- "AUTO" (default): Responsive sizing based on container direction. VERTICAL → children FILL width/HUG height; HORIZONTAL → children HUG width/FILL height. Use for primitives or adaptable frames.

- {layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED"}: Preserves wrapped nodes' explicit dimensions. REQUIRED when wrapping containers that have explicit width/height that must not change (e.g., Icon Container 96×96 should stay 96×96 even if its child is 56×56).

- {layoutSizingHorizontal: "HUG", layoutSizingVertical: "HUG"}: Makes wrapped nodes hug their contents. Use for auto-layout frames without explicit dimensions.

COMMON MISTAKE: Using "AUTO" on a container with fixed dimensions will cause it to shrink/expand to hug its children, losing the fixed size. Use explicit FIXED sizing instead.`,
        oneOf: [
          {
            type: 'string',
            enum: ['AUTO'],
            description: 'AUTO: Smart responsive defaults - VERTICAL container → children FILL width/HUG height; HORIZONTAL container → children HUG width/FILL height. Best for primitives and adaptable frames.'
          },
          {
            type: 'object',
            properties: {
              layoutSizingHorizontal: {
                type: 'string',
                enum: ['FIXED', 'HUG', 'FILL'],
                description: 'FIXED: Keep explicit width | HUG: Shrink to content width | FILL: Expand to container width'
              },
              layoutSizingVertical: {
                type: 'string',
                enum: ['FIXED', 'HUG', 'FILL'],
                description: 'FIXED: Keep explicit height | HUG: Shrink to content height | FILL: Expand to container height'
              },
              layoutAlign: {
                type: 'string',
                enum: ['INHERIT', 'STRETCH', 'CENTER', 'MIN', 'MAX'],
                description: 'Alignment of wrapped nodes within container'
              }
            }
          }
        ]
      }
    },
    required: ['nodeIds', 'containerSpec']
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

const getComponentMetadata = {
  name: 'get_component_metadata',
  description: 'WORKFLOW: Get comprehensive component metadata including properties, description, dimensions, parent location, and variant group properties (for ComponentSets). Enhanced discovery tool.',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'Component or ComponentSet ID'
      }
    },
    required: ['componentId']
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

const getNestedInstanceTree = {
  name: 'get_nested_instance_tree',
  description: 'Get complete hierarchy of nested instances with properties, exposed instances, component relationships, and bindings. Essential for understanding nested component structures before manipulation. Returns property tree including component properties, exposed instances, property bindings, and variable bindings at each level.',
  inputSchema: {
    type: 'object',
    properties: {
      instanceId: {
        type: 'string',
        description: 'Instance node ID to analyze (e.g., "184:5659")'
      },
      depth: {
        type: 'number',
        description: 'Maximum nesting depth to traverse (-1 for unlimited, 0 for current level only). Default: -1 (unlimited)',
        default: -1
      }
    },
    required: ['instanceId']
  }
};

const findNodesByName = {
  name: 'find_nodes_by_name',
  description: 'Search for nodes by name pattern with wildcard (*) and regex support. Core GYOC-enabling tool for autonomous node discovery. Supports exact match, wildcard patterns (e.g., "Button*", "*Card"), and regex patterns. Returns nodes with parent/page context.',
  inputSchema: {
    type: 'object',
    properties: {
      searchTerm: {
        type: 'string',
        description: 'Search pattern: exact name, wildcard pattern (e.g., "Post*", "*Card", "*Button*"), or regex pattern (e.g., "^Post[0-9]+$"). Case-insensitive.'
      },
      nodeType: {
        type: 'string',
        description: 'Optional: Filter by node type (FRAME, COMPONENT, INSTANCE, TEXT, RECTANGLE, etc.). Omit to search all types.',
        enum: ['FRAME', 'COMPONENT', 'INSTANCE', 'TEXT', 'RECTANGLE', 'ELLIPSE', 'VECTOR', 'STAR', 'LINE', 'POLYGON', 'GROUP', 'BOOLEAN_OPERATION', 'SECTION', 'SLICE']
      },
      scope: {
        type: 'string',
        description: 'Search scope. Default: "page" (current page only)',
        enum: ['page', 'document', 'selection', 'parent'],
        default: 'page'
      },
      parentId: {
        type: 'string',
        description: 'Required when scope="parent". Node ID to search within.'
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return. Default: 50. Set to 0 for unlimited (use with caution on large files).',
        default: 50
      }
    },
    required: ['searchTerm']
  }
};

const validateResponsiveLayout = {
  name: 'validate_responsive_layout',
  description: 'Validate responsive sizing patterns and identify layout issues (overflow, incorrect sizing modes, misaligned elements). Checks compliance with Flexbox Fractal Pattern. Returns detailed report with severity levels and actionable recommendations.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Root node ID to validate (validates this node and all descendants)'
      },
      checkOverflow: {
        type: 'boolean',
        description: 'Check for content overflow (content exceeding container bounds)',
        default: true
      },
      checkSizingModes: {
        type: 'boolean',
        description: 'Validate sizing modes against Flexbox Fractal Pattern (VERTICAL → FILL/HUG, HORIZONTAL → HUG/FILL)',
        default: true
      },
      checkAlignment: {
        type: 'boolean',
        description: 'Check for alignment anti-patterns (e.g., redundant STRETCH with FILL sizing)',
        default: true
      },
      recursive: {
        type: 'boolean',
        description: 'Recursively validate all descendant nodes',
        default: true
      }
    },
    required: ['nodeId']
  }
};

const getPageStructure = {
  name: 'get_page_structure',
  description: 'Get all top-level nodes on current page with optional children. Quick page overview without requiring nodeId upfront. Returns page info and all top-level nodes with their properties.',
  inputSchema: {
    type: 'object',
    properties: {
      includeChildren: {
        type: 'boolean',
        description: 'Include first-level children of each top-level node',
        default: false
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
            description: 'Fill paints (supports SOLID and GRADIENT types: GRADIENT_LINEAR, GRADIENT_RADIAL, GRADIENT_ANGULAR, GRADIENT_DIAMOND with variable bindings). CSS-like alpha: {r, g, b, a: 0.8}. For gradients with variables, include boundVariables in gradientStops: [{position: 0, color: {r:1,g:1,b:1,a:1}, boundVariables: {color: {type: "VARIABLE_ALIAS", id: "VariableID:123"}}}]. Must include gradientStops and gradientTransform. Empty array for transparent. Tip: Use apply_gradient_fill with colorVariables for easier gradient setup.'
          },
          strokes: {
            type: 'array',
            description: 'Stroke paints (supports SOLID and GRADIENT types with variable bindings). For gradients with variables, include boundVariables in gradientStops.'
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

const batchModifyNodes = {
  name: 'batch_modify_nodes',
  description: 'WORKFLOW: Modify multiple nodes in a single operation. Reduces API calls by processing all modifications in one executeInFigma call. Use for bulk node property updates.',
  inputSchema: {
    type: 'object',
    properties: {
      modifications: {
        type: 'array',
        description: 'Array of modification specifications',
        items: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: 'Node ID to modify'
            },
            properties: {
              type: 'object',
              description: 'Properties to modify (fills, strokes, opacity, visible, locked, cornerRadius, layoutMode, itemSpacing, padding, etc.)'
            }
          },
          required: ['nodeId', 'properties']
        }
      }
    },
    required: ['modifications']
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

const swapInstanceComponent = {
  name: 'swap_instance_component',
  description: 'Swap a top-level instance to a different component while preserving overrides. Unlike swap_component which handles nested instances, this tool swaps the instance itself. Uses swapComponent() method which preserves all component property overrides, variable bindings, and custom modifications.',
  inputSchema: {
    type: 'object',
    properties: {
      instanceId: {
        type: 'string',
        description: 'Instance node ID to swap (must be type INSTANCE)'
      },
      newComponentId: {
        type: 'string',
        description: 'Component or ComponentSet ID to swap to'
      }
    },
    required: ['instanceId', 'newComponentId']
  }
};

const batchApplyImages = {
  name: 'batch_apply_images',
  description: 'Apply images to multiple nodes efficiently in a single batch operation. Imports all images in parallel using Promise.all(), then applies them to nodes. Reduces API calls by 75-95% compared to calling apply_image_fill multiple times. Returns detailed success/error report for each operation.',
  inputSchema: {
    type: 'object',
    properties: {
      imageSpecs: {
        type: 'array',
        description: 'Array of image specifications to apply',
        items: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: 'Node ID to apply image to'
            },
            imageUrl: {
              type: 'string',
              description: 'Image URL (PNG, JPG, or GIF, max 4096x4096px)'
            },
            scaleMode: {
              type: 'string',
              enum: ['FILL', 'FIT', 'CROP', 'TILE'],
              description: 'How image fills the node. FILL (default): fills entire area, may crop. FIT: shows full image, may not fill area. CROP: precise positioning with crop parameter. TILE: repeating pattern.',
              default: 'FILL'
            },
            opacity: {
              type: 'number',
              description: 'Fill opacity (0-1). Default: 1',
              minimum: 0,
              maximum: 1,
              default: 1
            },
            rotation: {
              type: 'number',
              description: 'Image rotation in degrees (90° increments only). Default: 0',
              enum: [0, 90, 180, 270],
              default: 0
            },
            tileScale: {
              type: 'number',
              description: 'Tile size multiplier for TILE mode. Default: 1',
              default: 1
            },
            crop: {
              type: 'object',
              description: 'Crop offset for CROP mode (normalized 0-1)',
              properties: {
                x: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1
                },
                y: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1
                }
              }
            },
            filters: {
              type: 'object',
              description: 'Image adjustment filters (all values -1 to 1)',
              properties: {
                exposure: { type: 'number', minimum: -1, maximum: 1 },
                contrast: { type: 'number', minimum: -1, maximum: 1 },
                saturation: { type: 'number', minimum: -1, maximum: 1 },
                temperature: { type: 'number', minimum: -1, maximum: 1 },
                tint: { type: 'number', minimum: -1, maximum: 1 },
                highlights: { type: 'number', minimum: -1, maximum: 1 },
                shadows: { type: 'number', minimum: -1, maximum: 1 }
              }
            }
          },
          required: ['nodeId', 'imageUrl']
        }
      }
    },
    required: ['imageSpecs']
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

const moveNode = {
  name: 'move_node',
  description: 'PRIMITIVE: Move a node from one parent to another (reparenting). Supports optional index positioning. Complements reorder_children (which moves within same parent).',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'ID of node to move'
      },
      newParentId: {
        type: 'string',
        description: 'ID of new parent node'
      },
      index: {
        type: 'number',
        description: 'Optional: Position in new parent\'s children (0-based). If omitted, appends to end.'
      }
    },
    required: ['nodeId', 'newParentId']
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
        description: 'Font style. Supports all UI weight names: Thin, ExtraLight, Light, Regular, Medium, SemiBold, Bold, ExtraBold, Black. Automatically tries variations (e.g., SemiBold → Semi Bold, Semibold, Medium, etc.) to find available font style in the font family.'
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

const applyImageFill = {
  name: 'apply_image_fill',
  description: 'WORKFLOW: Apply image fill from URL to a node in one step. Imports image and applies fill atomically with smart defaults. Supports all scale modes (FILL, FIT, CROP, TILE), filters, and rotation.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Node ID to apply image fill to'
      },
      imageUrl: {
        type: 'string',
        description: 'Image URL (PNG, JPG, or GIF, max 4096x4096px)'
      },
      scaleMode: {
        type: 'string',
        enum: ['FILL', 'FIT', 'CROP', 'TILE'],
        description: 'How image fills the node. FILL (default): fills entire area, may crop. FIT: shows full image, may not fill area. CROP: precise positioning with crop parameter. TILE: repeating pattern.',
        default: 'FILL'
      },
      opacity: {
        type: 'number',
        description: 'Fill opacity (0-1). Default: 1',
        default: 1,
        minimum: 0,
        maximum: 1
      },
      rotation: {
        type: 'number',
        enum: [0, 90, 180, 270],
        description: 'Image rotation in degrees (90° increments only). Default: 0',
        default: 0
      },
      filters: {
        type: 'object',
        description: 'Image adjustment filters (all values -1 to 1)',
        properties: {
          exposure: { type: 'number', minimum: -1, maximum: 1 },
          contrast: { type: 'number', minimum: -1, maximum: 1 },
          saturation: { type: 'number', minimum: -1, maximum: 1 },
          temperature: { type: 'number', minimum: -1, maximum: 1 },
          tint: { type: 'number', minimum: -1, maximum: 1 },
          highlights: { type: 'number', minimum: -1, maximum: 1 },
          shadows: { type: 'number', minimum: -1, maximum: 1 }
        }
      },
      crop: {
        type: 'object',
        description: 'Crop offset for CROP mode (normalized 0-1)',
        properties: {
          x: { type: 'number', minimum: 0, maximum: 1 },
          y: { type: 'number', minimum: 0, maximum: 1 }
        }
      },
      tileScale: {
        type: 'number',
        description: 'Tile size multiplier for TILE mode. Default: 1',
        default: 1
      }
    },
    required: ['nodeId', 'imageUrl']
  }
};

const applyGradientFill = {
  name: 'apply_gradient_fill',
  description: 'WORKFLOW: Apply gradient fill to a node with intuitive angle-based API. Supports all gradient types (linear, radial, angular, diamond) with automatic color stop distribution. Accepts hex colors, RGB objects, OR variable bindings for theming support.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Node ID to apply gradient fill to'
      },
      gradientType: {
        type: 'string',
        enum: ['linear', 'radial', 'angular', 'diamond'],
        description: 'Gradient type. linear: straight line. radial: outward from center. angular: clockwise rotation. diamond: diagonal spread. Default: linear',
        default: 'linear'
      },
      angle: {
        type: 'number',
        description: 'Gradient angle in degrees (0-360). Only for linear gradients. 0=right, 90=down, 180=left, 270=up. Default: 90 (vertical)',
        default: 90,
        minimum: 0,
        maximum: 360
      },
      colors: {
        type: 'array',
        description: 'Array of static colors (minimum 2). Can be hex strings "#FF0000" or objects with color and position {color: "#FF0000", position: 0.5}. Positions auto-distributed if not specified. Mutually exclusive with colorVariables.',
        items: {
          oneOf: [
            { type: 'string' },
            {
              type: 'object',
              properties: {
                color: { type: 'string' },
                position: { type: 'number', minimum: 0, maximum: 1 }
              },
              required: ['color']
            }
          ]
        },
        minItems: 2
      },
      colorVariables: {
        type: 'array',
        description: 'Array of COLOR variables to bind to gradient stops (minimum 2). Each item can be a variable ID/name string, or object with variableId and optional position {variableId: "VariableID:123:456", position: 0.5}. Enables Light/Dark mode theming. Mutually exclusive with colors.',
        items: {
          oneOf: [
            { type: 'string' },
            {
              type: 'object',
              properties: {
                variableId: { type: 'string' },
                position: { type: 'number', minimum: 0, maximum: 1 }
              },
              required: ['variableId']
            }
          ]
        },
        minItems: 2
      },
      opacity: {
        type: 'number',
        description: 'Gradient opacity (0-1). Default: 1',
        default: 1,
        minimum: 0,
        maximum: 1
      }
    },
    required: ['nodeId']
  }
};

const setNestedInstanceExposure = {
  name: 'set_nested_instance_exposure',
  description: 'PRIMITIVE: Set isExposedInstance flag on a nested instance node. This makes the instance\'s properties accessible from its parent instance. Requires exact node ID (use get_nested_instance_tree to discover node IDs). Returns exposedInstanceId in format "I{parentId};{childId}" for use with set_instance_properties.',
  inputSchema: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: 'Node ID of the nested instance to expose/hide (e.g., "184:5649")'
      },
      isExposed: {
        type: 'boolean',
        description: 'Set to true to expose instance, false to hide. Default: true',
        default: true
      }
    },
    required: ['nodeId']
  }
};

const exposeNestedInstanceByPath = {
  name: 'expose_nested_instance_by_path',
  description: 'WORKFLOW: Navigate to a nested instance via path and expose it in one operation. Combines navigation, validation, and exposure for convenience. Use this when you know the instance name hierarchy but not the exact node ID. Returns exposedInstanceId for subsequent property modifications.',
  inputSchema: {
    type: 'object',
    properties: {
      parentInstanceId: {
        type: 'string',
        description: 'Starting node ID to navigate from. Can be a COMPONENT, COMPONENT_SET, or INSTANCE node (e.g., "184:5659"). Use component ID to expose instances in component definitions.'
      },
      childPath: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of child node names to navigate down. Example: ["Icon Container"] or ["Icon Container", "Icon"]. Each name must match exactly.',
        minItems: 1
      },
      isExposed: {
        type: 'boolean',
        description: 'Set to true to expose instance, false to hide. Default: true',
        default: true
      }
    },
    required: ['parentInstanceId', 'childPath']
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

const copyBindings = {
  name: 'copy_bindings',
  description: 'WORKFLOW: Copy property bindings from source node to target node. Supports variable bindings (fills, strokes, dimensions), text property bindings, and instance swap bindings. Use optional bindingTypes filter to copy specific types only. Reduces cognitive load for common "copy properties" pattern.',
  inputSchema: {
    type: 'object',
    properties: {
      sourceNodeId: {
        type: 'string',
        description: 'Source node ID to copy bindings from (e.g., "184:5659")'
      },
      targetNodeId: {
        type: 'string',
        description: 'Target node ID to copy bindings to (e.g., "184:5670")'
      },
      bindingTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['variables', 'text', 'instanceSwap']
        },
        description: 'Optional filter for binding types to copy. Options: "variables" (boundVariables), "text" (componentPropertyReferences for TEXT/BOOLEAN), "instanceSwap" (componentPropertyReferences for INSTANCE_SWAP). Defaults to all types if not specified.',
        default: ['variables', 'text', 'instanceSwap']
      }
    },
    required: ['sourceNodeId', 'targetNodeId']
  }
};

const copyAllProperties = {
  name: 'copy_all_properties',
  description: 'WORKFLOW: Copy all properties from source node to target node. Includes property bindings (variable, text, instance swap) AND direct properties (opacity, visible, locked, layout properties). Comprehensive one-call replication for template-based component creation. Composes copy_bindings internally.',
  inputSchema: {
    type: 'object',
    properties: {
      sourceNodeId: {
        type: 'string',
        description: 'Source node ID to copy all properties from (e.g., "184:5659")'
      },
      targetNodeId: {
        type: 'string',
        description: 'Target node ID to copy all properties to (e.g., "184:5670")'
      },
      includeTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['bindings', 'direct']
        },
        description: 'Optional filter for property categories to copy. Options: "bindings" (all property bindings via copy_bindings), "direct" (opacity, visible, locked, layoutMode, padding, itemSpacing, etc.). Defaults to both if not specified.',
        default: ['bindings', 'direct']
      }
    },
    required: ['sourceNodeId', 'targetNodeId']
  }
};

// ICON Tools

const createIconComponent = {
  name: 'create_icon_component',
  description: 'Create a single icon component from any Iconify icon set (200+ sets, 275k+ icons). Supports Lucide, Heroicons, Phosphor, Material Design, Tabler, and more. Automatically detects icon type (stroke/fill/duotone) and applies colors correctly.',
  inputSchema: {
    type: 'object',
    properties: {
      iconName: {
        type: 'string',
        description: 'Icon name in format "prefix:name" (e.g., "lucide:heart", "heroicons:bell", "phosphor:star"). See https://icon-sets.iconify.design/ for available icons.'
      },
      componentName: {
        type: 'string',
        description: 'Component name in Figma (e.g., "Icon/Heart"). Default: "Icon/{Name}" based on icon name.'
      },
      size: {
        type: 'number',
        default: 24,
        description: 'Icon size in pixels. Default: 24'
      },
      color: {
        type: 'string',
        description: 'Hex color (e.g., "#FF0000"). Applied as stroke (outline icons) or fill (solid icons). Optional.'
      },
      colorVariable: {
        type: 'string',
        description: 'Design token variable name (e.g., "Colors/Primary"). Alternative to color parameter. Binds color to variable for theming support. Optional.'
      },
      variant: {
        type: 'string',
        enum: ['outline', 'solid', 'filled', 'duotone', 'thin', 'light', 'regular', 'bold'],
        description: 'Icon style variant. Support varies by icon set: Lucide (outline only), Heroicons (outline/solid), Phosphor (all variants), Material (outline/filled). Tool auto-maps to icon set naming. Optional.'
      },
      strokeWidth: {
        type: 'number',
        description: 'Fixed stroke width in pixels (does not scale). Follows design system optical sizing best practices. If not specified, auto-calculated: 16-20px icons → 1px, 21-28px → 1.5px, 29px+ → 2px. Optional.'
      }
    },
    required: ['iconName']
  }
};

const batchCreateIcons = {
  name: 'batch_create_icons',
  description: 'Create multiple icon components in one operation. Optionally create as variants in a ComponentSet. Fetches all icons in parallel for performance. Supports mixing different icon sets, sizes, and colors.',
  inputSchema: {
    type: 'object',
    properties: {
      icons: {
        type: 'array',
        description: 'Array of icon specifications. Each can have custom iconName, variant, size, color, colorVariable, componentName.',
        items: {
          type: 'object',
          properties: {
            iconName: {
              type: 'string',
              description: 'Icon name in format "prefix:name" (required)'
            },
            variant: {
              type: 'string',
              enum: ['outline', 'solid', 'filled', 'duotone', 'thin', 'light', 'regular', 'bold'],
              description: 'Icon variant (optional, inherits from parent)'
            },
            size: {
              type: 'number',
              description: 'Icon size in pixels (optional, inherits from parent)'
            },
            color: {
              type: 'string',
              description: 'Hex color (optional, inherits from parent)'
            },
            colorVariable: {
              type: 'string',
              description: 'Design token variable (optional, inherits from parent)'
            },
            componentName: {
              type: 'string',
              description: 'Custom component name (optional, auto-generated if omitted)'
            },
            strokeWidth: {
              type: 'number',
              description: 'Fixed stroke width in pixels for this icon (optional, inherits from parent)'
            }
          },
          required: ['iconName']
        },
        minItems: 1
      },
      size: {
        type: 'number',
        default: 24,
        description: 'Default size for all icons (can be overridden per icon). Default: 24'
      },
      baseColor: {
        type: 'string',
        description: 'Default hex color for all icons (can be overridden per icon). Optional.'
      },
      baseColorVariable: {
        type: 'string',
        description: 'Default design token variable for all icons (can be overridden per icon). Optional.'
      },
      baseStrokeWidth: {
        type: 'number',
        description: 'Default fixed stroke width in pixels for all icons (can be overridden per icon). Follows optical sizing best practices if not specified. Optional.'
      },
      createComponentSet: {
        type: 'boolean',
        default: false,
        description: 'Combine all icons into a ComponentSet with variants. Requires 2+ icons. Default: false (creates separate components)'
      },
      componentSetName: {
        type: 'string',
        default: 'Icons',
        description: 'Name for ComponentSet if createComponentSet=true. Default: "Icons"'
      }
    },
    required: ['icons']
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
    getComponentMetadata,
    getComponentVariants,
    getNestedInstanceTree,
    findNodesByName,
    validateResponsiveLayout,
    getPageStructure,
    getComponentProperties,
    getInstanceProperties,
    // WRITE tools
    createComponent,
    convertToComponent,
    createAutoLayout,
    createTextNode,
    bindVariable,
    batchBindVariables,
    createInstance,
    createMultipleInstances,
    applyResponsivePattern,
    addChildren,
    wrapInContainer,
    modifyNode,
    batchModifyNodes,
    swapComponent,
    swapInstanceComponent,
    batchApplyImages,
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
    moveNode,
    // IMAGE tools
    importImageFromUrl,
    createImageComponent,
    batchCreateImageComponents,
    applyImageFill,
    applyGradientFill,
    // NESTED INSTANCE tools
    setNestedInstanceExposure,
    exposeNestedInstanceByPath,
    // PROPERTY COPY tools
    copyBindings,
    copyAllProperties,
    // UTILITY tools
    executeFigmaScript,
    // ICON tools
    searchIcons,
    createIconComponent,
    batchCreateIcons
  ];
}

const searchIcons = {
  name: 'search_icons',
  description: 'Search for icons across all Iconify icon sets (200+ sets, 275k+ icons). Returns matching icon names that can be used with create_icon_component or batch_create_icons.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (e.g., "heart", "arrow", "settings"). Case insensitive.'
      },
      limit: {
        type: 'number',
        default: 64,
        description: 'Maximum number of results to return (min: 32, max: 999). Default: 64'
      },
      prefix: {
        type: 'string',
        description: 'Optional: Restrict results to specific icon set (e.g., "lucide", "heroicons", "phosphor")'
      },
      category: {
        type: 'string',
        description: 'Optional: Filter by category (e.g., "arrows", "charts", "social")'
      }
    },
    required: ['query']
  }
};

module.exports = {
  getAllSchemas,
  // Individual exports for reference
  getDesignSystem,
  getScreenshot,
  getComponentStructure,
  getNodeDetails,
  analyzeComplete,
  getComponents,
  getComponentMetadata,
  getComponentVariants,
  getNestedInstanceTree,
  findNodesByName,
  validateResponsiveLayout,
  getPageStructure,
  getComponentProperties,
  getInstanceProperties,
  createComponent,
  convertToComponent,
  createAutoLayout,
  createTextNode,
  bindVariable,
  batchBindVariables,
  createInstance,
  createMultipleInstances,
  applyResponsivePattern,
  addChildren,
  modifyNode,
  batchModifyNodes,
  swapComponent,
  swapInstanceComponent,
  batchApplyImages,
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
  moveNode,
  importImageFromUrl,
  createImageComponent,
  batchCreateImageComponents,
  applyImageFill,
  applyGradientFill,
  setNestedInstanceExposure,
  exposeNestedInstanceByPath,
  copyBindings,
  copyAllProperties,
  executeFigmaScript,
  createIconComponent,
  batchCreateIcons,
  searchIcons
};
