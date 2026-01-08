/**
 * Icon Helpers
 *
 * Helper functions for working with Iconify icons
 * Supports 200+ icon sets with 275,000+ icons
 *
 * @example
 * const { fetchIconSvg, detectIconType } = require('./icons');
 *
 * const svg = await fetchIconSvg('lucide:heart', 24);
 * const type = detectIconType(svg);
 */

/**
 * Parse icon name in format "prefix:name"
 * @param {string} iconName - Icon name (e.g., "lucide:heart", "heroicons:bell")
 * @returns {Object} { prefix, name }
 */
function parseIconName(iconName) {
  if (!iconName || typeof iconName !== 'string') {
    throw new Error('Icon name must be a string in format "prefix:name"');
  }

  const parts = iconName.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid icon name format: "${iconName}". Expected "prefix:name" (e.g., "lucide:heart")`);
  }

  const [prefix, name] = parts;
  if (!prefix || !name) {
    throw new Error(`Invalid icon name: "${iconName}". Both prefix and name are required`);
  }

  return { prefix, name };
}

/**
 * Fetch SVG from Iconify API
 * @param {string} iconName - Icon name in format "prefix:name" (e.g., "lucide:heart")
 * @param {number} size - Icon size in pixels (default: 24)
 * @returns {Promise<string>} SVG content
 */
async function fetchIconSvg(iconName, size = 24) {
  const { prefix, name } = parseIconName(iconName);

  // Iconify API endpoint with height parameter
  const url = `https://api.iconify.design/${prefix}:${name}.svg?height=${size}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Icon not found: "${iconName}". Check icon name at https://icon-sets.iconify.design/${prefix}/`);
      }
      throw new Error(`Failed to fetch icon: HTTP ${response.status}`);
    }

    const svgContent = await response.text();

    if (!svgContent || !svgContent.includes('<svg')) {
      throw new Error(`Invalid SVG content received for icon: "${iconName}"`);
    }

    return svgContent;
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error(`Network error fetching icon "${iconName}": ${error.message}`);
    }
    throw error;
  }
}

/**
 * Detect icon type from SVG content
 * @param {string} svgContent - SVG content
 * @returns {string} Icon type: "stroke", "fill", or "duotone"
 */
function detectIconType(svgContent) {
  if (!svgContent || typeof svgContent !== 'string') {
    return 'fill'; // Default fallback
  }

  // Check for stroke attribute
  const hasStroke = svgContent.includes('stroke=') || svgContent.includes('stroke:');

  // Check for fill attribute (excluding fill="none")
  const hasFill = (svgContent.includes('fill=') || svgContent.includes('fill:')) &&
                  !svgContent.includes('fill="none"') &&
                  !svgContent.includes('fill:none');

  // Count path elements to detect duotone (multiple layers)
  const pathMatches = svgContent.match(/<path/g) || [];
  const pathCount = pathMatches.length;

  // Duotone detection: Multiple paths with different opacity or fill
  const hasOpacity = svgContent.includes('opacity=') || svgContent.includes('opacity:');
  const isDuotone = pathCount > 1 && (hasOpacity || svgContent.includes('fill-opacity'));

  if (isDuotone) return 'duotone';
  if (hasStroke && !hasFill) return 'stroke';
  if (hasFill && !hasStroke) return 'fill';

  // If both stroke and fill, prioritize based on which appears first
  const strokeIndex = svgContent.indexOf('stroke=');
  const fillIndex = svgContent.indexOf('fill=');

  if (strokeIndex >= 0 && (fillIndex < 0 || strokeIndex < fillIndex)) {
    return 'stroke';
  }

  return 'fill'; // Default
}

/**
 * Map standard variant names to icon set specific names
 * @param {string} variant - Standard variant: "outline", "solid", "filled", "duotone"
 * @param {string} prefix - Icon set prefix (e.g., "lucide", "heroicons", "phosphor")
 * @returns {string} Icon set specific suffix (e.g., "-outline", "-fill", "")
 */
function mapVariantToIconSet(variant, prefix) {
  if (!variant) return '';

  const variantLower = variant.toLowerCase();

  // Variant mapping by icon set
  const mappings = {
    'lucide': {
      'outline': '', // Default
      'solid': null, // Not supported
      'filled': null,
      'duotone': null
    },
    'heroicons': {
      'outline': '', // Outline is the default (no suffix)
      'solid': '-solid',
      'filled': '-solid',
      'duotone': null
    },
    'phosphor': {
      'outline': '-regular',
      'solid': '-fill',
      'filled': '-fill',
      'duotone': '-duotone',
      'thin': '-thin',
      'light': '-light',
      'bold': '-bold'
    },
    'material-symbols': {
      'outline': '-outlined',
      'solid': '-filled',
      'filled': '-filled',
      'duotone': null
    },
    'tabler': {
      'outline': '', // Default
      'solid': '-filled',
      'filled': '-filled',
      'duotone': null
    }
  };

  // Get mapping for this icon set
  const setMapping = mappings[prefix] || {};
  const suffix = setMapping[variantLower];

  // If null, variant not supported
  if (suffix === null) {
    throw new Error(`Variant "${variant}" is not supported for icon set "${prefix}"`);
  }

  // If undefined, return empty string (unknown icon set, let API handle it)
  return suffix !== undefined ? suffix : '';
}

/**
 * Generate Figma code to apply color based on icon type
 * Used in executeInFigma scripts
 *
 * @param {string} color - Hex color (e.g., "#FF0000") or null
 * @param {string} colorVariable - Variable name (e.g., "Colors/Primary") or null
 * @param {string} iconType - Icon type: "stroke", "fill", or "duotone"
 * @returns {string} Figma code to apply color
 */
function generateColorApplicationCode(color, colorVariable, iconType) {
  // No color specified
  if (!color && !colorVariable) {
    return '// No color specified';
  }

  // Parse hex color to RGB
  let colorCode = '';
  if (color) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    colorCode = `{ r: ${r.toFixed(3)}, g: ${g.toFixed(3)}, b: ${b.toFixed(3)} }`;
  }

  // Generate code based on icon type
  if (iconType === 'stroke') {
    if (colorVariable) {
      return `
    // Apply stroke color from variable to all vector paths
    const colorVar = figma.variables.getLocalVariables().find(v => v.name === "${colorVariable}");
    if (colorVar) {
      vectors.forEach(vector => {
        const paint = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
        vector.strokes = [paint];
        vector.setBoundVariable('strokes', colorVar);
        if (vector.strokeWeight === 0) vector.strokeWeight = 2;
      });
    } else {
      throw new Error("Variable not found: ${colorVariable}");
    }`;
    } else {
      return `
    // Apply stroke color to all vector paths
    vectors.forEach(vector => {
      vector.strokes = [{ type: 'SOLID', color: ${colorCode} }];
      if (vector.strokeWeight === 0) vector.strokeWeight = 2;
    });`;
    }
  } else if (iconType === 'fill') {
    if (colorVariable) {
      return `
    // Apply fill color from variable to all vector paths
    const colorVar = figma.variables.getLocalVariables().find(v => v.name === "${colorVariable}");
    if (colorVar) {
      vectors.forEach(vector => {
        const paint = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };
        vector.fills = [paint];
        vector.setBoundVariable('fills', colorVar);
      });
    } else {
      throw new Error("Variable not found: ${colorVariable}");
    }`;
    } else {
      return `
    // Apply fill color to all vector paths
    vectors.forEach(vector => {
      vector.fills = [{ type: 'SOLID', color: ${colorCode} }];
    });`;
    }
  } else if (iconType === 'duotone') {
    // For duotone, apply color to all children (layers)
    if (colorVariable) {
      return `
    // Apply duotone colors from variable (primary + opacity variation)
    const colorVar = figma.variables.getLocalVariables().find(v => v.name === "${colorVariable}");
    if (colorVar) {
      vectors.forEach((vector, index) => {
        const opacity = index === 0 ? 0.3 : 1.0; // First layer lighter
        const paint = { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity };
        vector.fills = [paint];
        vector.setBoundVariable('fills', colorVar);
      });
    }`;
    } else {
      return `
    // Apply duotone colors (primary + opacity variation)
    vectors.forEach((vector, index) => {
      const opacity = index === 0 ? 0.3 : 1.0; // First layer lighter
      vector.fills = [{ type: 'SOLID', color: ${colorCode}, opacity }];
    });`;
    }
  }

  return '// Unknown icon type';
}

/**
 * Build full icon name with variant suffix
 * @param {string} iconName - Base icon name (e.g., "lucide:heart")
 * @param {string} variant - Variant name (optional)
 * @returns {string} Full icon name with variant
 */
function buildIconNameWithVariant(iconName, variant) {
  if (!variant) return iconName;

  const { prefix, name } = parseIconName(iconName);
  const suffix = mapVariantToIconSet(variant, prefix);

  return `${prefix}:${name}${suffix}`;
}

/**
 * Calculate optimal stroke width based on icon size (optical sizing)
 * Follows design system best practices
 *
 * @param {number} size - Icon size in pixels
 * @returns {number} Optimal stroke width in pixels
 */
function calculateOptimalStrokeWidth(size) {
  // Design system best practices for optical sizing:
  // - Small icons (16-20px): 1px stroke for clarity
  // - Medium icons (21-28px): 1.5px stroke for balance
  // - Large icons (29px+): 2px stroke for presence

  if (size <= 20) return 1;
  if (size <= 28) return 1.5;
  return 2;
}

module.exports = {
  parseIconName,
  fetchIconSvg,
  detectIconType,
  mapVariantToIconSet,
  generateColorApplicationCode,
  buildIconNameWithVariant,
  calculateOptimalStrokeWidth
};
