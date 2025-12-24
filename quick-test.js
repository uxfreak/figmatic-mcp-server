// Quick test using the refactored server API
const { executeInFigma, getFigmaContext, notifyFigma, isConnected } = require('./websocket-server/server');

async function quickTest() {
  console.log('\n🚀 Quick MVP Test\n');

  // Check connection
  console.log('1. Checking connection...');
  if (!isConnected()) {
    console.log('❌ Not connected. Make sure:');
    console.log('   - Server is running: cd websocket-server && npm start');
    console.log('   - Plugin is open in Figma Desktop');
    return;
  }
  console.log('✓ Connected!\n');

  try {
    // Test 1: Get context
    console.log('2. Getting Figma context...');
    const ctx = await getFigmaContext();
    console.log('✓ Context received!');
    console.log(`   Page: "${ctx.context.currentPage.name}"`);
    console.log(`   Selected: ${ctx.context.selectionCount} items\n`);

    // Test 2: Create element
    console.log('3. Creating a blue circle...');
    const result = await executeInFigma(`
      const circle = figma.createEllipse();
      circle.name = "AI Test Circle";
      circle.resize(100, 100);
      circle.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 1.0 } }];
      figma.currentPage.appendChild(circle);
      figma.currentPage.selection = [circle];
      figma.viewport.scrollAndZoomIntoView([circle]);
      return { id: circle.id, name: circle.name };
    `);
    console.log('✓ Circle created!');
    console.log(`   ID: ${result.result.id}`);
    console.log(`   Name: ${result.result.name}\n`);

    // Test 3: Notification
    console.log('4. Sending notification to Figma...');
    notifyFigma('🎉 Claude Code is connected!', 3000);
    console.log('✓ Notification sent!\n');

    console.log('✅ ALL TESTS PASSED! Connection is working!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

quickTest();
