// Create auto layout with 3 SettingsListItem instances
const {
  startServer,
  executeInFigma,
  notifyFigma
} = require('./websocket-server/server');

console.log('🎨 Creating Settings List with Glass Card Style\n');

startServer();

setTimeout(async () => {
  console.log('\n📡 Creating component...\n');

  try {
    const script = `
      // Find the SettingsListItem component
      function findComponent(node, name) {
        if (node.type === 'COMPONENT_SET' && node.name === name) {
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

      let settingsComponent = null;
      for (const page of figma.root.children) {
        settingsComponent = findComponent(page, 'SettingsListItem');
        if (settingsComponent) break;
      }

      if (!settingsComponent) {
        throw new Error('SettingsListItem component not found');
      }

      // Find the Glass Card Store paint style
      const paintStyles = await figma.getLocalPaintStylesAsync();
      const glassCardStyle = paintStyles.find(s => s.name === 'Glass Card Store');

      if (!glassCardStyle) {
        throw new Error('Glass Card Store style not found');
      }

      // Get spacing-4 and card-radius variables
      const variables = await figma.variables.getLocalVariablesAsync();
      const spacing4 = variables.find(v => v.name === 'Spacing/spacing-4');
      const cardRadius = variables.find(v => v.name === 'Dimensions/Radius/card-radius');

      // Create auto layout container
      const container = figma.createFrame();
      container.name = 'Settings List Container';
      container.layoutMode = 'VERTICAL';
      container.primaryAxisSizingMode = 'AUTO'; // Hug contents
      container.counterAxisSizingMode = 'AUTO'; // Hug contents
      container.itemSpacing = 0; // No spacing between items (they have their own dividers)

      // Apply padding (spacing-4 = 16px)
      const paddingValue = spacing4 ? spacing4.valuesByMode[Object.keys(spacing4.valuesByMode)[0]] : 16;
      container.paddingLeft = paddingValue;
      container.paddingRight = paddingValue;
      container.paddingTop = paddingValue;
      container.paddingBottom = paddingValue;

      // Apply corner radius (card-radius = 16px)
      const radiusValue = cardRadius ? cardRadius.valuesByMode[Object.keys(cardRadius.valuesByMode)[0]] : 16;
      container.cornerRadius = radiusValue;

      // Apply Glass Card Store fill style
      await container.setFillStyleIdAsync(glassCardStyle.id);

      // Create 3 instances with different order properties
      const orders = ['first', 'middle', 'last'];
      const instances = [];

      for (let i = 0; i < 3; i++) {
        // Create instance from component set
        const instance = settingsComponent.defaultVariant.createInstance();

        // Set the order property
        instance.setProperties({
          'order': orders[i]
        });

        // Set default text values for demo
        instance.setProperties({
          'Title#54:30': \`Setting \${i + 1}\`,
          'Help Text#54:37': \`Description for setting \${i + 1}\`,
          'Show Help Text#51:23': true
        });

        // Add to container
        container.appendChild(instance);
        instances.push({
          id: instance.id,
          name: instance.name,
          order: orders[i]
        });
      }

      // Position container on canvas
      container.x = 100;
      container.y = 100;

      // Add to current page
      figma.currentPage.appendChild(container);
      figma.currentPage.selection = [container];
      figma.viewport.scrollAndZoomIntoView([container]);

      return {
        success: true,
        container: {
          id: container.id,
          name: container.name,
          width: container.width,
          height: container.height,
          padding: paddingValue,
          cornerRadius: radiusValue,
          fillStyle: glassCardStyle.name
        },
        instances: instances,
        message: 'Created auto layout with 3 SettingsListItem instances'
      };
    `;

    const result = await executeInFigma(script);
    const data = result.result;

    console.log('✅ Settings List created successfully!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 CONTAINER PROPERTIES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`   Name: "${data.container.name}"`);
    console.log(`   ID: ${data.container.id}`);
    console.log(`   Size: ${data.container.width}px × ${data.container.height}px`);
    console.log(`   Padding: ${data.container.padding}px (all sides)`);
    console.log(`   Corner Radius: ${data.container.cornerRadius}px`);
    console.log(`   Fill Style: "${data.container.fillStyle}"`);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 INSTANCES CREATED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    data.instances.forEach((instance, i) => {
      console.log(`   ${i + 1}. Order: "${instance.order}"`);
      console.log(`      ID: ${instance.id}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 SUCCESS!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎯 Check your Figma canvas to see:');
    console.log('   • Auto layout container with Glass Card Store gradient');
    console.log('   • 16px padding (spacing-4)');
    console.log('   • 16px corner radius (card-radius)');
    console.log('   • 3 SettingsListItem instances (first, middle, last)');
    console.log('   • Custom titles: "Setting 1", "Setting 2", "Setting 3"\n');

    await notifyFigma('✨ Settings List created!', 4000);

    process.exit(0);

  } catch (error) {
    console.error('❌ Creation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}, 10000);

console.log('⏳ Waiting for Figma plugin to connect (10 seconds)...\n');
