// Fix missing variable bindings in Help screen
const {
  startServer,
  executeInFigma,
  getAllVariables,
  bindVariableToPaint,
  notifyFigma
} = require('./websocket-server/server');

console.log('🔧 Fixing Variable Bindings in Help Screen\n');

startServer();

setTimeout(async () => {
  console.log('\n📊 Finding missing bindings...\n');

  try {
    // Step 1: Get variables
    console.log('📊 Step 1: Getting color variables...');
    const allVars = await getAllVariables();

    const textPrimary = allVars.variables.find(v => v.name === 'Text/text-primary');

    console.log(`✓ text-primary: ${textPrimary.id}\n`);

    // Step 2: Find Help screen and title text
    console.log('🔍 Step 2: Finding Help screen elements...');
    const elements = await executeInFigma(`
      const helpScreen = figma.root.findOne(node =>
        node.name === 'Help Screen'
      );

      if (!helpScreen) {
        throw new Error('Help Screen not found');
      }

      // Find content area
      const content = helpScreen.findOne(n => n.name === 'Content');

      // Find title text
      const titleText = content.findOne(n => n.name === 'Title' && n.type === 'TEXT');

      return {
        helpScreenId: helpScreen.id,
        titleTextId: titleText ? titleText.id : null,
        titleFound: !!titleText
      };
    `);

    console.log(`✓ Help Screen: ${elements.result.helpScreenId}`);
    console.log(`✓ Title text: ${elements.result.titleFound ? elements.result.titleTextId : 'NOT FOUND'}\n`);

    if (!elements.result.titleFound) {
      console.log('❌ Title text not found - cannot bind color\n');
      return;
    }

    // Step 3: Bind title text color
    console.log('🎨 Step 3: Binding title text color...');
    await bindVariableToPaint({
      nodeId: elements.result.titleTextId,
      paintIndex: 0,
      variableId: textPrimary.id,
      isFill: true
    });
    console.log(`✓ Bound title text color to text-primary\n`);

    await notifyFigma('✅ Variable bindings fixed!', 2000);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ BINDINGS FIXED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔗 Applied Bindings:');
    console.log('   ✓ Title text color → text-primary\n');

    console.log('💡 The title should now update with Light/Dark mode!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
