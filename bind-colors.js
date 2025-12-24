// Bind icon color and background color
const {
  startServer,
  executeInFigma,
  getAllVariables,
  bindVariableToPaint,
  notifyFigma
} = require('./websocket-server/server');

console.log('🎨 Binding Icon & Background Colors\n');

startServer();

setTimeout(async () => {
  console.log('\n📡 Binding colors...\n');

  try {
    // Step 1: Find BackButton and icon
    console.log('🔍 Step 1: Finding BackButton component...');
    const backButton = await executeInFigma(`
      const component = figma.root.findOne(node =>
        node.type === 'COMPONENT' &&
        node.name === 'BackButton'
      );

      const icon = component.findOne(node =>
        node.name.toLowerCase().includes('arrow')
      );

      return {
        componentId: component.id,
        iconId: icon.id,
        iconName: icon.name,
        iconType: icon.type,
        hasIconStrokes: icon.strokes && icon.strokes.length > 0,
        hasIconFills: icon.fills && icon.fills.length > 0
      };
    `);

    console.log(`✓ Component ID: ${backButton.result.componentId}`);
    console.log(`✓ Icon: ${backButton.result.iconName} (${backButton.result.iconType})`);
    console.log(`   Strokes: ${backButton.result.hasIconStrokes}, Fills: ${backButton.result.hasIconFills}\n`);

    // Step 2: Get variables
    console.log('📊 Step 2: Getting color variables...');
    const allVars = await getAllVariables();
    const iconColor = allVars.variables.find(v => v.name === 'Icons/Icon Color');

    console.log(`✓ Icon Color: ${iconColor.id}\n`);

    // Step 3: Bind icon color
    console.log('🎨 Step 3: Binding icon color...');

    if (backButton.result.hasIconStrokes) {
      await bindVariableToPaint({
        nodeId: backButton.result.iconId,
        paintIndex: 0,
        variableId: iconColor.id,
        isFill: false
      });
      console.log(`✓ Bound icon stroke to Icon Color\n`);
    } else if (backButton.result.hasIconFills) {
      await bindVariableToPaint({
        nodeId: backButton.result.iconId,
        paintIndex: 0,
        variableId: iconColor.id,
        isFill: true
      });
      console.log(`✓ Bound icon fill to Icon Color\n`);
    } else {
      console.log(`⚠️  Icon has no strokes or fills to bind\n`);
    }

    // Step 4: Set background to transparent
    console.log('🎨 Step 4: Setting background to transparent...');
    await executeInFigma(`
      const component = figma.getNodeById('${backButton.result.componentId}');
      component.fills = [];
      return { success: true };
    `);
    console.log(`✓ Background set to transparent\n`);

    await notifyFigma('✅ All colors bound!', 2000);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ COMPLETE! BackButton is Token-Based');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 All Variable Bindings:');
    console.log('   ✓ Width → dim-10 (40px)');
    console.log('   ✓ Height → dim-10 (40px)');
    console.log('   ✓ Corner radii → icon-container (20px)');
    console.log('   ✓ Icon color → Icon Color');
    console.log('   ✓ Background → Transparent\n');

    console.log('🎉 BackButton is ready to use!');
    console.log('   Test Light/Dark mode switching to verify.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
