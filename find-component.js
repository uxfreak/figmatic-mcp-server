// Find and inspect a component by name
const {
  startServer,
  executeInFigma
} = require('./websocket-server/server');

const componentName = 'SettingsListItem';

console.log(`🔍 Searching for component: "${componentName}"\n`);

startServer();

setTimeout(async () => {
  console.log('\n📡 Searching Figma file...\n');

  try {
    const script = `
      const searchName = ${JSON.stringify(componentName)};

      // Helper to search recursively through node tree
      function findComponents(node, results = []) {
        // Check if this node is a component
        if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
          const nameLower = node.name.toLowerCase();
          const searchLower = searchName.toLowerCase();

          if (nameLower.includes(searchLower)) {
            results.push(node);
          }
        }

        // Recursively search children
        if ('children' in node) {
          for (const child of node.children) {
            findComponents(child, results);
          }
        }

        return results;
      }

      // Search through all pages
      const allComponents = [];
      for (const page of figma.root.children) {
        const pageComponents = findComponents(page);
        allComponents.push(...pageComponents);
      }

      if (allComponents.length === 0) {
        return {
          found: false,
          message: 'No components found matching: ' + searchName
        };
      }

      // Get detailed info for the first match
      const component = allComponents[0];

      // Helper to get component properties (for component sets)
      function getComponentProperties(comp) {
        if (comp.type === 'COMPONENT_SET' && comp.componentPropertyDefinitions) {
          return Object.entries(comp.componentPropertyDefinitions).map(([key, def]) => ({
            name: key,
            type: def.type,
            defaultValue: def.defaultValue,
            variantOptions: def.variantOptions || null
          }));
        }
        return null;
      }

      // Helper to get layout properties
      function getLayoutProps(node) {
        const layout = {};

        if (node.layoutMode && node.layoutMode !== 'NONE') {
          layout.layoutMode = node.layoutMode;
          layout.primaryAxisSizingMode = node.primaryAxisSizingMode;
          layout.counterAxisSizingMode = node.counterAxisSizingMode;
          layout.itemSpacing = node.itemSpacing;
          layout.paddingLeft = node.paddingLeft;
          layout.paddingRight = node.paddingRight;
          layout.paddingTop = node.paddingTop;
          layout.paddingBottom = node.paddingBottom;
          layout.primaryAxisAlignItems = node.primaryAxisAlignItems;
          layout.counterAxisAlignItems = node.counterAxisAlignItems;

          if (node.layoutWrap) {
            layout.layoutWrap = node.layoutWrap;
            layout.counterAxisSpacing = node.counterAxisSpacing;
          }
        }

        return Object.keys(layout).length > 0 ? layout : null;
      }

      // Helper to get children info
      function getChildrenInfo(node) {
        if (!('children' in node)) return null;

        return node.children.map(child => ({
          id: child.id,
          name: child.name,
          type: child.type,
          visible: child.visible,
          width: child.width,
          height: child.height,
          ...(child.characters ? { characters: child.characters } : {}),
          ...(child.layoutAlign ? { layoutAlign: child.layoutAlign } : {}),
          ...(child.layoutGrow ? { layoutGrow: child.layoutGrow } : {}),
          ...(child.layoutPositioning ? { layoutPositioning: child.layoutPositioning } : {})
        }));
      }

      // Helper to check bound variables
      function getBoundVars(node) {
        const boundVars = node.boundVariables || {};
        const result = {};

        for (const [field, binding] of Object.entries(boundVars)) {
          if (binding && binding.id) {
            const variable = figma.variables.getVariableById(binding.id);
            if (variable) {
              result[field] = {
                variableId: variable.id,
                variableName: variable.name,
                type: variable.resolvedType
              };
            }
          }
        }

        return Object.keys(result).length > 0 ? result : null;
      }

      // Build comprehensive component info
      const componentInfo = {
        found: true,
        totalMatches: allComponents.length,
        component: {
          // Basic properties
          id: component.id,
          name: component.name,
          type: component.type,

          // Dimensions
          width: component.width,
          height: component.height,
          x: component.x,
          y: component.y,

          // Visual properties
          visible: component.visible,
          locked: component.locked,
          opacity: component.opacity,
          blendMode: component.blendMode,

          // Fills & Strokes
          fills: component.fills,
          fillStyleId: component.fillStyleId || null,
          strokes: component.strokes,
          strokeStyleId: component.strokeStyleId || null,
          strokeWeight: component.strokeWeight,
          strokeAlign: component.strokeAlign,

          // Effects
          effects: component.effects,
          effectStyleId: component.effectStyleId || null,

          // Corner radius
          cornerRadius: component.cornerRadius,
          topLeftRadius: component.topLeftRadius,
          topRightRadius: component.topRightRadius,
          bottomLeftRadius: component.bottomLeftRadius,
          bottomRightRadius: component.bottomRightRadius,

          // Constraints
          constraints: component.constraints,

          // Layout properties (if auto layout)
          layoutProperties: getLayoutProps(component),

          // Component-specific
          description: component.description || null,
          documentationLinks: component.documentationLinks || [],
          remote: component.remote || false,
          key: component.key || null,

          // Component properties (for component sets with variants)
          componentProperties: getComponentProperties(component),

          // Bound variables
          boundVariables: getBoundVars(component),

          // Children
          childrenCount: ('children' in component) ? component.children.length : 0,
          children: getChildrenInfo(component),

          // Parent info
          parent: {
            id: component.parent.id,
            name: component.parent.name,
            type: component.parent.type
          }
        }
      };

      // If multiple matches, include their names
      if (allComponents.length > 1) {
        componentInfo.otherMatches = allComponents.slice(1).map(c => ({
          id: c.id,
          name: c.name,
          type: c.type
        }));
      }

      return componentInfo;
    `;

    const result = await executeInFigma(script);
    const data = result.result;

    if (!data.found) {
      console.log(`❌ ${data.message}\n`);
      process.exit(1);
    }

    console.log('✅ Component found!\n');

    if (data.totalMatches > 1) {
      console.log(`ℹ️  Found ${data.totalMatches} matching components. Showing details for first match.\n`);
    }

    const comp = data.component;

    // ============================================
    // BASIC INFO
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 BASIC PROPERTIES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`   Name: "${comp.name}"`);
    console.log(`   Type: ${comp.type}`);
    console.log(`   ID: ${comp.id}`);
    console.log(`   Key: ${comp.key || 'N/A'}`);
    if (comp.description) {
      console.log(`   Description: ${comp.description}`);
    }
    console.log('');

    // ============================================
    // DIMENSIONS
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📏 DIMENSIONS & POSITION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`   Width: ${comp.width}px`);
    console.log(`   Height: ${comp.height}px`);
    console.log(`   Position: x=${comp.x}, y=${comp.y}`);
    console.log(`   Visible: ${comp.visible}`);
    console.log(`   Locked: ${comp.locked}`);
    console.log(`   Opacity: ${comp.opacity}`);
    console.log('');

    // ============================================
    // VISUAL PROPERTIES
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎨 VISUAL PROPERTIES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`   Fills: ${comp.fills.length} fill(s)`);
    comp.fills.forEach((fill, i) => {
      console.log(`      ${i + 1}. Type: ${fill.type}`);
      if (fill.type === 'SOLID' && fill.color) {
        const r = Math.round(fill.color.r * 255);
        const g = Math.round(fill.color.g * 255);
        const b = Math.round(fill.color.b * 255);
        console.log(`         Color: rgb(${r}, ${g}, ${b})`);
      }
    });
    if (comp.fillStyleId) {
      console.log(`   Fill Style ID: ${comp.fillStyleId}`);
    }

    console.log(`\n   Strokes: ${comp.strokes.length} stroke(s)`);
    if (comp.strokes.length > 0) {
      console.log(`   Stroke Weight: ${comp.strokeWeight}px`);
      console.log(`   Stroke Align: ${comp.strokeAlign}`);
    }

    console.log(`\n   Effects: ${comp.effects.length} effect(s)`);
    comp.effects.forEach((effect, i) => {
      console.log(`      ${i + 1}. Type: ${effect.type}`);
      if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        console.log(`         Offset: x=${effect.offset.x}, y=${effect.offset.y}`);
        console.log(`         Radius: ${effect.radius}px`);
      }
    });

    console.log(`\n   Corner Radius: ${comp.cornerRadius || 0}px`);
    if (comp.topLeftRadius !== comp.cornerRadius) {
      console.log(`      Top Left: ${comp.topLeftRadius}px`);
      console.log(`      Top Right: ${comp.topRightRadius}px`);
      console.log(`      Bottom Left: ${comp.bottomLeftRadius}px`);
      console.log(`      Bottom Right: ${comp.bottomRightRadius}px`);
    }
    console.log('');

    // ============================================
    // LAYOUT PROPERTIES
    // ============================================
    if (comp.layoutProperties) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📐 AUTO LAYOUT PROPERTIES');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const layout = comp.layoutProperties;
      console.log(`   Layout Mode: ${layout.layoutMode}`);
      console.log(`   Primary Axis Sizing: ${layout.primaryAxisSizingMode}`);
      console.log(`   Counter Axis Sizing: ${layout.counterAxisSizingMode}`);
      console.log(`   Item Spacing: ${layout.itemSpacing}px`);
      console.log(`   Padding: L=${layout.paddingLeft} R=${layout.paddingRight} T=${layout.paddingTop} B=${layout.paddingBottom}`);
      console.log(`   Primary Axis Align: ${layout.primaryAxisAlignItems}`);
      console.log(`   Counter Axis Align: ${layout.counterAxisAlignItems}`);
      if (layout.layoutWrap) {
        console.log(`   Layout Wrap: ${layout.layoutWrap}`);
        console.log(`   Counter Axis Spacing: ${layout.counterAxisSpacing}px`);
      }
      console.log('');
    }

    // ============================================
    // COMPONENT PROPERTIES (VARIANTS)
    // ============================================
    if (comp.componentProperties && comp.componentProperties.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚙️  COMPONENT PROPERTIES (VARIANTS)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      comp.componentProperties.forEach((prop, i) => {
        console.log(`   ${i + 1}. "${prop.name}"`);
        console.log(`      Type: ${prop.type}`);
        console.log(`      Default: ${prop.defaultValue}`);
        if (prop.variantOptions) {
          console.log(`      Options: ${prop.variantOptions.join(', ')}`);
        }
        console.log('');
      });
    }

    // ============================================
    // BOUND VARIABLES
    // ============================================
    if (comp.boundVariables) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔗 BOUND VARIABLES');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      Object.entries(comp.boundVariables).forEach(([field, binding]) => {
        console.log(`   ${field}:`);
        console.log(`      Variable: "${binding.variableName}"`);
        console.log(`      Type: ${binding.type}`);
        console.log(`      ID: ${binding.variableId}`);
        console.log('');
      });
    }

    // ============================================
    // CHILDREN
    // ============================================
    if (comp.children && comp.children.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`👶 CHILDREN (${comp.childrenCount} total)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      comp.children.forEach((child, i) => {
        console.log(`   ${i + 1}. "${child.name}" (${child.type})`);
        console.log(`      ID: ${child.id}`);
        console.log(`      Size: ${child.width}x${child.height}px`);
        console.log(`      Visible: ${child.visible}`);
        if (child.characters) {
          console.log(`      Text: "${child.characters}"`);
        }
        if (child.layoutAlign) {
          console.log(`      Layout Align: ${child.layoutAlign}`);
        }
        if (child.layoutPositioning) {
          console.log(`      Layout Positioning: ${child.layoutPositioning}`);
        }
        console.log('');
      });
    }

    // ============================================
    // OTHER MATCHES
    // ============================================
    if (data.otherMatches && data.otherMatches.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📋 OTHER MATCHES (${data.otherMatches.length})`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      data.otherMatches.forEach((match, i) => {
        console.log(`   ${i + 1}. "${match.name}" (${match.type})`);
        console.log(`      ID: ${match.id}`);
        console.log('');
      });
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`   Component: "${comp.name}"`);
    console.log(`   Type: ${comp.type}`);
    console.log(`   Size: ${comp.width}x${comp.height}px`);
    console.log(`   Children: ${comp.childrenCount}`);
    console.log(`   Auto Layout: ${comp.layoutProperties ? 'Yes (' + comp.layoutProperties.layoutMode + ')' : 'No'}`);
    console.log(`   Variant Properties: ${comp.componentProperties ? comp.componentProperties.length : 0}`);
    console.log(`   Bound Variables: ${comp.boundVariables ? Object.keys(comp.boundVariables).length : 0}`);
    console.log('');

    process.exit(0);

  } catch (error) {
    console.error('❌ Search failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}, 10000);

console.log('⏳ Waiting for Figma plugin to connect (10 seconds)...\n');
