/**
 * Icon Tools
 *
 * Tools for creating icon components from Iconify (200+ icon sets, 275k+ icons)
 * Supports Lucide, Heroicons, Phosphor, Material Design, Tabler, and more
 */

const {
  parseIconName,
  fetchIconSvg,
  detectIconType,
  generateColorApplicationCode,
  buildIconNameWithVariant,
  calculateOptimalStrokeWidth
} = require('../helpers/icons');

/**
 * Tool: create_icon_component
 * Create a single icon component from any Iconify icon set
 */
async function createIconComponent(api, args, sendProgress) {
  const {
    iconName,
    componentName,
    size = 24,
    color,
    colorVariable,
    variant,
    strokeWidth
  } = args;

  // Calculate optimal stroke width if not provided (optical sizing)
  const optimalStrokeWidth = strokeWidth !== undefined
    ? strokeWidth
    : calculateOptimalStrokeWidth(size);

  // Build full icon name with variant
  const fullIconName = buildIconNameWithVariant(iconName, variant);
  const { prefix, name } = parseIconName(fullIconName);

  sendProgress({ status: `Fetching icon ${fullIconName} from Iconify...` });

  // Fetch SVG from Iconify API
  let svgContent;
  try {
    svgContent = await fetchIconSvg(fullIconName, size);
  } catch (error) {
    throw new Error(`Failed to fetch icon: ${error.message}`);
  }

  // Detect icon type
  const iconType = detectIconType(svgContent);
  sendProgress({ status: `Creating ${iconType} icon component...` });

  // Generate color application code
  const colorCode = generateColorApplicationCode(color, colorVariable, iconType);

  // Determine component name
  const finalComponentName = componentName || `Icon/${name.charAt(0).toUpperCase() + name.slice(1)}`;

  // Create component in Figma
  const result = await api.executeInFigma(`
    // Escape SVG content for embedding
    const svgContent = ${JSON.stringify(svgContent)};

    // Create node from SVG
    const iconNode = figma.createNodeFromSvg(svgContent);

    // Create component
    const component = figma.createComponent();
    component.name = "${finalComponentName}";

    // Resize component to exact size
    component.resize(${size}, ${size});

    // Append icon to component
    component.appendChild(iconNode);

    // Center icon within component
    iconNode.x = (component.width - iconNode.width) / 2;
    iconNode.y = (component.height - iconNode.height) / 2;

    // Set constraints to SCALE for proportional resizing
    iconNode.constraints = {
      horizontal: 'SCALE',
      vertical: 'SCALE'
    };

    // Lock aspect ratio to maintain proportions
    iconNode.lockAspectRatio();

    // Find all vector paths for styling
    const vectors = iconNode.findAll(node => node.type === 'VECTOR');

    // Apply fixed stroke width for stroke icons (optical sizing best practice)
    // This ensures stroke doesn't scale disproportionately
    vectors.forEach(vector => {
      if (vector.strokes && vector.strokes.length > 0) {
        // Set fixed stroke width based on icon size (won't scale)
        vector.strokeWeight = ${optimalStrokeWidth};
      }
    });

    ${colorCode}

    // Add to current page
    figma.currentPage.appendChild(component);
    figma.currentPage.selection = [component];
    figma.viewport.scrollAndZoomIntoView([component]);

    return {
      success: true,
      componentId: component.id,
      componentName: component.name,
      iconSet: "${prefix}",
      iconName: "${name}",
      variant: ${variant ? `"${variant}"` : 'null'},
      size: ${size},
      iconType: "${iconType}",
      colorApplied: ${!!(color || colorVariable)},
      svgUrl: "https://api.iconify.design/${fullIconName}.svg"
    };
  `);

  sendProgress({ status: `Icon component created: ${finalComponentName}` });
  return result.result;
}

/**
 * Tool: batch_create_icons
 * Create multiple icon components, optionally as variants in a ComponentSet
 */
async function batchCreateIcons(api, args, sendProgress) {
  const {
    icons,
    size = 24,
    baseColor,
    baseColorVariable,
    baseStrokeWidth,
    createComponentSet = false,
    componentSetName = 'Icons'
  } = args;

  // Calculate default stroke width if not provided
  const defaultStrokeWidth = baseStrokeWidth !== undefined
    ? baseStrokeWidth
    : calculateOptimalStrokeWidth(size);

  if (!icons || !Array.isArray(icons) || icons.length === 0) {
    throw new Error('icons must be a non-empty array');
  }

  sendProgress({ status: `Creating ${icons.length} icon components...` });

  // Fetch all SVGs in parallel
  const svgPromises = icons.map(async (iconSpec, index) => {
    const { iconName, variant, color, colorVariable, strokeWidth } = iconSpec;

    try {
      const fullIconName = buildIconNameWithVariant(iconName, variant);
      const { prefix, name } = parseIconName(fullIconName);
      const iconSize = iconSpec.size || size;
      const svgContent = await fetchIconSvg(fullIconName, iconSize);
      const iconType = detectIconType(svgContent);

      // Calculate optimal stroke for this icon
      const optimalStroke = strokeWidth !== undefined
        ? strokeWidth
        : (iconSpec.size ? calculateOptimalStrokeWidth(iconSpec.size) : defaultStrokeWidth);

      return {
        index,
        success: true,
        iconSpec,
        fullIconName,
        iconPrefix: prefix,
        iconBaseName: name,
        svgContent,
        iconType,
        color: color || baseColor,
        colorVariable: colorVariable || baseColorVariable,
        strokeWidth: optimalStroke
      };
    } catch (error) {
      return {
        index,
        success: false,
        iconSpec,
        error: error.message
      };
    }
  });

  const svgResults = await Promise.all(svgPromises);

  // Filter successful results
  const successfulIcons = svgResults.filter(r => r.success);
  const failedIcons = svgResults.filter(r => !r.success);

  if (successfulIcons.length === 0) {
    throw new Error('All icon fetches failed. Check icon names and connectivity.');
  }

  sendProgress({
    status: `Fetched ${successfulIcons.length}/${icons.length} icons. Creating components...`
  });

  // Create components in Figma
  const result = await api.executeInFigma(`
    const iconsData = ${JSON.stringify(successfulIcons)};
    const createComponentSet = ${createComponentSet};
    const componentSetName = "${componentSetName}";
    const components = [];
    const errors = [];

    // Create each icon component
    for (const iconData of iconsData) {
      try {
        const { svgContent, iconType, fullIconName, iconPrefix, iconBaseName, iconSpec, color, colorVariable } = iconData;

        // Create node from SVG
        const iconNode = figma.createNodeFromSvg(svgContent);

        // Create component
        const component = figma.createComponent();
        const iconSize = iconSpec.size || ${size};
        component.resize(iconSize, iconSize);

        // Determine component name
        if (createComponentSet) {
          if (iconSpec.variant) {
            // ComponentSet with explicit variant
            component.name = \`Type=\${iconBaseName}, Variant=\${iconSpec.variant}\`;
          } else {
            // ComponentSet without variant - use Type property
            const capitalizedName = iconBaseName.charAt(0).toUpperCase() + iconBaseName.slice(1);
            component.name = \`Type=\${capitalizedName}\`;
          }
        } else if (iconSpec.componentName) {
          component.name = iconSpec.componentName;
        } else {
          component.name = \`Icon/\${iconBaseName.charAt(0).toUpperCase() + iconBaseName.slice(1)}\`;
        }

        // Append and center icon
        component.appendChild(iconNode);
        iconNode.x = (component.width - iconNode.width) / 2;
        iconNode.y = (component.height - iconNode.height) / 2;

        // Set constraints to SCALE for proportional resizing
        iconNode.constraints = {
          horizontal: 'SCALE',
          vertical: 'SCALE'
        };

        // Lock aspect ratio to maintain proportions
        iconNode.lockAspectRatio();

        // Apply fixed stroke width for stroke icons (optical sizing best practice)
        const vectors = iconNode.findAll(node => node.type === 'VECTOR');
        vectors.forEach(vector => {
          if (vector.strokes && vector.strokes.length > 0) {
            vector.strokeWeight = iconData.strokeWidth;
          }
        });

        // Apply color based on icon type and color data
        if (color || colorVariable) {
          const vectors = iconNode.findAll(node => node.type === 'VECTOR');

          if (iconType === 'stroke') {
            // Stroke icons (outline)
            vectors.forEach(vector => {
              if (color) {
                // Parse hex color
                const hex = color.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                vector.strokes = [{ type: 'SOLID', color: { r, g, b } }];
                if (vector.strokeWeight === 0) vector.strokeWeight = 2;
              }
            });
          } else if (iconType === 'fill') {
            // Fill icons (solid)
            vectors.forEach(vector => {
              if (color) {
                // Parse hex color
                const hex = color.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                vector.fills = [{ type: 'SOLID', color: { r, g, b } }];
              }
            });
          } else if (iconType === 'duotone') {
            // Duotone icons (multiple layers with opacity)
            vectors.forEach((vector, index) => {
              if (color) {
                const hex = color.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16) / 255;
                const g = parseInt(hex.substring(2, 4), 16) / 255;
                const b = parseInt(hex.substring(4, 6), 16) / 255;
                const opacity = index === 0 ? 0.3 : 1.0;
                vector.fills = [{ type: 'SOLID', color: { r, g, b }, opacity }];
              }
            });
          }
        }

        components.push({
          id: component.id,
          name: component.name,
          iconName: fullIconName,
          iconType: iconType,
          size: iconSize
        });

        // Don't add to page yet if creating ComponentSet
        if (!createComponentSet) {
          figma.currentPage.appendChild(component);
        }
      } catch (error) {
        errors.push({
          iconName: iconData.fullIconName,
          error: error.message
        });
      }
    }

    let componentSetId = null;

    // Create ComponentSet if requested
    if (createComponentSet && components.length > 1) {
      try {
        // Get component nodes
        const componentNodes = components.map(c =>
          figma.getNodeById(c.id)
        ).filter(Boolean);

        if (componentNodes.length > 1) {
          // Create ComponentSet from components
          const componentSet = figma.combineAsVariants(componentNodes, figma.currentPage);
          componentSet.name = componentSetName;

          // Enable auto layout
          componentSet.layoutMode = 'HORIZONTAL';
          componentSet.primaryAxisSizingMode = 'AUTO';
          componentSet.counterAxisSizingMode = 'AUTO';
          componentSet.itemSpacing = 16;
          componentSet.paddingLeft = 24;
          componentSet.paddingRight = 24;
          componentSet.paddingTop = 24;
          componentSet.paddingBottom = 24;

          // Add blue border
          componentSet.strokes = [{
            type: 'SOLID',
            color: { r: 0.231, g: 0.510, b: 0.945 } // #3B82F6 (blue)
          }];
          componentSet.strokeWeight = 1;
          componentSet.cornerRadius = 8;

          componentSetId = componentSet.id;

          // Select ComponentSet
          figma.currentPage.selection = [componentSet];
          figma.viewport.scrollAndZoomIntoView([componentSet]);
        }
      } catch (error) {
        errors.push({
          operation: 'ComponentSet creation',
          error: error.message
        });
      }
    } else if (components.length > 0) {
      // Select all components
      const componentNodes = components.map(c =>
        figma.getNodeById(c.id)
      ).filter(Boolean);

      figma.currentPage.selection = componentNodes;
      if (componentNodes.length > 0) {
        figma.viewport.scrollAndZoomIntoView(componentNodes);
      }
    }

    return {
      success: true,
      totalRequested: ${icons.length},
      componentsCreated: components.length,
      componentSetCreated: componentSetId !== null,
      componentSetId: componentSetId,
      components: components,
      failedFetches: ${failedIcons.length},
      errors: errors.concat(${JSON.stringify(failedIcons)})
    };
  `);

  const summary = result.result;
  sendProgress({
    status: `Created ${summary.componentsCreated} icon components${summary.componentSetCreated ? ' as ComponentSet' : ''}`
  });

  return summary;
}

/**
 * Tool: search_icons
 * Search for icons across all Iconify icon sets
 */
async function searchIcons(api, args, sendProgress) {
  const {
    query,
    limit = 64,
    prefix,
    category
  } = args;

  if (!query || query.trim().length === 0) {
    throw new Error('Search query is required');
  }

  sendProgress({ status: `Searching for icons matching "${query}"...` });

  // Build search URL
  let url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=${limit}`;
  if (prefix) url += `&prefix=${encodeURIComponent(prefix)}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Icon search is currently disabled');
      }
      throw new Error(`Search failed: HTTP ${response.status}`);
    }

    const data = await response.json();

    sendProgress({ status: `Found ${data.total} matching icons` });

    // Generate example tool calls for first few results
    const exampleToolCalls = (data.icons || []).slice(0, 3).map(iconName => ({
      tool: 'create_icon_component',
      parameters: {
        iconName,
        size: 24,
        color: '#000000'
      }
    }));

    return {
      success: true,
      query,
      total: data.total,
      icons: data.icons || [],
      limit: data.limit,
      collections: data.collections || {},
      hasMore: data.icons && data.icons.length === limit,
      examples: {
        description: 'Example tool calls to create icons from search results:',
        toolCalls: exampleToolCalls
      }
    };
  } catch (error) {
    throw new Error(`Icon search failed: ${error.message}`);
  }
}

module.exports = {
  create_icon_component: createIconComponent,
  batch_create_icons: batchCreateIcons,
  search_icons: searchIcons
};
