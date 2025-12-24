const { executeInFigma, getFigmaContext, notifyFigma } = require('./websocket-server/server');

async function testConnection() {
  console.log('\n🧪 Testing Figma AI Agent Bridge...\n');

  try {
    // Test 1: Get Figma Context
    console.log('Test 1: Getting Figma context...');
    const contextResult = await getFigmaContext();
    console.log('✓ Context received!');
    console.log('  Document:', contextResult.context.document.name);
    console.log('  Current Page:', contextResult.context.currentPage.name);
    console.log('  Selection Count:', contextResult.context.selectionCount);
    console.log('  Variables:', contextResult.context.variables.length);
    console.log('  Variable Collections:', contextResult.context.variableCollections.length);
    console.log('');

    // Test 2: Create a simple rectangle
    console.log('Test 2: Creating a red rectangle...');
    const rectResult = await executeInFigma(`
      const rect = figma.createRectangle();
      rect.name = "Test Rectangle from AI";
      rect.resize(150, 100);
      rect.fills = [{
        type: 'SOLID',
        color: { r: 1, g: 0, b: 0 }
      }];
      figma.currentPage.appendChild(rect);
      figma.currentPage.selection = [rect];
      figma.viewport.scrollAndZoomIntoView([rect]);
      return {
        id: rect.id,
        name: rect.name,
        width: rect.width,
        height: rect.height
      };
    `);
    console.log('✓ Rectangle created!');
    console.log('  ID:', rectResult.result.id);
    console.log('  Name:', rectResult.result.name);
    console.log('  Size:', rectResult.result.width, 'x', rectResult.result.height);
    console.log('');

    // Test 3: Send notification to Figma
    console.log('Test 3: Sending notification to Figma...');
    notifyFigma('🎉 AI Agent Bridge is working!', 5000);
    console.log('✓ Notification sent!');
    console.log('');

    // Test 4: Create a text node
    console.log('Test 4: Creating a text node...');
    const textResult = await executeInFigma(`
      await figma.loadFontAsync({ family: "Inter", style: "Bold" });
      const text = figma.createText();
      text.characters = "Hello from AI Agent!";
      text.fontSize = 24;
      text.fills = [{
        type: 'SOLID',
        color: { r: 0.2, g: 0.4, b: 1.0 }
      }];
      text.x = 200;
      text.y = 50;
      figma.currentPage.appendChild(text);
      return {
        id: text.id,
        text: text.characters,
        fontSize: text.fontSize
      };
    `);
    console.log('✓ Text node created!');
    console.log('  ID:', textResult.result.id);
    console.log('  Text:', textResult.result.text);
    console.log('  Font Size:', textResult.result.fontSize);
    console.log('');

    console.log('✅ All tests passed! The bridge is working perfectly!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testConnection();
