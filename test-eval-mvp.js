// Test eval approach - server and test in SAME process
const { startServer, executeInFigma, getFigmaContext } = require('./websocket-server/server');

console.log('🧪 Testing eval-based execution\n');

startServer();

setTimeout(async () => {
  console.log('\n📡 Running eval tests...\n');

  try {
    console.log('Test 1: Simple return value (no Figma API)...');
    const result1 = await executeInFigma(`
      return { message: "Hello from eval!" };
    `);
    console.log('✓ Result:', result1.result);
    console.log('');

    console.log('Test 2: Access figma object...');
    const result2 = await executeInFigma(`
      return { pageName: figma.currentPage.name };
    `);
    console.log('✓ Result:', result2.result);
    console.log('');

    console.log('Test 3: Create a rectangle...');
    const result3 = await executeInFigma(`
      const rect = figma.createRectangle();
      rect.name = "Eval Test Rectangle";
      rect.resize(50, 50);
      rect.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.8, b: 0.4 } }];
      figma.currentPage.appendChild(rect);
      figma.currentPage.selection = [rect];
      figma.viewport.scrollAndZoomIntoView([rect]);
      return { id: rect.id, name: rect.name };
    `);
    console.log('✓ Result:', result3.result);
    console.log('');

    console.log('✅ ALL EVAL TESTS PASSED!');
    console.log('🎉 The eval-based approach works in Figma!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 If you see "Not available", eval is also blocked.');
    console.log('   We will need to implement a command pattern instead.\n');
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin to connect (5 seconds)...\n');
