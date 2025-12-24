// List all components in the Figma file
const {
  startServer,
  executeInFigma
} = require('./websocket-server/server');

console.log('📦 Listing all components in Figma file\n');

startServer();

setTimeout(async () => {
  console.log('\n📡 Searching Figma file...\n');

  try {
    const script = `
      // Helper to find all components
      function findAllComponents(node, results = []) {
        if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
          results.push({
            id: node.id,
            name: node.name,
            type: node.type,
            width: node.width,
            height: node.height,
            parent: node.parent.name,
            childrenCount: ('children' in node) ? node.children.length : 0
          });
        }

        if ('children' in node) {
          for (const child of node.children) {
            findAllComponents(child, results);
          }
        }

        return results;
      }

      // Search all pages
      const allComponents = [];
      for (const page of figma.root.children) {
        const pageComponents = findAllComponents(page);
        allComponents.push(...pageComponents);
      }

      return {
        total: allComponents.length,
        components: allComponents
      };
    `;

    const result = await executeInFigma(script);
    const data = result.result;

    console.log(`✅ Found ${data.total} components\n`);

    if (data.total === 0) {
      console.log('No components found in this file.\n');
      process.exit(0);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 ALL COMPONENTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    data.components.forEach((comp, index) => {
      console.log(`${index + 1}. "${comp.name}"`);
      console.log(`   Type: ${comp.type}`);
      console.log(`   Size: ${comp.width}x${comp.height}px`);
      console.log(`   Parent: ${comp.parent}`);
      console.log(`   Children: ${comp.childrenCount}`);
      console.log(`   ID: ${comp.id}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total: ${data.total} components\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}, 10000);

console.log('⏳ Waiting for Figma plugin to connect (10 seconds)...\n');
