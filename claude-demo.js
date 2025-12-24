// Claude Code Demo - Following mvp-test.js pattern
const { startServer, executeInFigma, getFigmaContext, notifyFigma, createText, createAutoLayout } = require('./websocket-server/server');

console.log('🎨 Claude Code Demo - Starting server and demo in same process\n');

// Start the server
startServer();

// Wait for Figma plugin to connect, then run demo
setTimeout(async () => {
  console.log('\n🚀 Running demo...\n');

  try {
    // 1. Get current context
    console.log('📊 Step 1: Getting Figma context...');
    const ctx = await getFigmaContext();
    console.log(`✓ Current page: "${ctx.context.currentPage.name}"`);
    console.log(`✓ Variables: ${ctx.context.variables.total}`);
    const centerX = Math.round(ctx.context.viewport.center.x);
    const centerY = Math.round(ctx.context.viewport.center.y);
    console.log(`✓ Viewport center: ${centerX}, ${centerY}\n`);

    // 2. Notify user
    await notifyFigma('🤖 Claude Code is creating magic...', 3000);

    // 3. Create a teal card with auto layout
    console.log('📦 Step 2: Creating teal card with auto-layout...');
    const container = await createAutoLayout({
      layoutMode: 'VERTICAL',
      itemSpacing: 16,
      padding: 24,
      primaryAxisSizingMode: 'AUTO',
      cornerRadius: 16,
      fills: [{ type: 'SOLID', color: { r: 0.078, g: 0.722, b: 0.651 } }],
      position: { x: centerX - 150, y: centerY - 100 }
    });
    console.log(`✓ Created container: ${container.id}\n`);

    // 4. Create title text
    console.log('✍️  Step 3: Creating title text...');
    const title = await createText({
      characters: 'Hello from Claude Code! 👋',
      fontSize: 24,
      font: { family: 'Inter', style: 'Bold' },
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
    });
    console.log(`✓ Created title: ${title.id}\n`);

    // 5. Create body text
    console.log('✍️  Step 4: Creating body text...');
    const body = await createText({
      characters: 'I can create components, variables, and entire design systems!',
      fontSize: 14,
      font: { family: 'Inter', style: 'Regular' },
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.8 }],
      textAutoResize: 'WIDTH_AND_HEIGHT'
    });
    console.log(`✓ Created body: ${body.id}\n`);

    // 6. Organize elements
    console.log('🔧 Step 5: Organizing elements...');
    await executeInFigma(`
      const container = figma.getNodeById('${container.id}');
      const title = figma.getNodeById('${title.id}');
      const body = figma.getNodeById('${body.id}');

      container.appendChild(title);
      container.appendChild(body);

      // Center viewport on our creation
      figma.viewport.scrollAndZoomIntoView([container]);

      return { success: true };
    `);
    console.log('✓ Elements organized!\n');

    // 7. Success notification
    await notifyFigma('✅ Demo complete! Check out what I created!', 3000);

    console.log('🎉 DEMO COMPLETE!');
    console.log('Check Figma - I created a teal card with text!\n');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.log('\n💡 Make sure the Figma plugin is open and connected!');
  }
}, 5000); // Wait 5 seconds for plugin to connect

console.log('⏳ Waiting for Figma plugin to connect...');
console.log('   (Make sure "AI Agent Bridge" plugin is running in Figma Desktop)\n');
