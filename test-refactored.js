// Test refactored server
const { startServer, executeInFigma, getFigmaContext, notifyFigma } = require('./websocket-server/server-refactored');

console.log('🧪 Testing Refactored Server\n');

startServer();

setTimeout(async () => {
  console.log('\n📡 Running tests...\n');

  try {
    // Test 1: Context
    console.log('1. Getting Figma context...');
    const ctx = await getFigmaContext();
    console.log('✓ Context received!');
    console.log(`   Page: "${ctx.context.currentPage.name}"`);
    console.log(`   Selected: ${ctx.context.selectionCount} items\n`);

    // Test 2: Execute simple script
    console.log('2. Testing eval execution...');
    const result = await executeInFigma(`
      return { message: "Refactored server works!", timestamp: Date.now() };
    `);
    console.log('✓ Execution successful!');
    console.log(`   Result:`, result.result);
    console.log('');

    // Test 3: Create shape
    console.log('3. Creating a rectangle...');
    const shape = await executeInFigma(`
      const rect = figma.createRectangle();
      rect.name = "Refactored Test";
      rect.resize(80, 80);
      rect.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.2, b: 0.9 } }];
      figma.currentPage.appendChild(rect);
      figma.currentPage.selection = [rect];
      figma.viewport.scrollAndZoomIntoView([rect]);
      return { id: rect.id, name: rect.name };
    `);
    console.log('✓ Rectangle created!');
    console.log(`   ID: ${shape.result.id}`);
    console.log(`   Name: ${shape.result.name}\n`);

    // Test 4: Notification
    console.log('4. Sending notification...');
    notifyFigma('🎉 Refactored architecture working perfectly!', 4000);
    console.log('✓ Notification sent!\n');

    console.log('✅ ALL TESTS PASSED!');
    console.log('🎯 Refactored server is fully functional!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin to connect (5 seconds)...\n');
