/**
 * Layer 1: Visual Layer
 *
 * Takes screenshots of Figma nodes/screens.
 * Use this for quick visual understanding.
 *
 * Usage: node 01-visual-layer.js
 */

const { runScript, createScreenshotHelper } = require('../../lib');

runScript("Visual Layer - Screenshot", async (api) => {
  const screenshot = createScreenshotHelper(api);

  // Take screenshot of Help Screen
  const nodeId = "146:4867";

  console.log(`\n📸 Taking screenshot of node ${nodeId}...\n`);

  const result = await screenshot.screenshotById(nodeId, {
    scale: 2,
    format: 'PNG',
    filename: 'help-screen.png'
  });

  console.log("✓ Screenshot captured!");
  console.log(`  Path: ${result.path}`);
  console.log(`  Size: ${result.width}x${result.height} @ ${result.scale}x`);
  console.log(`  File size: ${(result.size / 1024).toFixed(2)} KB`);
  console.log(`  Node: ${result.nodeName} (${result.nodeType})`);

  console.log("\n💡 Next step: Run 02-structural-layer.js to see component structure\n");
});
