// Create complete Help Screen page
const {
  startServer,
  executeInFigma,
  getAllVariables,
  bindVariable,
  bindVariableToPaint,
  notifyFigma
} = require('./websocket-server/server');

console.log('📱 Creating Help Screen Page\n');

startServer();

setTimeout(async () => {
  console.log('\n🚀 Building Help Screen...\n');

  try {
    // Step 1: Get variables
    console.log('📊 Step 1: Getting variables...');
    const allVars = await getAllVariables();

    const spacingLg = allVars.variables.find(v => v.name === 'Spacing/spacing-4');
    const spacing2xl = allVars.variables.find(v => v.name === 'Spacing/spacing-8');
    const pageBg = allVars.variables.find(v => v.name === 'Fills/page background');

    console.log(`✓ spacing-lg (16px): ${spacingLg.id}`);
    console.log(`✓ spacing-2xl (32px): ${spacing2xl.id}`);
    console.log(`✓ page-background: ${pageBg.id}\n`);

    // Step 2: Find all components
    console.log('🔍 Step 2: Finding components...');
    const components = await executeInFigma(`
      const backButton = figma.root.findOne(node =>
        node.type === 'COMPONENT' &&
        node.name === 'BackButton'
      );

      const helpCard = figma.root.findOne(node =>
        node.type === 'COMPONENT' &&
        node.name === 'Help Navigation Card'
      );

      const button = figma.root.findOne(node =>
        node.type === 'COMPONENT' &&
        node.name === 'Button'
      );

      const textStyles = figma.getLocalTextStyles();
      const titleStyle = textStyles.find(s => s.name === 'Title');

      return {
        backButtonId: backButton.id,
        helpCardId: helpCard.id,
        buttonId: button.id,
        titleStyleId: titleStyle.id
      };
    `);

    console.log(`✓ BackButton: ${components.result.backButtonId}`);
    console.log(`✓ Help Navigation Card: ${components.result.helpCardId}`);
    console.log(`✓ Button: ${components.result.buttonId}`);
    console.log(`✓ Title style: ${components.result.titleStyleId}\n`);

    // Step 3: Create page frame (delete existing if found)
    console.log('📦 Step 3: Creating page frame...');
    const pageFrame = await executeInFigma(`
      // Delete existing Help Screen if it exists
      const existing = figma.root.findOne(n => n.name === 'Help Screen');
      if (existing) {
        existing.remove();
      }

      const frame = figma.createFrame();
      frame.name = "Help Screen";

      // iPhone size (can adjust)
      frame.resize(390, 844);

      // Set background
      frame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];

      // Position in viewport
      frame.x = figma.viewport.center.x - 195;
      frame.y = figma.viewport.center.y - 422;

      figma.currentPage.appendChild(frame);

      return {
        id: frame.id,
        name: frame.name
      };
    `);

    console.log(`✓ Created: ${pageFrame.result.name} (${pageFrame.result.id})\n`);

    // Step 4: Add BackButton instance
    console.log('🔘 Step 4: Adding BackButton...');
    const backButtonInstance = await executeInFigma(`
      const page = figma.getNodeById('${pageFrame.result.id}');
      const backButtonComponent = figma.getNodeById('${components.result.backButtonId}');

      const instance = backButtonComponent.createInstance();
      instance.x = 16; // Left padding
      instance.y = 60; // Top safe area + padding

      page.appendChild(instance);

      return {
        id: instance.id,
        x: instance.x,
        y: instance.y
      };
    `);

    console.log(`✓ Added BackButton at (${backButtonInstance.result.x}, ${backButtonInstance.result.y})\n`);

    // Step 5: Add title text
    console.log('✍️  Step 5: Adding title text...');
    const titleText = await executeInFigma(`
      const page = figma.getNodeById('${pageFrame.result.id}');
      const titleStyle = figma.getStyleById('${components.result.titleStyleId}');

      const text = figma.createText();

      // Load default font first (text node defaults to Inter Regular)
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      text.characters = 'Help';

      // Now apply the text style (which uses DM Sans SemiBold)
      await figma.loadFontAsync({ family: 'DM Sans', style: 'SemiBold' });
      text.textStyleId = titleStyle.id;

      // Center horizontally
      text.x = (390 - text.width) / 2;
      text.y = 120; // Below back button

      page.appendChild(text);

      return {
        id: text.id,
        width: text.width,
        x: text.x,
        y: text.y
      };
    `);

    console.log(`✓ Added title "Help" at (${titleText.result.x}, ${titleText.result.y})\n`);

    // Step 6: Add Help Navigation Card instance
    console.log('🎴 Step 6: Adding Help Navigation Card...');
    const cardInstance = await executeInFigma(`
      const page = figma.getNodeById('${pageFrame.result.id}');
      const cardComponent = figma.getNodeById('${components.result.helpCardId}');

      const instance = cardComponent.createInstance();

      // Center horizontally
      instance.x = (390 - instance.width) / 2;
      instance.y = 180; // Below title

      page.appendChild(instance);

      return {
        id: instance.id,
        width: instance.width,
        x: instance.x,
        y: instance.y
      };
    `);

    console.log(`✓ Added Help Navigation Card at (${cardInstance.result.x}, ${cardInstance.result.y})\n`);

    // Step 7: Add "Get in touch" button
    console.log('🔲 Step 7: Adding Get in touch button...');
    const buttonInstance = await executeInFigma(`
      const page = figma.getNodeById('${pageFrame.result.id}');
      const buttonComponent = figma.getNodeById('${components.result.buttonId}');

      const instance = buttonComponent.createInstance();

      // Find text node in button and update
      const textNode = instance.findOne(n => n.type === 'TEXT');
      if (textNode) {
        await figma.loadFontAsync(textNode.fontName);
        textNode.characters = 'Get in touch';
      }

      // Center horizontally at bottom
      instance.x = (390 - instance.width) / 2;
      instance.y = 750; // Near bottom

      page.appendChild(instance);

      return {
        id: instance.id,
        width: instance.width,
        x: instance.x,
        y: instance.y
      };
    `);

    console.log(`✓ Added button at (${buttonInstance.result.x}, ${buttonInstance.result.y})\n`);

    // Step 8: Bind page background
    console.log('🔗 Step 8: Binding page background...');
    await bindVariableToPaint({
      nodeId: pageFrame.result.id,
      paintIndex: 0,
      variableId: pageBg.id,
      isFill: true
    });
    console.log(`✓ Bound page background to page-background variable\n`);

    // Step 9: Select and zoom to page
    await executeInFigma(`
      const page = figma.getNodeById('${pageFrame.result.id}');
      figma.currentPage.selection = [page];
      figma.viewport.scrollAndZoomIntoView([page]);
      return { success: true };
    `);

    await notifyFigma('✅ Help screen created!', 3000);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ HELP SCREEN COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Page Structure:');
    console.log('   ✓ Help Screen frame (390×844px)');
    console.log('   ✓ BackButton instance (top left)');
    console.log('   ✓ "Help" title text (centered)');
    console.log('   ✓ Help Navigation Card (centered)');
    console.log('   ✓ "Get in touch" button (bottom center)\n');

    console.log('🔗 Variable Bindings:');
    console.log('   ✓ Page background → page-background\n');

    console.log('🎉 Help screen is ready!');
    console.log('   View it in Figma and adjust positions as needed.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
