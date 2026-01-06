/**
 * Analysis Library
 *
 * Provides layered abstractions for analyzing Figma designs:
 * - Layer 1: Property extractors (safe, focused extraction)
 * - Layer 2: Binding resolvers (variable ID → name mapping)
 * - Layer 3: Node analyzers (type-specific analysis)
 * - Layer 4: Pattern detectors (recognize common patterns)
 * - Layer 5: Unified API (high-level analysis interface)
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 1: Property Extractors
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Extract basic properties common to all nodes
 */
function extractBasicProps(node) {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    width: Math.round(node.width * 100) / 100,
    height: Math.round(node.height * 100) / 100,
    visible: node.visible
  };
}

/**
 * Extract position properties
 */
function extractPosition(node) {
  return {
    x: node.x !== undefined ? Math.round(node.x * 100) / 100 : null,
    y: node.y !== undefined ? Math.round(node.y * 100) / 100 : null
  };
}

/**
 * Extract padding properties
 */
function extractPadding(node) {
  if (node.paddingLeft === undefined) return null;

  return {
    left: node.paddingLeft,
    right: node.paddingRight,
    top: node.paddingTop,
    bottom: node.paddingBottom
  };
}

/**
 * Extract auto-layout properties
 */
function extractLayoutProps(node) {
  return {
    layoutMode: node.layoutMode || null,
    layoutAlign: node.layoutAlign || null,
    layoutGrow: node.layoutGrow !== undefined ? node.layoutGrow : null,
    itemSpacing: node.itemSpacing !== undefined ? node.itemSpacing : null,
    padding: extractPadding(node)
  };
}

/**
 * Convert Figma color to RGB object
 */
function colorToRgb(color) {
  if (!color) return null;

  return {
    r: Math.round(color.r * 255),
    g: Math.round(color.g * 255),
    b: Math.round(color.b * 255),
    a: color.a !== undefined ? color.a : 1
  };
}

/**
 * Extract bound variable for a specific property and index
 */
function extractBoundVariable(node, property, index = 0) {
  if (!node.boundVariables) return null;

  const bindings = node.boundVariables[property];
  if (!bindings) return null;

  // Handle both array and single value
  const binding = Array.isArray(bindings) ? bindings[index] : bindings;
  if (!binding) return null;

  return { id: binding.id };
}

/**
 * Extract fills with optional variable bindings
 */
function extractFills(node, options = {}) {
  const { includeBindings = true } = options;

  if (!node.fills || node.fills.length === 0) return [];

  return node.fills.map((fill, index) => {
    const info = {
      type: fill.type,
      visible: fill.visible !== undefined ? fill.visible : true
    };

    if (fill.type === 'SOLID' && fill.color) {
      info.color = colorToRgb(fill.color);
    }

    if (fill.opacity !== undefined) {
      info.opacity = fill.opacity;
    }

    if (fill.blendMode) {
      info.blendMode = fill.blendMode;
    }

    if (includeBindings) {
      const boundVar = extractBoundVariable(node, 'fills', index);
      if (boundVar) {
        info.boundVariable = boundVar;
      }
    }

    return info;
  });
}

/**
 * Extract strokes with optional variable bindings
 */
function extractStrokes(node, options = {}) {
  const { includeBindings = true } = options;

  if (!node.strokes || node.strokes.length === 0) return [];

  return node.strokes.map((stroke, index) => {
    const info = {
      type: stroke.type,
      color: colorToRgb(stroke.color),
      weight: node.strokeWeight
    };

    if (stroke.opacity !== undefined) {
      info.opacity = stroke.opacity;
    }

    if (includeBindings) {
      const boundVar = extractBoundVariable(node, 'strokes', index);
      if (boundVar) {
        info.boundVariable = boundVar;
      }
    }

    return info;
  });
}

/**
 * Extract effects (shadows, blurs, glows)
 */
function extractEffects(node) {
  if (!node.effects || node.effects.length === 0) return [];

  return node.effects.map(effect => {
    const info = {
      type: effect.type,
      visible: effect.visible,
      radius: effect.radius
    };

    if (effect.color) {
      info.color = colorToRgb(effect.color);
    }

    if (effect.offset) {
      info.offset = {
        x: effect.offset.x,
        y: effect.offset.y
      };
    }

    if (effect.spread !== undefined) {
      info.spread = effect.spread;
    }

    if (effect.blendMode) {
      info.blendMode = effect.blendMode;
    }

    return info;
  });
}

/**
 * Extract text properties
 */
function extractTextProps(node) {
  return {
    characters: node.characters,
    fontSize: node.fontSize,
    fontName: node.fontName,
    textAlignHorizontal: node.textAlignHorizontal,
    textAlignVertical: node.textAlignVertical,
    textStyleId: node.textStyleId || null
  };
}

/**
 * Extract corner radius properties
 */
function extractCornerRadius(node) {
  if (node.cornerRadius !== undefined) {
    return node.cornerRadius;
  }

  // Check for individual corner radii
  if (node.topLeftRadius !== undefined) {
    return {
      topLeft: node.topLeftRadius,
      topRight: node.topRightRadius,
      bottomLeft: node.bottomLeftRadius,
      bottomRight: node.bottomRightRadius
    };
  }

  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 2: Binding Resolvers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Extract all variable IDs from an analysis result
 */
function extractVariableIds(analysisResult) {
  const ids = new Set();

  function traverse(obj) {
    if (!obj || typeof obj !== 'object') return;

    if (obj.boundVariable && obj.boundVariable.id) {
      ids.add(obj.boundVariable.id);
    }

    if (Array.isArray(obj)) {
      obj.forEach(traverse);
    } else {
      Object.values(obj).forEach(traverse);
    }
  }

  traverse(analysisResult);
  return Array.from(ids);
}

/**
 * Resolve variable IDs to their names and collections
 */
async function resolveVariableIds(variableIds, getAllVariablesFn) {
  if (!variableIds || variableIds.length === 0) return {};

  const allVars = await getAllVariablesFn();

  const mapping = {};
  variableIds.forEach(id => {
    const variable = allVars.variables.find(v => v.id === id);
    if (variable) {
      mapping[id] = {
        name: variable.name,
        collection: variable.collectionName
      };
    }
  });

  return mapping;
}

/**
 * Enrich analysis result with resolved variable names
 */
function enrichWithVariableNames(analysisResult, variableMapping) {
  function traverse(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(traverse);
    }

    const enriched = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'boundVariable' && value && value.id) {
        const resolved = variableMapping[value.id];
        enriched[key] = {
          ...value,
          ...(resolved || {})
        };
      } else {
        enriched[key] = traverse(value);
      }
    }

    return enriched;
  }

  return traverse(analysisResult);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 3: Node Type Analyzers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Analyze a generic node with configurable options
 */
function analyzeGenericNode(node, options = {}) {
  const {
    includePosition = true,
    includeFills = false,
    includeStrokes = false,
    includeEffects = false,
    includeBindings = true
  } = options;

  const analysis = {
    ...extractBasicProps(node)
  };

  if (includePosition) {
    Object.assign(analysis, extractPosition(node));
  }

  if (includeFills) {
    analysis.fills = extractFills(node, { includeBindings });
  }

  if (includeStrokes) {
    analysis.strokes = extractStrokes(node, { includeBindings });
  }

  if (includeEffects) {
    analysis.effects = extractEffects(node);
  }

  return analysis;
}

/**
 * Analyze a Frame node
 */
function analyzeFrame(node, options = {}) {
  const { includeChildren = false, recurse = false } = options;

  const analysis = {
    ...analyzeGenericNode(node, options),
    ...extractLayoutProps(node)
  };

  if (node.children) {
    analysis.childCount = node.children.length;

    if (includeChildren) {
      analysis.children = node.children.map(child => {
        if (recurse) {
          return analyzeNode(child, options);
        } else {
          return {
            id: child.id,
            name: child.name,
            type: child.type
          };
        }
      });
    }
  }

  return analysis;
}

/**
 * Analyze a Text node
 */
function analyzeText(node, options = {}) {
  return {
    ...analyzeGenericNode(node, options),
    ...extractTextProps(node)
  };
}

/**
 * Analyze a Rectangle node
 */
function analyzeRectangle(node, options = {}) {
  const analysis = analyzeGenericNode(node, options);

  const cornerRadius = extractCornerRadius(node);
  if (cornerRadius !== null) {
    analysis.cornerRadius = cornerRadius;
  }

  return analysis;
}

/**
 * Analyze an Ellipse node
 */
function analyzeEllipse(node, options = {}) {
  return analyzeGenericNode(node, options);
}

/**
 * Analyze a Component Instance
 */
function analyzeInstance(node, options = {}) {
  const analysis = analyzeGenericNode(node, options);

  analysis.componentId = node.mainComponent ? node.mainComponent.id : null;
  analysis.componentName = node.mainComponent ? node.mainComponent.name : null;

  return analysis;
}

/**
 * Analyze a Group node
 */
function analyzeGroup(node, options = {}) {
  return analyzeFrame(node, options);
}

/**
 * Route to appropriate analyzer based on node type
 */
function analyzeNode(node, options = {}) {
  const type = node.type;

  if (type === 'FRAME') return analyzeFrame(node, options);
  if (type === 'TEXT') return analyzeText(node, options);
  if (type === 'RECTANGLE') return analyzeRectangle(node, options);
  if (type === 'ELLIPSE') return analyzeEllipse(node, options);
  if (type === 'INSTANCE') return analyzeInstance(node, options);
  if (type === 'GROUP') return analyzeGroup(node, options);

  // Default: generic analysis
  return analyzeGenericNode(node, options);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 4: Pattern Detectors
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Detect if a node uses a glow effect pattern
 */
function hasGlowPattern(node) {
  if (!node.effects || node.effects.length === 0) return false;

  const hasLayerBlur = node.effects.some(e => e.type === 'LAYER_BLUR' && e.visible);
  const hasColoredFill = node.fills && node.fills.length > 0 &&
                         node.fills.some(f => f.type === 'SOLID');

  return hasLayerBlur && hasColoredFill;
}

/**
 * Detect if a node has shadow effects
 */
function hasShadowPattern(node) {
  if (!node.effects || node.effects.length === 0) return false;

  return node.effects.some(e =>
    (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') && e.visible
  );
}

/**
 * Analyze auto-layout structure and patterns
 */
function analyzeAutoLayoutPattern(frame) {
  if (!frame.layoutMode || frame.layoutMode === 'NONE') {
    return { type: 'none' };
  }

  const pattern = {
    type: 'auto-layout',
    direction: frame.layoutMode,
    spacing: frame.itemSpacing,
    padding: extractPadding(frame)
  };

  if (frame.children && frame.children.length > 0) {
    pattern.childAlignment = frame.children.map(child => ({
      name: child.name,
      layoutAlign: child.layoutAlign,
      layoutGrow: child.layoutGrow,
      fills: child.layoutAlign === 'STRETCH' || child.layoutGrow > 0
    }));
  }

  return pattern;
}

/**
 * Detect variable binding coverage
 */
function analyzeBindingCoverage(node) {
  const coverage = {
    fills: false,
    strokes: false,
    effects: false,
    dimensions: false,
    padding: false,
    spacing: false,
    cornerRadius: false
  };

  if (!node.boundVariables) return coverage;

  const bv = node.boundVariables;

  coverage.fills = !!(bv.fills && bv.fills.length > 0);
  coverage.strokes = !!(bv.strokes && bv.strokes.length > 0);
  coverage.dimensions = !!(bv.width || bv.height);
  coverage.padding = !!(bv.paddingLeft || bv.paddingRight || bv.paddingTop || bv.paddingBottom);
  coverage.spacing = !!bv.itemSpacing;
  coverage.cornerRadius = !!bv.cornerRadius;

  const total = Object.keys(coverage).length;
  const bound = Object.values(coverage).filter(Boolean).length;

  coverage.percentage = Math.round((bound / total) * 100);

  return coverage;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LAYER 5: Unified Analysis API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Create analysis script generator
 *
 * Returns a script string that can be executed in Figma context
 */
function createAnalysisScript(nodeName, options = {}) {
  const {
    depth = 0,
    maxDepth = 1,
    includePosition = true,
    includeFills = true,
    includeStrokes = false,
    includeEffects = true,
    includeBindings = true,
    includeChildren = true,
    recurse = false
  } = options;

  // Inline the analyzer functions in the script
  return `
    const node = figma.root.findOne(n => n.name === '${nodeName}');
    if (!node) {
      throw new Error('Node "${nodeName}" not found');
    }

    // Helper functions (inlined)
    ${extractBasicProps.toString()}
    ${extractPosition.toString()}
    ${extractPadding.toString()}
    ${extractLayoutProps.toString()}
    ${extractTextProps.toString()}
    ${colorToRgb.toString()}
    ${extractBoundVariable.toString()}
    ${extractFills.toString()}
    ${extractStrokes.toString()}
    ${extractEffects.toString()}
    ${extractCornerRadius.toString()}
    ${analyzeGenericNode.toString()}
    ${analyzeFrame.toString()}
    ${analyzeText.toString()}
    ${analyzeRectangle.toString()}
    ${analyzeEllipse.toString()}
    ${analyzeInstance.toString()}
    ${analyzeGroup.toString()}
    ${analyzeNode.toString()}

    // Analysis options
    const options = ${JSON.stringify({
      includePosition,
      includeFills,
      includeStrokes,
      includeEffects,
      includeBindings,
      includeChildren,
      recurse
    })};

    // Run analysis
    return analyzeNode(node, options);
  `;
}

/**
 * High-level analysis function
 *
 * Analyzes a Figma node and optionally resolves variable bindings
 */
async function analyze(nodeName, executeInFigmaFn, options = {}) {
  const { resolveVariables = true, getAllVariablesFn = null } = options;

  // Generate and execute analysis script
  const script = createAnalysisScript(nodeName, options);
  const result = await executeInFigmaFn(script);

  // Resolve variable bindings if requested
  if (resolveVariables && getAllVariablesFn) {
    const variableIds = extractVariableIds(result.result);
    const variableMapping = await resolveVariableIds(variableIds, getAllVariablesFn);
    return enrichWithVariableNames(result.result, variableMapping);
  }

  return result.result;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Exports
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

module.exports = {
  // Layer 1: Property extractors
  extractBasicProps,
  extractPosition,
  extractPadding,
  extractLayoutProps,
  extractFills,
  extractStrokes,
  extractEffects,
  extractTextProps,
  extractCornerRadius,
  colorToRgb,
  extractBoundVariable,

  // Layer 2: Binding resolvers
  extractVariableIds,
  resolveVariableIds,
  enrichWithVariableNames,

  // Layer 3: Node analyzers
  analyzeGenericNode,
  analyzeFrame,
  analyzeText,
  analyzeRectangle,
  analyzeEllipse,
  analyzeInstance,
  analyzeGroup,
  analyzeNode,

  // Layer 4: Pattern detectors
  hasGlowPattern,
  hasShadowPattern,
  analyzeAutoLayoutPattern,
  analyzeBindingCoverage,

  // Layer 5: Unified API
  createAnalysisScript,
  analyze
};
