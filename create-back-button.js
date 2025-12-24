// Create BackButton Component - Step by Step
const {
  startServer,
  executeInFigma,
  getAllVariables,
  notifyFigma
} = require('./websocket-server/server');

console.log('🔙 Creating BackButton Component\n');

startServer();

setTimeout(async () => {
  console.log('\n🚀 Step-by-step BackButton creation...\n');

  try {
    // Step 1: Get all variables to find the ones we need
    console.log('📊 Step 1: Getting variables for bindings...');
    const allVars = await getAllVariables();

    // Find the variables we need
    const dim10 = allVars.variables.find(v => v.name === 'Dimensions/dim-10');
    const iconContainer = allVars.variables.find(v => v.name === 'Dimensions/Radius/icon-container');
    const iconColor = allVars.variables.find(v => v.name === 'Icons/Icon Color');

    console.log(`✓ Found dim-10: ${dim10?.id} (40px)`);
    console.log(`✓ Found icon-container radius: ${iconContainer?.id} (20px)`);
    console.log(`✓ Found Icon Color variable: ${iconColor?.id}\n`);

    // Step 2: Create the BackButton frame structure
    console.log('🎨 Step 2: Creating BackButton frame...');
    const buttonFrame = await executeInFigma(`
      // Create container frame
      const container = figma.createFrame();
      container.name = "BackButton";
      container.resize(40, 40);
      container.cornerRadius = 20;

      // Make it transparent/subtle background
      container.fills = [{
        type: 'SOLID',
        color: { r: 0, g: 0, b: 0 },
        opacity: 0.05  // Very subtle background
      }];

      // Add to current page
      figma.currentPage.appendChild(container);

      // Center in viewport for easy viewing
      container.x = figma.viewport.center.x - 20;
      container.y = figma.viewport.center.y - 20;

      return {
        id: container.id,
        name: container.name,
        width: container.width,
        height: container.height
      };
    `);

    console.log(`✓ Created frame: ${buttonFrame.result.name}`);
    console.log(`   ID: ${buttonFrame.result.id}`);
    console.log(`   Size: ${buttonFrame.result.width}×${buttonFrame.result.height}px\n`);

    // Step 3: Check if arrow-left icon exists
    console.log('🔍 Step 3: Checking for arrow-left icon...');
    const iconCheck = await executeInFigma(`
      // Search for arrow-left icon component
      const allComponents = figma.root.findAll(node =>
        node.type === 'COMPONENT' &&
        node.name.toLowerCase().includes('arrow-left')
      );

      return {
        found: allComponents.length > 0,
        icons: allComponents.map(c => ({ id: c.id, name: c.name }))
      };
    `);

    if (iconCheck.result.found) {
      console.log(`✓ Found ${iconCheck.result.icons.length} arrow icon(s):`);
      iconCheck.result.icons.forEach(icon => {
        console.log(`   - ${icon.name} (${icon.id})`);
      });
      console.log('');
    } else {
      console.log('⚠️  No arrow-left icon found. Using chevron-left as placeholder.\n');
    }

    // Step 4: Add icon to the button
    console.log('🎯 Step 4: Adding icon to button...');
    const withIcon = await executeInFigma(`
      const container = figma.getNodeById('${buttonFrame.result.id}');

      // Try to find arrow-left icon
      let iconComponent = figma.root.findOne(node =>
        node.type === 'COMPONENT' &&
        (node.name.toLowerCase().includes('arrow-left') ||
         node.name.toLowerCase().includes('chevron-left'))
      );

      let icon;
      if (iconComponent) {
        // Create instance of the icon component
        icon = iconComponent.createInstance();
        console.log('Using icon component: ' + iconComponent.name);
      } else {
        // Fallback: create a simple arrow shape
        const arrow = figma.createVector();
        arrow.name = "arrow-left";

        // Simple left arrow path (24x24)
        arrow.vectorPaths = [{
          windingRule: "NONZERO",
          data: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
        }];

        arrow.resize(24, 24);
        arrow.strokes = [{ type: 'SOLID', color: { r: 0.07, g: 0.07, b: 0.07 } }];
        arrow.strokeWeight = 2;
        icon = arrow;
        console.log('Created fallback arrow icon');
      }

      // Position icon in center of container
      icon.x = 8;  // (40 - 24) / 2
      icon.y = 8;  // (40 - 24) / 2

      // Add icon to container
      container.appendChild(icon);

      // Select the container for visibility
      figma.currentPage.selection = [container];
      figma.viewport.scrollAndZoomIntoView([container]);

      return {
        success: true,
        iconType: iconComponent ? 'component-instance' : 'vector',
        iconName: icon.name
      };
    `);

    console.log(`✓ Added icon: ${withIcon.result.iconName} (${withIcon.result.iconType})\n`);

    // Step 5: Convert to component
    console.log('🔧 Step 5: Converting to component...');
    const component = await executeInFigma(`
      const frame = figma.getNodeById('${buttonFrame.result.id}');

      // Convert frame to component
      const component = figma.createComponentFromNode(frame);
      component.name = "BackButton";

      // Select it
      figma.currentPage.selection = [component];

      return {
        id: component.id,
        name: component.name,
        type: component.type,
        width: component.width,
        height: component.height
      };
    `);

    console.log(`✓ Created component: ${component.result.name}`);
    console.log(`   Type: ${component.result.type}`);
    console.log(`   ID: ${component.result.id}\n`);

    // Step 6: Show summary and next steps
    await notifyFigma('✅ BackButton component created!', 3000);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ BACKBUTTON COMPONENT CREATED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Component Details:');
    console.log(`   Name: ${component.result.name}`);
    console.log(`   ID: ${component.result.id}`);
    console.log(`   Size: 40×40px`);
    console.log(`   Border Radius: 20px (circular)`);
    console.log(`   Background: Black 5% opacity\n`);

    console.log('🎯 Next Steps (Manual in Figma):');
    console.log('   1. Select the BackButton component');
    console.log('   2. Bind width/height to "dim-10" variable (40px)');
    console.log('   3. Bind corner radius to "icon-container" variable (20px)');
    console.log('   4. Bind icon color to "Icon Color" variable');
    console.log('   5. Optional: Add variants for default/pressed states');
    console.log('   6. Optional: Adjust background opacity or make transparent\n');

    console.log('Variable IDs for binding:');
    if (dim10) console.log(`   - dim-10: ${dim10.id}`);
    if (iconContainer) console.log(`   - icon-container: ${iconContainer.id}`);
    if (iconColor) console.log(`   - Icon Color: ${iconColor.id}\n`);

    console.log('💡 The BackButton is now selected in Figma!');
    console.log('   You can see it in the center of your viewport.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin to connect...');
console.log('   (Please open "AI Agent Bridge" plugin in Figma Desktop)\n');
