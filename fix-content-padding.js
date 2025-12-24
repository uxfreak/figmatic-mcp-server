// Fix content area horizontal padding to match React Native (20px)
const {
  startServer,
  executeInFigma,
  getAllVariables,
  bindVariable,
  notifyFigma
} = require('./websocket-server/server');

console.log('🔧 Fixing Content Area Padding\n');

startServer();

setTimeout(async () => {
  console.log('\n📊 Updating padding to match React Native...\n');

  try {
    // Step 1: Get spacing-5 variable (20px = spacingLg)
    console.log('📊 Step 1: Getting spacing-5 variable...');
    const allVars = await getAllVariables();
    const spacing5 = allVars.variables.find(v => v.name === 'Spacing/spacing-5');

    console.log(`✓ spacing-5 (20px): ${spacing5.id}\n`);

    // Step 2: Find content area
    console.log('🔍 Step 2: Finding content area...');
    const content = await executeInFigma(`
      const helpScreen = figma.root.findOne(node =>
        node.name === 'Help Screen'
      );

      if (!helpScreen) {
        throw new Error('Help Screen not found');
      }

      const content = helpScreen.findOne(n => n.name === 'Content');

      if (!content) {
        throw new Error('Content area not found');
      }

      return {
        id: content.id,
        currentPaddingLeft: content.paddingLeft,
        currentPaddingRight: content.paddingRight
      };
    `);

    console.log(`✓ Content area: ${content.result.id}`);
    console.log(`   Current padding L/R: ${content.result.currentPaddingLeft}px / ${content.result.currentPaddingRight}px\n`);

    // Step 3: Update padding to spacing-5 (20px)
    console.log('🔗 Step 3: Binding padding to spacing-5 (20px)...');

    await bindVariable({
      nodeId: content.result.id,
      field: 'paddingLeft',
      variableId: spacing5.id
    });

    await bindVariable({
      nodeId: content.result.id,
      field: 'paddingRight',
      variableId: spacing5.id
    });

    console.log(`✓ Updated padding L/R to spacing-5 (20px)\n`);

    await notifyFigma('✅ Padding updated to 20px!', 2000);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ PADDING FIXED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📐 Content Area Padding:');
    console.log('   ✓ Left/Right: spacing-5 (20px) ← matches React Native spacingLg');
    console.log('   ✓ Top: spacing-4 (16px)');
    console.log('   ✓ Bottom: spacing-8 (32px)\n');

    console.log('🎯 Now matches React Native PageLayout:');
    console.log('   paddingHorizontal: tokens.spacingLg (20px)\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
