/**
 * Complete Workflow Example
 *
 * Demonstrates using all 4 layers together to fully understand a Figma screen.
 *
 * Scenario: Analyze the Help Screen (Payment Methods) and understand
 *           how it's built, what variables it uses, and why.
 *
 * Usage: node 04-complete-workflow.js
 */

const { runScript, createScreenshotHelper } = require('../../lib');
const fs = require('fs');

runScript("Complete Workflow - All Layers", async (api) => {
  console.log("\n" + "=".repeat(80));
  console.log("PROGRESSIVE DISCLOSURE API - COMPLETE WORKFLOW");
  console.log("=".repeat(80) + "\n");

  const targetNodeId = "146:4867"; // Help Screen

  // ============================================================================
  // LAYER 0: Design System Context
  // ============================================================================
  console.log("📊 LAYER 0: Getting Design System Context...\n");

  const dsResult = await api.executeInFigma(`
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const allVars = await figma.variables.getLocalVariablesAsync();

    const varsByCollection = {};
    collections.forEach(col => {
      const vars = allVars.filter(v => v.variableCollectionId === col.id);
      varsByCollection[col.name] = {
        count: vars.length,
        variables: vars.map(v => v.name)
      };
    });

    return { collections: varsByCollection };
  `);

  console.log("✓ Design System Loaded:");
  Object.entries(dsResult.result.collections).forEach(([name, col]) => {
    console.log(`  - ${name}: ${col.count} variables`);
  });
  console.log("");

  // ============================================================================
  // LAYER 1: Visual
  // ============================================================================
  console.log("📸 LAYER 1: Capturing Screenshot...\n");

  const screenshot = createScreenshotHelper(api);
  const screenshotResult = await screenshot.screenshotById(targetNodeId, {
    scale: 2,
    format: 'PNG'
  });

  console.log("✓ Screenshot captured:");
  console.log(`  Path: ${screenshotResult.path}`);
  console.log(`  Size: ${screenshotResult.width}x${screenshotResult.height}`);
  console.log("");

  // ============================================================================
  // LAYER 2: Structural
  // ============================================================================
  console.log("🗺️  LAYER 2: Generating Component Map...\n");

  const mapResult = await api.executeInFigma(`
    const nodeId = "${targetNodeId}";
    const root = figma.getNodeById(nodeId);

    function mapNode(node, depth = 0) {
      const info = {
        name: node.name,
        type: node.type,
        id: node.id
      };

      if (node.type === "INSTANCE" && node.mainComponent) {
        info.component = node.mainComponent.name;
      }

      if (node.children && node.children.length > 0 && depth < 2) {
        info.children = node.children.map(c => mapNode(c, depth + 1));
      }

      return info;
    }

    return mapNode(root);
  `);

  function printTree(node, prefix = "", isLast = true) {
    const branch = isLast ? "└─ " : "├─ ";
    const componentInfo = node.component ? ` → ${node.component}` : "";
    console.log(prefix + branch + node.name + " (" + node.type + componentInfo + ") [" + node.id + "]");

    if (node.children) {
      const newPrefix = prefix + (isLast ? "   " : "│  ");
      node.children.forEach((child, i) => {
        printTree(child, newPrefix, i === node.children.length - 1);
      });
    }
  }

  console.log("✓ Component Map (top 2 levels):\n");
  printTree(mapResult.result);
  console.log("");

  // ============================================================================
  // LAYER 3: Detailed
  // ============================================================================
  console.log("🔍 LAYER 3: Extracting Node Details...\n");

  const detailsResult = await api.executeInFigma(`
    const nodeId = "${targetNodeId}";
    const node = figma.getNodeById(nodeId);
    const allVars = await figma.variables.getLocalVariablesAsync();
    const varMap = {};
    allVars.forEach(v => { varMap[v.id] = v.name; });

    function resolveVar(id) {
      return varMap[id] || id;
    }

    const fills = [];
    if (node.fills && node.fills.length > 0) {
      node.fills.forEach(fill => {
        const f = { type: fill.type };
        if (fill.type === 'SOLID' && fill.color) {
          f.color = {
            r: Math.round(fill.color.r * 255),
            g: Math.round(fill.color.g * 255),
            b: Math.round(fill.color.b * 255)
          };
        }
        if (fill.boundVariables && fill.boundVariables.color) {
          f.boundTo = resolveVar(fill.boundVariables.color.id);
        }
        fills.push(f);
      });
    }

    return {
      name: node.name,
      type: node.type,
      dimensions: { width: node.width, height: node.height },
      fills: fills
    };
  `);

  console.log("✓ Node Details:");
  console.log(JSON.stringify(detailsResult.result, null, 2));
  console.log("");

  // ============================================================================
  // RESOLUTION: Cross-reference Layer 3 with Layer 0
  // ============================================================================
  if (detailsResult.result.fills.some(f => f.boundTo)) {
    console.log("🔗 RESOLUTION: Understanding Bindings...\n");

    detailsResult.result.fills.forEach((fill, i) => {
      if (fill.boundTo) {
        console.log(`Fill ${i + 1} is bound to: ${fill.boundTo}`);

        // Find this variable in Layer 0
        const allCollections = dsResult.result.collections;
        let found = false;

        Object.entries(allCollections).forEach(([colName, col]) => {
          if (col.variables.includes(fill.boundTo)) {
            console.log(`  ↳ Found in collection: ${colName}`);
            found = true;
          }
        });

        if (!found) {
          console.log(`  ↳ Variable not found in design system`);
        }
      }
    });
    console.log("");
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(`✓ Layer 0: ${Object.keys(dsResult.result.collections).length} variable collections loaded`);
  console.log(`✓ Layer 1: Screenshot saved to ${screenshotResult.path}`);
  console.log(`✓ Layer 2: Component map generated with ${mapResult.result.children?.length || 0} top-level children`);
  console.log(`✓ Layer 3: Node details extracted for ${detailsResult.result.name}`);
  console.log("");
  console.log("💡 This workflow demonstrates progressive disclosure:");
  console.log("   1. Context (design system)");
  console.log("   2. Visual (screenshot)");
  console.log("   3. Structure (component map)");
  console.log("   4. Details (properties & bindings)");
  console.log("   5. Resolution (cross-reference bindings with design system)");
  console.log("=".repeat(80) + "\n");
});
