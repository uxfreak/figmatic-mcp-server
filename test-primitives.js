// Test Primitives API - Text, Auto Layout, Shapes
const {
  startServer,
  createText,
  createStyledText,
  createAutoLayout,
  createRectangle,
  notifyFigma
} = require('./websocket-server/server');

console.log('🎨 Testing Primitives API\n');

startServer();

setTimeout(async () => {
  console.log('\n📡 Running primitive tests...\n');

  try {
    // Test 1: Simple Text
    console.log('1. Creating simple text...');
    const text1 = await createText({
      characters: 'Hello from AI!',
      fontSize: 32,
      font: { family: 'Inter', style: 'Bold' },
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 } }],
      position: { x: 50, y: 50 }
    });
    console.log(`✓ Text created: "${text1.characters}" (${text1.width}x${text1.height}px)\n`);

    // Test 2: Styled Text (mixed formatting)
    console.log('2. Creating styled text with mixed formatting...');
    const text2 = await createStyledText([
      { text: 'Bold ', fontName: { family: 'Inter', style: 'Bold' }, fontSize: 24 },
      { text: 'Regular ', fontSize: 24 },
      { text: 'Red!', fontSize: 24, fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }] }
    ], {
      position: { x: 50, y: 120 },
      baseFont: { family: 'Inter', style: 'Regular' },
      baseFontSize: 24
    });
    console.log(`✓ Styled text created: "${text2.characters}"\n`);

    // Test 3: Horizontal Auto Layout
    console.log('3. Creating horizontal auto layout frame...');
    const autoLayout1 = await createAutoLayout({
      layoutMode: 'HORIZONTAL',
      primaryAxisSizingMode: 'AUTO', // Hug contents
      counterAxisSizingMode: 'AUTO',
      itemSpacing: 16,
      padding: 24,
      fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }],
      cornerRadius: 12,
      position: { x: 50, y: 200 },
      primaryAxisAlignItems: 'CENTER',
      counterAxisAlignItems: 'CENTER'
    });
    console.log(`✓ Auto layout created: ${autoLayout1.layoutMode} (${autoLayout1.width}x${autoLayout1.height}px)\n`);

    // Test 4: Vertical Auto Layout with fixed width
    console.log('4. Creating vertical auto layout (fixed width)...');
    const autoLayout2 = await createAutoLayout({
      layoutMode: 'VERTICAL',
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'FIXED',
      width: 200,
      height: 100,
      itemSpacing: 12,
      padding: { left: 16, right: 16, top: 16, bottom: 16 },
      fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.95, b: 1.0 } }],
      cornerRadius: 8,
      position: { x: 350, y: 200 }
    });
    console.log(`✓ Vertical auto layout created (${autoLayout2.width}x${autoLayout2.height}px)\n`);

    // Test 5: Wrapping Auto Layout
    console.log('5. Creating wrapping auto layout...');
    const autoLayout3 = await createAutoLayout({
      layoutMode: 'HORIZONTAL',
      layoutWrap: 'WRAP',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'AUTO',
      width: 300,
      itemSpacing: 8,
      counterAxisSpacing: 8,
      padding: 16,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0.95, b: 0.9 } }],
      cornerRadius: 8,
      position: { x: 50, y: 350 }
    });
    console.log(`✓ Wrapping auto layout created\n`);

    // Test 6: Rectangle with styling
    console.log('6. Creating styled rectangle...');
    const rect = await createRectangle({
      width: 120,
      height: 80,
      fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.8, b: 0.5 } }],
      strokes: [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 0.4 } }],
      strokeWeight: 4,
      cornerRadius: 16,
      position: { x: 400, y: 350 },
      name: 'Styled Box'
    });
    console.log(`✓ Rectangle created: ${rect.name} (${rect.width}x${rect.height}px)\n`);

    // Success notification
    notifyFigma('🎉 All primitive tests passed!', 4000);

    console.log('✅ ALL PRIMITIVE TESTS PASSED!');
    console.log('🎯 Check your Figma canvas to see the created elements:\n');
    console.log('   - Simple text (blue, bold)');
    console.log('   - Styled text (mixed formatting)');
    console.log('   - Horizontal auto layout frame (gray)');
    console.log('   - Vertical auto layout frame (blue tint)');
    console.log('   - Wrapping auto layout frame (orange tint)');
    console.log('   - Styled rectangle (green with stroke)\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}, 10000);

console.log('⏳ Waiting for Figma plugin to connect (10 seconds)...\n');
