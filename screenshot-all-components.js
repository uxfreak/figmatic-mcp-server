// Screenshot ALL components in the current page and save to Downloads
const {
  startServer,
  executeInFigma,
  notifyFigma
} = require('./websocket-server/server');
const fs = require('fs');
const path = require('path');

// Configuration
const SCALE = 2;  // Export resolution (1 = 100%, 2 = 200%, 3 = 300%)
const FORMAT = 'PNG';  // 'PNG' or 'JPG'
const INCLUDE_COMPONENT_SETS = true;  // Screenshot COMPONENT_SET (variant containers)
const INCLUDE_INSTANCES = false;  // Screenshot component instances

console.log(`📸 Screenshot All Components\n`);
console.log(`   Format: ${FORMAT}`);
console.log(`   Scale: ${SCALE}x`);
console.log(`   Include Component Sets: ${INCLUDE_COMPONENT_SETS}`);
console.log(`   Include Instances: ${INCLUDE_INSTANCES}\n`);

startServer();

setTimeout(async () => {
  console.log('\n📡 Finding all components...\n');

  try {
    const script = `
      // Find all components recursively
      function findAllComponents(node, results = []) {
        if (node.type === 'COMPONENT' && ${JSON.stringify(!INCLUDE_INSTANCES)}) {
          results.push(node);
        } else if (node.type === 'COMPONENT_SET' && ${JSON.stringify(INCLUDE_COMPONENT_SETS)}) {
          results.push(node);
        } else if (node.type === 'INSTANCE' && ${JSON.stringify(INCLUDE_INSTANCES)}) {
          results.push(node);
        }

        if ('children' in node) {
          for (const child of node.children) {
            findAllComponents(child, results);
          }
        }

        return results;
      }

      const components = findAllComponents(figma.currentPage);

      if (components.length === 0) {
        throw new Error('No components found on current page');
      }

      // Export all components
      const screenshots = [];

      for (const component of components) {
        const exportSettings = {
          format: ${JSON.stringify(FORMAT)},
          constraint: {
            type: 'SCALE',
            value: ${SCALE}
          },
          contentsOnly: true
        };

        const bytes = await component.exportAsync(exportSettings);

        screenshots.push({
          id: component.id,
          name: component.name,
          type: component.type,
          width: component.width,
          height: component.height,
          bytes: Array.from(bytes),  // Convert Uint8Array to regular array for serialization
          size: bytes.length
        });
      }

      return {
        success: true,
        totalComponents: screenshots.length,
        screenshots: screenshots,
        format: ${JSON.stringify(FORMAT)},
        scale: ${SCALE}
      };
    `;

    console.log('📡 Exporting components...\n');
    const result = await executeInFigma(script);
    const data = result.result;

    console.log(`✅ ${data.totalComponents} components exported!\n`);

    // Create output directory
    const downloadsDir = path.join(require('os').homedir(), 'Downloads');
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const outputDir = path.join(downloadsDir, `figma-components-${timestamp}`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 SAVING FILES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Save all screenshots
    data.screenshots.forEach((screenshot, index) => {
      // Sanitize filename
      const sanitizedName = screenshot.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const ext = data.format.toLowerCase();
      const filename = `${sanitizedName}_${data.scale}x.${ext}`;
      const filepath = path.join(outputDir, filename);

      // Convert array back to Buffer
      const buffer = Buffer.from(screenshot.bytes);
      fs.writeFileSync(filepath, buffer);

      console.log(`   ${index + 1}. ${screenshot.name}`);
      console.log(`      ${screenshot.type} (${screenshot.width}×${screenshot.height}px)`);
      console.log(`      ${(screenshot.size / 1024).toFixed(2)} KB → ${filename}\n`);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const totalSize = data.screenshots.reduce((sum, s) => sum + s.size, 0);
    console.log(`   Total Components: ${data.totalComponents}`);
    console.log(`   Total Size: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`   Format: ${data.format} @ ${data.scale}x`);
    console.log(`   Output: ${outputDir}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 SUCCESS!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await notifyFigma(`📸 ${data.totalComponents} screenshots saved!`, 3000);

    process.exit(0);

  } catch (error) {
    console.error('❌ Screenshot failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}, 10000);

console.log('⏳ Waiting for Figma plugin to connect (10 seconds)...\n');
