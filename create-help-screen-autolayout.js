// Create Help Screen with auto-layout (following Onboarding pattern)
const {
  startServer,
  executeInFigma,
  getAllVariables,
  bindVariable,
  bindVariableToPaint,
  notifyFigma
} = require('./websocket-server/server');

console.log('📱 Creating Help Screen with Auto-Layout\n');

startServer();

setTimeout(async () => {
  console.log('\n🚀 Building Help Screen with proper flexbox/auto-layout...\n');

  try {
    // Step 1: Get variables
    console.log('📊 Step 1: Getting variables...');
    const allVars = await getAllVariables();

    const spacing4 = allVars.variables.find(v => v.name === 'Spacing/spacing-4'); // 16px
    const spacing5 = allVars.variables.find(v => v.name === 'Spacing/spacing-5'); // 20px
    const spacing8 = allVars.variables.find(v => v.name === 'Spacing/spacing-8'); // 32px
    const pageBg = allVars.variables.find(v => v.name === 'Fills/page background');

    console.log(`✓ spacing-4 (16px): ${spacing4.id}`);
    console.log(`✓ spacing-5 (20px): ${spacing5.id}`);
    console.log(`✓ spacing-8 (32px): ${spacing8.id}`);
    console.log(`✓ page-background: ${pageBg.id}\n`);

    // Step 2: Find components
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

    // Step 3: Create main frame with auto-layout
    console.log('📦 Step 3: Creating main frame with vertical auto-layout...');
    const mainFrame = await executeInFigma(`
      // Delete existing Help Screen if it exists
      const existing = figma.root.findOne(n => n.name === 'Help Screen');
      if (existing) {
        existing.remove();
      }

      // Create main frame
      const frame = figma.createFrame();
      frame.name = "Help Screen";
      frame.resize(393, 852); // iPhone size

      // Set up vertical auto-layout
      frame.layoutMode = 'VERTICAL';
      frame.primaryAxisSizingMode = 'FIXED';
      frame.counterAxisSizingMode = 'FIXED';
      frame.primaryAxisAlignItems = 'MIN';
      frame.counterAxisAlignItems = 'MIN';
      frame.itemSpacing = 0;
      frame.paddingLeft = 0;
      frame.paddingRight = 0;
      frame.paddingTop = 0;
      frame.paddingBottom = 0;

      // Set background
      frame.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];

      // Position in viewport
      frame.x = figma.viewport.center.x - 196.5;
      frame.y = figma.viewport.center.y - 426;

      figma.currentPage.appendChild(frame);

      return {
        id: frame.id,
        name: frame.name
      };
    `);

    console.log(`✓ Created main frame: ${mainFrame.result.name} (${mainFrame.result.id})\n`);

    // Step 4: Copy background and status bar from onboarding
    console.log('🎨 Step 4: Copying background and status bar from onboarding...');
    await executeInFigma(`
      const frame = figma.getNodeById('${mainFrame.result.id}');
      const onboarding = figma.root.findOne(n =>
        n.name.toLowerCase().includes('onboarding') &&
        n.name.toLowerCase().includes('light')
      );

      if (onboarding) {
        // Find and clone background rectangle
        const bgOriginal = onboarding.children.find(n => n.name === 'Rectangle 35' || n.type === 'RECTANGLE');
        if (bgOriginal) {
          const bg = bgOriginal.clone();
          bg.name = "Background";
          bg.layoutAlign = 'INHERIT'; // No auto-layout for background
          frame.appendChild(bg);
        }

        // Find and clone status bar
        const statusBarOriginal = onboarding.children.find(n =>
          n.name && n.name.toLowerCase().includes('status')
        );
        if (statusBarOriginal) {
          const statusBar = statusBarOriginal.clone();
          statusBar.layoutAlign = 'STRETCH';
          statusBar.layoutGrow = 0;
          frame.appendChild(statusBar);
        }
      }

      return { success: true };
    `);
    console.log(`✓ Copied background and status bar from onboarding\n`);

    // Step 5: Add header area with BackButton
    console.log('📱 Step 5: Adding header area with BackButton...');
    const header = await executeInFigma(`
      const frame = figma.getNodeById('${mainFrame.result.id}');
      const backButtonComp = figma.getNodeById('${components.result.backButtonId}');

      // Create header container
      const headerFrame = figma.createFrame();
      headerFrame.name = "Header";
      headerFrame.layoutMode = 'HORIZONTAL';
      headerFrame.primaryAxisSizingMode = 'FIXED';
      headerFrame.counterAxisSizingMode = 'AUTO';
      headerFrame.primaryAxisAlignItems = 'SPACE_BETWEEN';
      headerFrame.counterAxisAlignItems = 'CENTER';
      headerFrame.itemSpacing = 0;
      headerFrame.paddingLeft = 16;
      headerFrame.paddingRight = 16;
      headerFrame.paddingTop = 60; // Safe area + padding
      headerFrame.paddingBottom = 16;
      headerFrame.fills = [];
      headerFrame.layoutAlign = 'STRETCH';
      headerFrame.layoutGrow = 0;
      headerFrame.resize(393, 100);

      // Add BackButton instance
      const backBtn = backButtonComp.createInstance();
      headerFrame.appendChild(backBtn);

      // Add spacer for space-between
      const spacer = figma.createFrame();
      spacer.name = "Spacer";
      spacer.resize(40, 40); // Same as button size
      spacer.fills = [];
      headerFrame.appendChild(spacer);

      frame.appendChild(headerFrame);

      return {
        id: headerFrame.id
      };
    `);
    console.log(`✓ Added header with BackButton\n`);

    // Step 6: Add content area with auto-layout
    console.log('📦 Step 6: Adding content area with auto-layout...');
    const contentArea = await executeInFigma(`
      const frame = figma.getNodeById('${mainFrame.result.id}');

      // Create content container (like "sliders" in onboarding)
      const content = figma.createFrame();
      content.name = "Content";
      content.layoutMode = 'VERTICAL';
      content.primaryAxisSizingMode = 'AUTO';
      content.counterAxisSizingMode = 'FIXED';
      content.primaryAxisAlignItems = 'MIN';
      content.counterAxisAlignItems = 'CENTER';
      content.itemSpacing = 20; // Will bind to variable
      content.paddingLeft = 16; // Will bind to variable
      content.paddingRight = 16;
      content.paddingTop = 16;
      content.paddingBottom = 32;
      content.fills = [];
      content.layoutAlign = 'STRETCH';
      content.layoutGrow = 1; // Fill remaining space

      frame.appendChild(content);

      return {
        id: content.id
      };
    `);
    console.log(`✓ Added content area (STRETCH, layoutGrow: 1)\n`);

    // Step 7: Add title text to content
    console.log('✍️  Step 7: Adding title text...');
    await executeInFigma(`
      const content = figma.getNodeById('${contentArea.result.id}');
      const titleStyle = figma.getStyleById('${components.result.titleStyleId}');

      const text = figma.createText();
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      text.characters = 'Help';
      await figma.loadFontAsync({ family: 'DM Sans', style: 'SemiBold' });
      text.textStyleId = titleStyle.id;

      text.name = "Title";
      text.layoutAlign = 'STRETCH'; // Fill width
      text.textAlignHorizontal = 'CENTER';

      content.appendChild(text);

      return { success: true };
    `);
    console.log(`✓ Added title text (FILL width, centered)\n`);

    // Step 8: Add Help Navigation Card
    console.log('🎴 Step 8: Adding Help Navigation Card...');
    await executeInFigma(`
      const content = figma.getNodeById('${contentArea.result.id}');
      const cardComp = figma.getNodeById('${components.result.helpCardId}');

      const card = cardComp.createInstance();
      card.layoutAlign = 'STRETCH'; // Fill width

      content.appendChild(card);

      return { success: true };
    `);
    console.log(`✓ Added Help Navigation Card (FILL width)\n`);

    // Step 9: Add spacer to push button to bottom
    console.log('↕️  Step 9: Adding spacer...');
    await executeInFigma(`
      const content = figma.getNodeById('${contentArea.result.id}');

      const spacer = figma.createFrame();
      spacer.name = "Spacer";
      spacer.resize(1, 1);
      spacer.fills = [];
      spacer.layoutAlign = 'STRETCH';
      spacer.layoutGrow = 1; // Fill remaining space

      content.appendChild(spacer);

      return { success: true };
    `);
    console.log(`✓ Added spacer (layoutGrow: 1)\n`);

    // Step 10: Add button
    console.log('🔲 Step 10: Adding Get in touch button...');
    await executeInFigma(`
      const content = figma.getNodeById('${contentArea.result.id}');
      const buttonComp = figma.getNodeById('${components.result.buttonId}');

      const btn = buttonComp.createInstance();

      // Update button text
      const textNode = btn.findOne(n => n.type === 'TEXT');
      if (textNode) {
        await figma.loadFontAsync(textNode.fontName);
        textNode.characters = 'Get in touch';
      }

      btn.layoutAlign = 'STRETCH'; // Fill width

      content.appendChild(btn);

      return { success: true };
    `);
    console.log(`✓ Added button (FILL width)\n`);

    // Step 11: Bind variables
    console.log('🔗 Step 11: Binding variables...');

    // Bind page background
    await bindVariableToPaint({
      nodeId: mainFrame.result.id,
      paintIndex: 0,
      variableId: pageBg.id,
      isFill: true
    });
    console.log(`   ✓ Main frame background → page-background`);

    // Bind content area spacing
    await bindVariable({
      nodeId: contentArea.result.id,
      field: 'itemSpacing',
      variableId: spacing5.id
    });
    console.log(`   ✓ Content item spacing → spacing-5 (20px)`);

    // Bind content area padding
    await bindVariable({
      nodeId: contentArea.result.id,
      field: 'paddingLeft',
      variableId: spacing4.id
    });
    await bindVariable({
      nodeId: contentArea.result.id,
      field: 'paddingRight',
      variableId: spacing4.id
    });
    await bindVariable({
      nodeId: contentArea.result.id,
      field: 'paddingTop',
      variableId: spacing4.id
    });
    await bindVariable({
      nodeId: contentArea.result.id,
      field: 'paddingBottom',
      variableId: spacing8.id
    });
    console.log(`   ✓ Content padding → spacing-4 (L/R/T), spacing-8 (B)\n`);

    // Bind header padding
    await bindVariable({
      nodeId: header.result.id,
      field: 'paddingLeft',
      variableId: spacing4.id
    });
    await bindVariable({
      nodeId: header.result.id,
      field: 'paddingRight',
      variableId: spacing4.id
    });
    await bindVariable({
      nodeId: header.result.id,
      field: 'paddingBottom',
      variableId: spacing4.id
    });
    console.log(`   ✓ Header padding → spacing-4\n`);

    // Step 12: Select and view
    await executeInFigma(`
      const frame = figma.getNodeById('${mainFrame.result.id}');
      figma.currentPage.selection = [frame];
      figma.viewport.scrollAndZoomIntoView([frame]);
      return { success: true };
    `);

    await notifyFigma('✅ Help screen created with auto-layout!', 3000);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ HELP SCREEN COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Auto-Layout Structure:');
    console.log('   ✓ Main frame: Vertical auto-layout, spacing 0px');
    console.log('   ✓ Background layer');
    console.log('   ✓ Header: Horizontal layout, STRETCH width');
    console.log('   ✓ Content: Vertical layout, STRETCH width, layoutGrow 1');
    console.log('      - Title text (FILL width, centered)');
    console.log('      - Help Navigation Card (FILL width)');
    console.log('      - Spacer (layoutGrow 1)');
    console.log('      - Button (FILL width)\n');

    console.log('🔗 Variable Bindings:');
    console.log('   ✓ Page background → page-background');
    console.log('   ✓ Content item spacing → spacing-5 (20px)');
    console.log('   ✓ Content padding → spacing-4 (16px), spacing-8 (32px bottom)');
    console.log('   ✓ Header padding → spacing-4 (16px)\n');

    console.log('🎉 All children use FILL width (STRETCH layout align)!');
    console.log('   Screen adapts to different viewport sizes.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
