// Simple test to check if eval approach works
const { executeInFigma, isConnected } = require('./websocket-server/server');

async function testEval() {
  console.log('\n🧪 Testing eval-based execution\n');

  if (!isConnected()) {
    console.log('❌ Plugin not connected. Please reload the plugin in Figma.');
    return;
  }

  try {
    console.log('Test 1: Simple return value...');
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
      figma.currentPage.appendChild(rect);
      return { id: rect.id, name: rect.name };
    `);
    console.log('✓ Result:', result3.result);
    console.log('');

    console.log('✅ All eval tests passed!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 If you see "Not available", eval is also blocked by Figma.');
    console.log('   We will need to implement a command pattern instead.\n');
  }
}

testEval();
