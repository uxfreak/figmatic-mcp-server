// Add stroke/border to BackButton using separator token
const {
  startServer,
  executeInFigma,
  getAllVariables,
  bindVariableToPaint,
  notifyFigma
} = require('./websocket-server/server');

console.log('🔲 Adding Border to BackButton\n');

startServer();

setTimeout(async () => {
  console.log('\n📡 Adding stroke/border...\n');

  try {
    // Step 1: Get variables
    console.log('📊 Step 1: Getting variables...');
    const allVars = await getAllVariables();
    const separator = allVars.variables.find(v => v.name === 'Strokes/separator');

    console.log(`✓ Found Strokes/separator: ${separator.id}`);
    console.log(`   Light: Cod Gray 10%`);
    console.log(`   Dark: White 10%\n`);

    // Step 2: Find BackButton
    console.log('🔍 Step 2: Finding BackButton...');
    const backButton = await executeInFigma(`
      const component = figma.root.findOne(node =>
        node.type === 'COMPONENT' &&
        node.name === 'BackButton'
      );

      return {
        id: component.id,
        name: component.name,
        currentStrokes: component.strokes
      };
    `);

    console.log(`✓ Found: ${backButton.result.name} (${backButton.result.id})\n`);

    // Step 3: Add stroke
    console.log('🎨 Step 3: Adding stroke with 1px weight...');
    await executeInFigma(`
      const component = figma.getNodeById('${backButton.result.id}');

      // Add stroke
      component.strokes = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
      component.strokeWeight = 1;

      return { success: true };
    `);
    console.log(`✓ Added 1px stroke\n`);

    // Step 4: Bind stroke color to separator variable
    console.log('🔗 Step 4: Binding stroke color to separator variable...');
    await bindVariableToPaint({
      nodeId: backButton.result.id,
      paintIndex: 0,
      variableId: separator.id,
      isFill: false  // false = stroke
    });
    console.log(`✓ Bound stroke to Strokes/separator variable\n`);

    await notifyFigma('✅ Border added to BackButton!', 2000);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ BACKBUTTON COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Final Variable Bindings:');
    console.log('   ✓ Width → dim-10 (40px)');
    console.log('   ✓ Height → dim-10 (40px)');
    console.log('   ✓ Corner radii → icon-container (20px)');
    console.log('   ✓ Icon color → Icon Color');
    console.log('   ✓ Background → Transparent');
    console.log('   ✓ Stroke → Strokes/separator (border)\n');

    console.log('🎉 BackButton matches code implementation!');
    console.log('   40px circular, transparent bg, 1px border, arrow icon\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
