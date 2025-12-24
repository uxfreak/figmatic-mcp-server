// Screenshot a component by ID or name and save to file
const {
  startServer,
  executeInFigma,
  notifyFigma
} = require('./websocket-server/server');
const fs = require('fs');
const path = require('path');

// Configuration: Component to screenshot
const COMPONENT_NAME = 'SettingsListItem';  // Change this to any component name
const COMPONENT_ID = null;  // Or use a specific ID like '54:123'
const SCALE = 2;  // Export resolution (1 = 100%, 2 = 200%, 3 = 300%)
const FORMAT = 'PNG';  // 'PNG', 'JPG', or 'SVG_STRING'

console.log(`📸 Screenshot Component\n`);
console.log(`   Component: ${COMPONENT_ID || COMPONENT_NAME}`);
console.log(`   Format: ${FORMAT}`);
console.log(`   Scale: ${SCALE}x\n`);

startServer();

setTimeout(async () => {
  console.log('\n📡 Connecting to Figma...\n');

  try {
    const script = `
      // Find component by ID or name
      let component = null;

      if (${JSON.stringify(COMPONENT_ID)}) {
        // Get by ID
        component = figma.getNodeById(${JSON.stringify(COMPONENT_ID)});
      } else {
        // Search by name
        function findComponent(node, name) {
          if ((node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') && node.name === name) {
            return node;
          }
          if ('children' in node) {
            for (const child of node.children) {
              const found = findComponent(child, name);
              if (found) return found;
            }
          }
          return null;
        }

        for (const page of figma.root.children) {
          component = findComponent(page, ${JSON.stringify(COMPONENT_NAME)});
          if (component) break;
        }
      }

      if (!component) {
        throw new Error('Component not found: ' + (${JSON.stringify(COMPONENT_ID)} || ${JSON.stringify(COMPONENT_NAME)}));
      }

      // Prepare export settings
      const exportSettings = {};

      if (${JSON.stringify(FORMAT)} === 'SVG_STRING') {
        exportSettings.format = 'SVG_STRING';
        exportSettings.svgOutlineText = true;
        exportSettings.svgIdAttribute = true;
      } else {
        exportSettings.format = ${JSON.stringify(FORMAT)};
        exportSettings.constraint = {
          type: 'SCALE',
          value: ${SCALE}
        };
      }

      // Export component
      const exported = await component.exportAsync(exportSettings);

      // Return result
      return {
        success: true,
        component: {
          id: component.id,
          name: component.name,
          type: component.type,
          width: component.width,
          height: component.height
        },
        export: {
          format: ${JSON.stringify(FORMAT)},
          scale: ${SCALE},
          size: exported.length || exported.byteLength || (typeof exported === 'string' ? exported.length : 0),
          isSVG: ${JSON.stringify(FORMAT)} === 'SVG_STRING'
        },
        data: exported
      };
    `;

    const result = await executeInFigma(script);
    const data = result.result;

    console.log('✅ Screenshot captured successfully!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 COMPONENT INFO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`   Name: "${data.component.name}"`);
    console.log(`   Type: ${data.component.type}`);
    console.log(`   ID: ${data.component.id}`);
    console.log(`   Size: ${data.component.width}px × ${data.component.height}px\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📸 EXPORT INFO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`   Format: ${data.export.format}`);
    console.log(`   Scale: ${data.export.scale}x`);
    console.log(`   Data Size: ${(data.export.size / 1024).toFixed(2)} KB\n`);

    // Save to file
    const downloadsDir = path.join(require('os').homedir(), 'Downloads');
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const sanitizedName = data.component.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    let filename;
    let filepath;

    if (data.export.isSVG) {
      // Save SVG as text file
      filename = `${sanitizedName}_${timestamp}.svg`;
      filepath = path.join(downloadsDir, filename);
      fs.writeFileSync(filepath, data.data, 'utf8');
    } else {
      // Save image as binary file
      const ext = data.export.format.toLowerCase();
      filename = `${sanitizedName}_${data.export.scale}x_${timestamp}.${ext}`;
      filepath = path.join(downloadsDir, filename);

      // Convert Uint8Array to Buffer
      const buffer = Buffer.from(data.data);
      fs.writeFileSync(filepath, buffer);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 SAVED TO FILE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`   📁 ${filepath}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 SUCCESS!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await notifyFigma(`📸 Screenshot saved to Downloads!`, 3000);

    process.exit(0);

  } catch (error) {
    console.error('❌ Screenshot failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}, 10000);

console.log('⏳ Waiting for Figma plugin to connect (10 seconds)...\n');
