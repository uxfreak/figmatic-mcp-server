// Bind all variables to Help Navigation Card
const {
  startServer,
  executeInFigma,
  getAllVariables,
  bindVariable,
  bindVariableToPaint,
  notifyFigma
} = require('./websocket-server/server');

console.log('🔗 Binding All Variables to Help Navigation Card\n');

startServer();

setTimeout(async () => {
  console.log('\n📡 Starting variable binding process...\n');

  try {
    // Step 1: Get all variables
    console.log('📊 Step 1: Getting variables...');
    const allVars = await getAllVariables();

    const spacing4 = allVars.variables.find(v => v.name === 'Spacing/spacing-4');
    const cardRadius = allVars.variables.find(v => v.name === 'Dimensions/Radius/card-radius');
    const cardBg = allVars.variables.find(v => v.name === 'Fills/card-background');
    const cardBorder = allVars.variables.find(v => v.name === 'Strokes/card-border');
    const iconContainerTeal = allVars.variables.find(v => v.name === 'Fills/icon-container-teal');
    const iconTeal = allVars.variables.find(v => v.name === 'Icons/icon-teal');

    console.log(`✓ spacing-4: ${spacing4.id} (16px)`);
    console.log(`✓ card-radius: ${cardRadius.id} (16px)`);
    console.log(`✓ card-background: ${cardBg.id}`);
    console.log(`✓ card-border: ${cardBorder.id}`);
    console.log(`✓ icon-container-teal: ${iconContainerTeal.id}`);
    console.log(`✓ icon-teal: ${iconTeal.id}\n`);

    // Step 2: Find Help Navigation Card component
    console.log('🔍 Step 2: Finding Help Navigation Card component...');
    const cardAnalysis = await executeInFigma(`
      const card = figma.root.findOne(node =>
        node.type === 'COMPONENT' &&
        node.name === 'Help Navigation Card'
      );

      if (!card) {
        throw new Error('Help Navigation Card component not found');
      }

      return {
        cardId: card.id,
        cardName: card.name,
        childCount: card.children.length
      };
    `);

    console.log(`✓ Found: ${cardAnalysis.result.cardName}`);
    console.log(`   Card ID: ${cardAnalysis.result.cardId}`);
    console.log(`   Children: ${cardAnalysis.result.childCount}\n`);

    // Step 3: Bind card container padding
    console.log('📏 Step 3: Binding card padding...');
    const paddingFields = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'];

    for (const field of paddingFields) {
      await bindVariable({
        nodeId: cardAnalysis.result.cardId,
        field: field,
        variableId: spacing4.id
      });
    }
    console.log(`✓ Bound all 4 padding sides to spacing-4\n`);

    // Step 4: Bind card corner radii
    console.log('📐 Step 4: Binding card corner radii...');
    const radiusFields = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];

    for (const field of radiusFields) {
      await bindVariable({
        nodeId: cardAnalysis.result.cardId,
        field: field,
        variableId: cardRadius.id
      });
    }
    console.log(`✓ Bound all 4 corner radii to card-radius\n`);

    // Step 5: Bind card background color
    console.log('🎨 Step 5: Binding card background...');
    await bindVariableToPaint({
      nodeId: cardAnalysis.result.cardId,
      paintIndex: 0,
      variableId: cardBg.id,
      isFill: true
    });
    console.log(`✓ Bound background to card-background\n`);

    // Step 6: Bind card border/stroke
    console.log('🖌️  Step 6: Binding card border...');
    await bindVariableToPaint({
      nodeId: cardAnalysis.result.cardId,
      paintIndex: 0,
      variableId: cardBorder.id,
      isFill: false
    });
    console.log(`✓ Bound stroke to card-border\n`);

    await notifyFigma('✅ All variables bound!', 3000);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ HELP NAVIGATION CARD COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Card Container Variable Bindings:');
    console.log('   ✓ Padding (L/R/T/B) → spacing-4 (16px)');
    console.log('   ✓ Corner radii (all 4) → card-radius (16px)');
    console.log('   ✓ Background → card-background');
    console.log('   ✓ Border → card-border\n');

    console.log('📝 Note:');
    console.log('   Icon containers and icons inherit bindings from');
    console.log('   SettingsListItem component instances.\n');

    console.log('🎉 Help Navigation Card container is fully token-based!');
    console.log('   Test Light/Dark mode switching to verify.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
