// Test Styles & Variables API - Create, Apply, Bind
const {
  startServer,
  // Styles
  getTextStyles,
  getPaintStyles,
  getEffectStyles,
  createTextStyle,
  createPaintStyle,
  createEffectStyle,
  applyTextStyle,
  applyFillStyle,
  applyEffectStyle,
  // Variables
  createVariableCollection,
  createVariable,
  bindVariable,
  bindVariableToPaint,
  getBoundVariables,
  // Primitives (for testing)
  createText,
  createRectangle,
  createAutoLayout,
  notifyFigma
} = require('./websocket-server/server');

console.log('🎨 Testing Styles & Variables API\n');

startServer();

setTimeout(async () => {
  console.log('\n📡 Running styles & variables tests...\n');

  try {
    // ============================================
    // PART 1: STYLES API
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 PART 1: STYLES API');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test 1: Create Text Style
    console.log('1️⃣  Creating text style...');
    const textStyle = await createTextStyle({
      name: 'Test/Heading 1',
      fontSize: 32,
      fontName: { family: 'Inter', style: 'Bold' },
      lineHeight: { value: 120, unit: 'PERCENT' },
      letterSpacing: { value: -0.5, unit: 'PIXELS' },
      description: 'Primary heading style'
    });
    console.log(`   ✓ Text style created: "${textStyle.name}" (ID: ${textStyle.id})\n`);

    // Test 2: Create Paint Style (Solid Color)
    console.log('2️⃣  Creating paint style (solid color)...');
    const paintStyle = await createPaintStyle({
      name: 'Test/Colors/Primary Blue',
      paints: [{
        type: 'SOLID',
        color: { r: 0.2, g: 0.4, b: 0.8 },
        opacity: 1
      }],
      description: 'Primary brand color'
    });
    console.log(`   ✓ Paint style created: "${paintStyle.name}" (ID: ${paintStyle.id})\n`);

    // Test 3: Create Effect Style (Drop Shadow)
    console.log('3️⃣  Creating effect style (drop shadow)...');
    const effectStyle = await createEffectStyle({
      name: 'Test/Shadows/Card',
      effects: [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.15 },
        offset: { x: 0, y: 4 },
        radius: 8,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL'
      }],
      description: 'Card shadow effect'
    });
    console.log(`   ✓ Effect style created: "${effectStyle.name}" (ID: ${effectStyle.id})\n`);

    // Test 4: Get All Styles
    console.log('4️⃣  Getting all local styles...');
    const allTextStyles = await getTextStyles();
    const allPaintStyles = await getPaintStyles();
    const allEffectStyles = await getEffectStyles();
    console.log(`   ✓ Found ${allTextStyles.length} text styles`);
    console.log(`   ✓ Found ${allPaintStyles.length} paint styles`);
    console.log(`   ✓ Found ${allEffectStyles.length} effect styles\n`);

    // Test 5: Create Text Node and Apply Text Style
    console.log('5️⃣  Creating text and applying text style...');
    const text = await createText({
      characters: 'Styled Heading',
      position: { x: 50, y: 50 }
    });
    await applyTextStyle(text.id, textStyle.id);
    console.log(`   ✓ Text created and styled: "${text.characters}"\n`);

    // Test 6: Create Rectangle and Apply Fill + Effect Styles
    console.log('6️⃣  Creating rectangle and applying fill + effect styles...');
    const rect = await createRectangle({
      width: 200,
      height: 100,
      position: { x: 50, y: 120 },
      fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]
    });
    await applyFillStyle(rect.id, paintStyle.id);
    await applyEffectStyle(rect.id, effectStyle.id);
    console.log(`   ✓ Rectangle created with fill style and shadow\n`);

    // ============================================
    // PART 2: VARIABLES API
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 PART 2: VARIABLES API');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test 7: Create Variable Collection with Modes
    console.log('7️⃣  Creating variable collection with Light/Dark modes...');
    const collection = await createVariableCollection({
      name: 'Test Tokens',
      modes: ['Light', 'Dark']
    });
    console.log(`   ✓ Collection created: "${collection.name}"`);
    console.log(`   ✓ Modes: ${collection.modes.map(m => m.name).join(', ')}\n`);

    // Test 8: Create Color Variable
    console.log('8️⃣  Creating color variable...');
    const colorVar = await createVariable({
      name: 'test/accent-color',
      collectionId: collection.id,
      type: 'COLOR',
      values: {
        'Light': { r: 1, g: 0.3, b: 0.3, a: 1 },  // Red in light mode
        'Dark': { r: 1, g: 0.5, b: 0.5, a: 1 }     // Lighter red in dark mode
      },
      description: 'Accent color for highlights'
    });
    console.log(`   ✓ Color variable created: "${colorVar.name}"\n`);

    // Test 9: Create Float Variables (Spacing)
    console.log('9️⃣  Creating float variables (spacing)...');
    const spacingVar = await createVariable({
      name: 'test/spacing-base',
      collectionId: collection.id,
      type: 'FLOAT',
      values: {
        'Light': 16,
        'Dark': 16
      }
    });
    const widthVar = await createVariable({
      name: 'test/card-width',
      collectionId: collection.id,
      type: 'FLOAT',
      values: {
        'Light': 300,
        'Dark': 300
      }
    });
    console.log(`   ✓ Spacing variable: "${spacingVar.name}"`);
    console.log(`   ✓ Width variable: "${widthVar.name}"\n`);

    // Test 10: Create Frame and Bind Variables
    console.log('🔟 Creating auto layout frame and binding variables...');
    const frame = await createAutoLayout({
      layoutMode: 'VERTICAL',
      itemSpacing: 16,
      padding: 24,
      fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }],
      position: { x: 300, y: 50 }
    });

    // Bind width and spacing variables
    await bindVariable({
      nodeId: frame.id,
      field: 'width',
      variableId: widthVar.id
    });
    await bindVariable({
      nodeId: frame.id,
      field: 'itemSpacing',
      variableId: spacingVar.id
    });
    console.log(`   ✓ Frame created with bound variables`);
    console.log(`   ✓ width → "${widthVar.name}"`);
    console.log(`   ✓ itemSpacing → "${spacingVar.name}"\n`);

    // Test 11: Create Rectangle and Bind Color Variable to Fill
    console.log('1️⃣1️⃣  Creating rectangle and binding color variable to fill...');
    const coloredRect = await createRectangle({
      width: 120,
      height: 80,
      position: { x: 300, y: 250 },
      fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
    });

    await bindVariableToPaint({
      nodeId: coloredRect.id,
      paintIndex: 0,
      variableId: colorVar.id,
      isFill: true
    });
    console.log(`   ✓ Rectangle fill bound to "${colorVar.name}"`);
    console.log(`   ✓ Color will change with Light/Dark modes\n`);

    // Test 12: Get Bound Variables
    console.log('1️⃣2️⃣  Getting all bound variables for frame...');
    const boundVars = await getBoundVariables(frame.id);
    console.log(`   ✓ Bound variables:`, JSON.stringify(boundVars, null, 2));
    console.log('');

    // ============================================
    // SUMMARY
    // ============================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL TESTS PASSED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎯 Check your Figma canvas to see:');
    console.log('   • Styled text with "Test/Heading 1" style');
    console.log('   • Blue rectangle with shadow effect');
    console.log('   • Auto layout frame with variable-bound width & spacing');
    console.log('   • Red rectangle with variable-bound fill color\n');

    console.log('📊 Created:');
    console.log(`   • ${allTextStyles.length} text styles (including Test/Heading 1)`);
    console.log(`   • ${allPaintStyles.length} paint styles (including Test/Colors/Primary Blue)`);
    console.log(`   • ${allEffectStyles.length} effect styles (including Test/Shadows/Card)`);
    console.log(`   • 1 variable collection with 2 modes (Light/Dark)`);
    console.log(`   • 3 variables (color, spacing, width)`);
    console.log(`   • 4 nodes with applied styles and bound variables\n`);

    notifyFigma('🎉 Styles & Variables tests complete!', 5000);

    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}, 10000);

console.log('⏳ Waiting for Figma plugin to connect (10 seconds)...\n');
