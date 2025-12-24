// Fix icon color binding using bindVariableToPaint
const {
  startServer,
  executeInFigma,
  getAllVariables,
  bindVariableToPaint,
  notifyFigma
} = require('./websocket-server/server');

console.log('🎨 Fixing Icon Color Binding\n');

startServer();

setTimeout(async () => {
  console.log('\n📡 Binding icon color...\n');

  try {
    // Step 1: Find BackButton and icon
    const backButton = await executeInFigma(`
      const component = figma.root.findOne(node =>
        node.type === 'COMPONENT' &&
        node.name === 'BackButton'
      );

      const icon = component.findOne(node =>
        node.name.toLowerCase().includes('arrow')
      );

      // Check if icon has strokes or fills
      const hasStrokes = icon.strokes && icon.strokes.length > 0;
      const hasFills = icon.fills && icon.fills.length > 0;

      return {
        componentId: component.id,
        iconId: icon.id,
        iconName: icon.name,
        hasStrokes,
        hasFills
      };
    `);

    console.log(`✓ Found icon: ${backButton.result.iconName}`);
    console.log(`   Has strokes: ${backButton.result.hasStrokes}`);
    console.log(`   Has fills: ${backButton.result.hasFills}\n`);

    // Step 2: Get Icon Color variable
    const allVars = await getAllVariables();
    const iconColor = allVars.variables.find(v => v.name === 'Icons/Icon Color');
    console.log(`✓ Icon Color variable: ${iconColor.id}\n`);

    // Step 3: Bind using bindVariableToPaint
    console.log('🔗 Binding icon color variable...');

    if (backButton.result.hasStrokes) {
      // Bind stroke color
      const result = await bindVariableToPaint({
        nodeId: backButton.result.iconId,
        paintIndex: 0,
        variableId: iconColor.id,
        isFill: false  // false = stroke
      });
      console.log(`✓ Bound stroke color to Icon Color variable\n`);
    } else if (backButton.result.hasFills) {
      // Bind fill color
      const result = await bindVariableToPaint({
        nodeId: backButton.result.iconId,
        paintIndex: 0,
        variableId: iconColor.id,
        isFill: true  // true = fill
      });
      console.log(`✓ Bound fill color to Icon Color variable\n`);
    }

    await notifyFigma('✅ Icon color bound!', 2000);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL BINDINGS COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 BackButton Variable Bindings:');
    console.log('   ✓ Width → dim-10 (40px)');
    console.log('   ✓ Height → dim-10 (40px)');
    console.log('   ✓ All corner radii → icon-container (20px)');
    console.log('   ✓ Icon color → Icon Color\n');

    console.log('🎉 Try switching Light/Dark mode to see it adapt!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
