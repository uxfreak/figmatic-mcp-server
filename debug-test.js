// Debug test - try progressively simpler operations
const { startServer, executeInFigma, getFigmaContext } = require('./websocket-server/server');

console.log('🔍 Debug Test - Testing different operations\n');
startServer();

setTimeout(async () => {
  console.log('\n📡 Running debug tests...\n');

  try {
    // Test 1: Simple return value
    console.log('Test 1: Simple return (no Figma API calls)...');
    const test1 = await executeInFigma(`
      return { message: "Hello from script!" };
    `);
    console.log('✓ Result:', test1.result);
    console.log('');

    // Test 2: Check figma object availability
    console.log('Test 2: Check figma object...');
    const test2 = await executeInFigma(`
      return {
        hasFigma: typeof figma !== 'undefined',
        figmaKeys: typeof figma !== 'undefined' ? Object.keys(figma).slice(0, 5) : []
      };
    `);
    console.log('✓ Result:', test2.result);
    console.log('');

    // Test 3: Try creating a rectangle
    console.log('Test 3: Create rectangle...');
    const test3 = await executeInFigma(`
      const rect = figma.createRectangle();
      rect.name = "Debug Rectangle";
      rect.resize(50, 50);
      figma.currentPage.appendChild(rect);
      return { id: rect.id, name: rect.name };
    `);
    console.log('✓ Result:', test3.result);
    console.log('');

    // Test 4: Try creating an ellipse
    console.log('Test 4: Create ellipse...');
    const test4 = await executeInFigma(`
      const ellipse = figma.createEllipse();
      ellipse.name = "Debug Ellipse";
      ellipse.resize(50, 50);
      figma.currentPage.appendChild(ellipse);
      return { id: ellipse.id, name: ellipse.name };
    `);
    console.log('✓ Result:', test4.result);
    console.log('');

    console.log('✅ All debug tests passed!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin to connect (5 seconds)...\n');
