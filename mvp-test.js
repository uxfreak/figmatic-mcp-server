// MVP Test - runs server and test in SAME process
const { startServer, executeInFigma, getFigmaContext, notifyFigma } = require('./websocket-server/server');

console.log('🚀 MVP Test - Starting server and testing in same process\n');

// Start the server
startServer();

// Wait for Figma plugin to connect, then run tests
setTimeout(async () => {
  console.log('\n📡 Running tests...\n');

  try {
    // Test 1: Get context
    console.log('1. Getting Figma context...');
    const ctx = await getFigmaContext();
    console.log('✓ Context received!');
    console.log(`   Page: "${ctx.context.currentPage.name}"`);
    console.log(`   Selected: ${ctx.context.selectionCount} items\n`);

    // Test 2: Create circle
    console.log('2. Creating a blue circle...');
    const result = await executeInFigma(`
      const circle = figma.createEllipse();
      circle.name = "Claude Code Test";
      circle.resize(120, 120);
      circle.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.6, b: 1.0 } }];
      figma.currentPage.appendChild(circle);
      figma.currentPage.selection = [circle];
      figma.viewport.scrollAndZoomIntoView([circle]);
      return { id: circle.id, name: circle.name };
    `);
    console.log('✓ Circle created!');
    console.log(`   Name: ${result.result.name}\n`);

    // Test 3: Create text
    console.log('3. Creating text...');
    const textResult = await executeInFigma(`
      await figma.loadFontAsync({ family: "Inter", style: "Bold" });
      const text = figma.createText();
      text.characters = "Hello from Claude!";
      text.fontSize = 48;
      text.fills = [{ type: 'SOLID', color: { r: 1, g: 0.3, b: 0.5 } }];
      text.y = 150;
      figma.currentPage.appendChild(text);
      return { text: text.characters };
    `);
    console.log('✓ Text created!');
    console.log(`   Text: "${textResult.result.text}"\n`);

    // Test 4: Notification
    console.log('4. Sending notification...');
    notifyFigma('🎉 Claude Code successfully connected to Figma!', 5000);
    console.log('✓ Notification sent!\n');

    console.log('✅ ALL TESTS PASSED!\n');
    console.log('💡 The Figma AI Agent Bridge is working perfectly!');
    console.log('   Check your Figma file to see the created elements.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the Figma plugin is open and connected!');
  }
}, 5000); // Wait 5 seconds for plugin to connect

console.log('⏳ Waiting for Figma plugin to connect...');
console.log('   (Make sure "AI Agent Bridge" plugin is running in Figma Desktop)\n');
