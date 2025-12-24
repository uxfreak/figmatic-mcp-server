// Create Help Navigation Card - Option B (Individual SettingsListItem instances)
const {
  startServer,
  executeInFigma,
  getAllVariables,
  bindVariable,
  bindVariableToPaint,
  notifyFigma
} = require('./websocket-server/server');

console.log('📋 Creating Help Navigation Card\n');

startServer();

setTimeout(async () => {
  console.log('\n🚀 Building Settings Navigation Card...\n');

  try {
    // Step 1: Get all variables we'll need
    console.log('📊 Step 1: Getting variables...');
    const allVars = await getAllVariables();

    const spacing4 = allVars.variables.find(v => v.name === 'Spacing/spacing-4');
    const cardRadius = allVars.variables.find(v => v.name === 'Dimensions/Radius/card-radius');
    const cardBg = allVars.variables.find(v => v.name === 'Fills/card-background');
    const cardBorder = allVars.variables.find(v => v.name === 'Strokes/card-border');
    const iconContainerTeal = allVars.variables.find(v => v.name === 'Fills/icon-container-teal');
    const iconTeal = allVars.variables.find(v => v.name === 'Icons/icon-teal');

    console.log(`✓ spacing-4: ${spacing4.id} (16px)`);
    console.log(`✓ card-radius: ${cardRadius.id} (16px)`);
    console.log(`✓ card-background: ${cardBg.id}`);
    console.log(`✓ card-border: ${cardBorder.id}`);
    console.log(`✓ icon-container-teal: ${iconContainerTeal.id}`);
    console.log(`✓ icon-teal: ${iconTeal.id}\n`);

    // Step 2: Find SettingsListItem component set and icons
    console.log('🔍 Step 2: Finding components...');
    const components = await executeInFigma(`
      // Find SettingsListItem component set
      const itemSet = figma.root.findOne(node =>
        node.type === 'COMPONENT_SET' &&
        node.name === 'SettingsListItem'
      );

      if (!itemSet) {
        throw new Error('SettingsListItem component set not found');
      }

      // Find variants
      const firstVariant = itemSet.findOne(n =>
        n.type === 'COMPONENT' &&
        n.name === 'order=first, state=default'
      );
      const middleVariant = itemSet.findOne(n =>
        n.type === 'COMPONENT' &&
        n.name === 'order=middle, state=default'
      );
      const lastVariant = itemSet.findOne(n =>
        n.type === 'COMPONENT' &&
        n.name === 'order=last, state=default'
      );

      // Find help icons
      const receiptIcon = figma.root.findOne(n =>
        n.type === 'COMPONENT' &&
        n.name.toLowerCase().includes('receipt')
      );
      const flagIcon = figma.root.findOne(n =>
        n.type === 'COMPONENT' &&
        (n.name.toLowerCase().includes('flag') && !n.name.toLowerCase().includes('flagged'))
      );
      const inboxIcon = figma.root.findOne(n =>
        n.type === 'COMPONENT' &&
        n.name.toLowerCase().includes('inbox')
      );
      const banIcon = figma.root.findOne(n =>
        n.type === 'COMPONENT' &&
        n.name.toLowerCase().includes('ban')
      );
      const circleHelpIcon = figma.root.findOne(n =>
        n.type === 'COMPONENT' &&
        (n.name.toLowerCase().includes('circle-question') ||
         n.name.toLowerCase().includes('help'))
      );

      return {
        variants: {
          first: firstVariant?.id,
          middle: middleVariant?.id,
          last: lastVariant?.id
        },
        icons: {
          receipt: receiptIcon?.id,
          flag: flagIcon?.id,
          inbox: inboxIcon?.id,
          ban: banIcon?.id,
          circleHelp: circleHelpIcon?.id
        }
      };
    `);

    console.log('✓ Found SettingsListItem variants:');
    console.log(`   First: ${components.result.variants.first}`);
    console.log(`   Middle: ${components.result.variants.middle}`);
    console.log(`   Last: ${components.result.variants.last}`);
    console.log('✓ Found icons:');
    console.log(`   Receipt: ${components.result.icons.receipt}`);
    console.log(`   Flag: ${components.result.icons.flag}`);
    console.log(`   Inbox: ${components.result.icons.inbox}`);
    console.log(`   Ban: ${components.result.icons.ban}`);
    console.log(`   CircleHelp: ${components.result.icons.circleHelp}\n`);

    // Step 3: Create card container
    console.log('📦 Step 3: Creating card container...');
    const cardResult = await executeInFigma(`
      // Create auto-layout frame
      const card = figma.createFrame();
      card.name = "Help Navigation Card";

      // Auto-layout settings
      card.layoutMode = 'VERTICAL';
      card.itemSpacing = 0;  // Items are adjacent
      card.paddingLeft = 8;
      card.paddingRight = 8;
      card.paddingTop = 8;
      card.paddingBottom = 8;
      card.cornerRadius = 16;
      card.primaryAxisSizingMode = 'AUTO';
      card.counterAxisSizingMode = 'AUTO';

      // Position in center of viewport
      card.x = figma.viewport.center.x - 150;
      card.y = figma.viewport.center.y - 150;

      // Styling (temporary colors, will bind later)
      card.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      card.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 } }];
      card.strokeWeight = 1;

      figma.currentPage.appendChild(card);
      figma.currentPage.selection = [card];
      figma.viewport.scrollAndZoomIntoView([card]);

      return {
        id: card.id,
        name: card.name
      };
    `);

    console.log(`✓ Created: ${cardResult.result.name}`);
    console.log(`   ID: ${cardResult.result.id}\n`);

    // Step 4: Create 5 SettingsListItem instances
    console.log('📋 Step 4: Creating 5 navigation items...');

    const items = [
      { label: 'Dispute a transaction', iconId: components.result.icons.receipt, variantId: components.result.variants.first },
      { label: 'Report an issue', iconId: components.result.icons.flag, variantId: components.result.variants.middle },
      { label: 'My issues', iconId: components.result.icons.inbox, variantId: components.result.variants.middle },
      { label: 'Cancel a transfer', iconId: components.result.icons.ban, variantId: components.result.variants.middle },
      { label: 'Frequently asked questions', iconId: components.result.icons.circleHelp, variantId: components.result.variants.last }
    ];

    const createdItems = await executeInFigma(`
      const card = figma.getNodeById('${cardResult.result.id}');

      const itemsData = ${JSON.stringify(items)};
      const createdItems = [];

      for (const itemData of itemsData) {
        // Get variant component
        const variant = figma.getNodeById(itemData.variantId);

        // Create instance
        const instance = variant.createInstance();

        // Add to card
        card.appendChild(instance);

        createdItems.push({
          id: instance.id,
          label: itemData.label,
          iconId: itemData.iconId
        });
      }

      return { items: createdItems };
    `);

    console.log(`✓ Created ${createdItems.result.items.length} navigation items\n`);

    // Step 5: Configure each item (set label text)
    console.log('✍️  Step 5: Setting labels...');
    for (let i = 0; i < createdItems.result.items.length; i++) {
      const item = createdItems.result.items[i];

      await executeInFigma(`
        const instance = figma.getNodeById('${item.id}');

        // Find text node (label)
        const textNode = instance.findOne(n => n.type === 'TEXT');

        if (textNode) {
          // Load font
          await figma.loadFontAsync(textNode.fontName);
          textNode.characters = '${item.label}';
        }

        return { success: true };
      `);

      console.log(`   ✓ Item ${i + 1}: "${item.label}"`);
    }
    console.log('');

    // Step 6: Swap icons (this is the complex part - need to access icon slots)
    console.log('🎨 Step 6: Swapping icons...');
    console.log('   (This requires accessing icon slots in component instances)\n');

    // Note: Icon swapping in component instances is complex
    // For MVP, we'll document this for manual completion
    console.log('   ⚠️  Icon swapping requires component property overrides');
    console.log('   📝 Manual step: Swap icons in Figma UI for each item\n');

    await notifyFigma('✅ Navigation card created!', 3000);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ HELP NAVIGATION CARD CREATED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 What was created:');
    console.log('   ✓ Card container with auto-layout');
    console.log('   ✓ 5 SettingsListItem instances (first, middle×3, last)');
    console.log('   ✓ Labels set correctly\n');

    console.log('🎯 Next steps (Manual in Figma):');
    console.log('   1. Swap icons in each item:');
    console.log('      - Item 1: Receipt icon');
    console.log('      - Item 2: Flag icon');
    console.log('      - Item 3: Inbox icon');
    console.log('      - Item 4: Ban icon');
    console.log('      - Item 5: CircleHelp icon');
    console.log('   2. Then I can bind all variables automatically\n');

    console.log('💡 The card is now selected in your viewport!');
    console.log('   Ready for icon swapping.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
