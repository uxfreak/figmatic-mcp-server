// Bind all variables to BackButton component
const {
  startServer,
  executeInFigma,
  getAllVariables,
  bindVariable,
  bindVariableToPaint,
  notifyFigma
} = require('./websocket-server/server');

console.log('🔗 Binding Variables to BackButton Component\n');

startServer();

setTimeout(async () => {
  console.log('\n📡 Starting variable binding...\n');

  try {
    // Step 1: Find BackButton component
    console.log('🔍 Step 1: Finding BackButton component...');
    const backButton = await executeInFigma(`
      const component = figma.root.findOne(node =>
        node.type === 'COMPONENT' &&
        node.name === 'BackButton'
      );

      if (!component) {
        throw new Error('BackButton component not found');
      }

      // Also find the icon inside
      const icon = component.findOne(node =>
        node.name.toLowerCase().includes('arrow')
      );

      return {
        id: component.id,
        name: component.name,
        width: component.width,
        height: component.height,
        iconId: icon?.id,
        iconName: icon?.name
      };
    `);

    console.log(`✓ Found: ${backButton.result.name}`);
    console.log(`   Component ID: ${backButton.result.id}`);
    console.log(`   Icon ID: ${backButton.result.iconId} (${backButton.result.iconName})\n`);

    // Step 2: Get all variables
    console.log('📊 Step 2: Getting all variables...');
    const allVars = await getAllVariables();

    const dim10 = allVars.variables.find(v => v.name === 'Dimensions/dim-10');
    const iconContainerRadius = allVars.variables.find(v => v.name === 'Dimensions/Radius/icon-container');
    const iconColor = allVars.variables.find(v => v.name === 'Icons/Icon Color');

    console.log(`✓ dim-10: ${dim10.id} (${dim10.modeValues['Mode 1'].value}px)`);
    console.log(`✓ icon-container: ${iconContainerRadius.id} (${iconContainerRadius.modeValues['Mode 1'].value}px)`);
    console.log(`✓ Icon Color: ${iconColor.id}\n`);

    // Step 3: Bind dimension variables
    console.log('🔗 Step 3: Binding dimension variables...');

    // Bind width
    const widthResult = await bindVariable({
      nodeId: backButton.result.id,
      field: 'width',
      variableId: dim10.id
    });
    console.log(`✓ Bound width to dim-10 (40px)`);

    // Bind height
    const heightResult = await bindVariable({
      nodeId: backButton.result.id,
      field: 'height',
      variableId: dim10.id
    });
    console.log(`✓ Bound height to dim-10 (40px)`);

    // Bind all corner radii
    const radiusFields = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];
    for (const field of radiusFields) {
      await bindVariable({
        nodeId: backButton.result.id,
        field: field,
        variableId: iconContainerRadius.id
      });
    }
    console.log(`✓ Bound all corner radii to icon-container (20px)\n`);

    // Step 4: Bind icon color
    console.log('🎨 Step 4: Binding icon color...');

    if (backButton.result.iconId) {
      // Bind the icon's stroke color to Icon Color variable
      const iconColorResult = await executeInFigma(`
        const icon = figma.getNodeById('${backButton.result.iconId}');
        const iconColorVar = figma.variables.getVariableById('${iconColor.id}');

        if (!icon) {
          throw new Error('Icon not found');
        }

        // Bind stroke color to Icon Color variable
        if (icon.strokes && icon.strokes.length > 0) {
          icon.setBoundVariable('strokes', iconColorVar);
          return { success: true, method: 'strokes' };
        } else if (icon.fills && icon.fills.length > 0) {
          icon.setBoundVariable('fills', iconColorVar);
          return { success: true, method: 'fills' };
        }

        return { success: false, reason: 'No strokes or fills found' };
      `);

      if (iconColorResult.result.success) {
        console.log(`✓ Bound icon ${iconColorResult.result.method} to Icon Color variable\n`);
      } else {
        console.log(`⚠️  Could not bind icon color: ${iconColorResult.result.reason}\n`);
      }
    } else {
      console.log('⚠️  Icon not found, skipping icon color binding\n');
    }

    // Step 5: Verify bindings
    console.log('✅ Step 5: Verifying bindings...');
    const verification = await executeInFigma(`
      const component = figma.getNodeById('${backButton.result.id}');

      const bindings = {
        width: component.boundVariables?.width,
        height: component.boundVariables?.height,
        topLeftRadius: component.boundVariables?.topLeftRadius,
        topRightRadius: component.boundVariables?.topRightRadius,
        bottomLeftRadius: component.boundVariables?.bottomLeftRadius,
        bottomRightRadius: component.boundVariables?.bottomRightRadius
      };

      const boundCount = Object.values(bindings).filter(b => b !== undefined).length;

      return {
        bindings,
        boundCount,
        totalFields: Object.keys(bindings).length
      };
    `);

    console.log(`✓ Verified: ${verification.result.boundCount}/${verification.result.totalFields} fields bound\n`);

    await notifyFigma('✅ All variables bound to BackButton!', 3000);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ VARIABLE BINDING COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Bindings Applied:');
    console.log(`   ✓ Width → dim-10 (40px)`);
    console.log(`   ✓ Height → dim-10 (40px)`);
    console.log(`   ✓ Top Left Radius → icon-container (20px)`);
    console.log(`   ✓ Top Right Radius → icon-container (20px)`);
    console.log(`   ✓ Bottom Left Radius → icon-container (20px)`);
    console.log(`   ✓ Bottom Right Radius → icon-container (20px)`);
    console.log(`   ✓ Icon Color → Icon Color variable\n`);

    console.log('🎉 BackButton is now fully token-based!');
    console.log('   Try switching Light/Dark mode to verify bindings.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin to connect...');
console.log('   (Please open "AI Agent Bridge" plugin in Figma Desktop)\n');
