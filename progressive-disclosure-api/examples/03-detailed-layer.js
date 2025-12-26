/**
 * Layer 3: Detailed Layer
 *
 * Extracts detailed properties, bindings, and styles for a specific node.
 * Use this to understand how a component is built and what variables it uses.
 *
 * Usage: node 03-detailed-layer.js
 */

const { runScript } = require('../../lib');

runScript("Detailed Layer - Node Details", async (api) => {
  // Extract details for the Help Screen root frame
  const nodeId = "146:4867";

  console.log(`\n🔍 Extracting details for node ${nodeId}...\n`);

  const r = await api.executeInFigma(`
    const nodeId = "${nodeId}";
    const node = figma.getNodeById(nodeId);

    if (!node) {
      throw new Error("Node not found: " + nodeId);
    }

    // Get all variables for resolution
    const allVars = await figma.variables.getLocalVariablesAsync();
    const varMap = {};
    allVars.forEach(v => { varMap[v.id] = v.name; });

    function resolveVar(id) {
      return varMap[id] || id;
    }

    // Extract fills with bindings
    function extractFills(node) {
      if (!node.fills || node.fills.length === 0) return [];

      return node.fills.map(fill => {
        const f = {
          type: fill.type,
          visible: fill.visible !== false,
          opacity: fill.opacity !== undefined ? fill.opacity : 1
        };

        if (fill.type === 'SOLID' && fill.color) {
          f.color = {
            r: Math.round(fill.color.r * 255),
            g: Math.round(fill.color.g * 255),
            b: Math.round(fill.color.b * 255),
            a: fill.color.a !== undefined ? fill.color.a : 1
          };
        }

        if (fill.boundVariables && fill.boundVariables.color) {
          f.boundTo = resolveVar(fill.boundVariables.color.id);
        }

        return f;
      });
    }

    // Extract strokes with bindings
    function extractStrokes(node) {
      if (!node.strokes || node.strokes.length === 0) return [];

      return node.strokes.map(stroke => {
        const s = {
          type: stroke.type,
          visible: stroke.visible !== false
        };

        if (stroke.type === 'SOLID' && stroke.color) {
          s.color = {
            r: Math.round(stroke.color.r * 255),
            g: Math.round(stroke.color.g * 255),
            b: Math.round(stroke.color.b * 255)
          };
        }

        if (stroke.boundVariables && stroke.boundVariables.color) {
          s.boundTo = resolveVar(stroke.boundVariables.color.id);
        }

        return s;
      });
    }

    // Extract top-level bindings
    function extractBindings(node) {
      const bindings = {};
      if (!node.boundVariables) return bindings;

      Object.keys(node.boundVariables).forEach(key => {
        if (node.boundVariables[key] && node.boundVariables[key].id) {
          bindings[key] = resolveVar(node.boundVariables[key].id);
        }
      });

      return bindings;
    }

    // Build result
    const result = {
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

    if (node.layoutMode && node.layoutMode !== "NONE") {
      result.layout = {
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

    result.appearance = {
      fills: extractFills(node),
      strokes: extractStrokes(node),
      strokeWeight: node.strokeWeight,
      cornerRadius: node.cornerRadius,
      opacity: node.opacity
    };

    result.bindings = extractBindings(node);

    if (node.children && node.children.length > 0) {
      result.structure = {
        childCount: node.children.length,
        children: node.children.slice(0, 5).map(child => ({
          id: child.id,
          name: child.name,
          type: child.type
        }))
      };
    }

    return result;
  `);

  const details = r.result;

  console.log("✓ Node details extracted!\n");
  console.log("=".repeat(80));
  console.log(JSON.stringify(details, null, 2));
  console.log("=".repeat(80));

  // Highlight bindings if present
  if (details.appearance.fills.some(f => f.boundTo)) {
    console.log("\n🔗 Variable Bindings Found:");
    details.appearance.fills.forEach((fill, i) => {
      if (fill.boundTo) {
        console.log(`  Fill ${i + 1}: ${fill.boundTo}`);
      }
    });
  }

  if (Object.keys(details.bindings).length > 0) {
    console.log("\n🔗 Property Bindings:");
    Object.entries(details.bindings).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }

  console.log("\n💡 Cross-reference with Layer 0 (design-system-audit) to resolve variable values\n");
});
