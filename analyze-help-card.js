// Analyze Help Navigation Card structure
const {
  startServer,
  executeInFigma,
  notifyFigma
} = require('./websocket-server/server');

console.log('🔍 Analyzing Help Navigation Card\n');

startServer();

setTimeout(async () => {
  console.log('\n📊 Inspecting card structure...\n');

  try {
    // Find and analyze the Help Navigation Card
    const analysis = await executeInFigma(`
      // Find the Help Navigation Card
      const card = figma.root.findOne(node =>
        node.name === 'Help Navigation Card'
      );

      if (!card) {
        throw new Error('Help Navigation Card not found');
      }

      // Get card structure
      const cardInfo = {
        id: card.id,
        name: card.name,
        type: card.type,
        width: card.width,
        height: card.height,
        layoutMode: card.layoutMode,
        itemSpacing: card.itemSpacing,
        padding: {
          left: card.paddingLeft,
          right: card.paddingRight,
          top: card.paddingTop,
          bottom: card.paddingBottom
        },
        cornerRadius: card.cornerRadius,
        fills: card.fills,
        strokes: card.strokes,
        strokeWeight: card.strokeWeight,
        childCount: card.children.length
      };

      // Analyze each item
      const items = card.children.map((item, index) => {
        // Get component properties
        const componentProps = {};
        if (item.type === 'INSTANCE' && item.componentProperties) {
          Object.keys(item.componentProperties).forEach(key => {
            componentProps[key] = item.componentProperties[key];
          });
        }

        // Find text nodes
        const textNodes = item.findAll(n => n.type === 'TEXT');
        const texts = textNodes.map(t => ({
          name: t.name,
          characters: t.characters,
          visible: t.visible
        }));

        // Find icon containers
        const iconContainers = item.findAll(n =>
          n.name && (n.name.includes('Icon') || n.name.includes('icon'))
        );
        const icons = iconContainers.map(ic => ({
          name: ic.name,
          type: ic.type,
          id: ic.id,
          visible: ic.visible
        }));

        return {
          index: index + 1,
          id: item.id,
          name: item.name,
          type: item.type,
          componentProperties: componentProps,
          texts: texts,
          icons: icons
        };
      });

      return {
        card: cardInfo,
        items: items
      };
    `);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 CARD CONTAINER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const card = analysis.result.card;
    console.log(`Name: ${card.name}`);
    console.log(`ID: ${card.id}`);
    console.log(`Type: ${card.type}`);
    console.log(`Size: ${card.width}×${card.height}px`);
    console.log(`Layout: ${card.layoutMode}`);
    console.log(`Item Spacing: ${card.itemSpacing}px`);
    console.log(`Padding: L=${card.padding.left} R=${card.padding.right} T=${card.padding.top} B=${card.padding.bottom}`);
    console.log(`Corner Radius: ${card.cornerRadius}px`);
    console.log(`Stroke Weight: ${card.strokeWeight}px`);
    console.log(`Children: ${card.childCount}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 NAVIGATION ITEMS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    analysis.result.items.forEach(item => {
      console.log(`Item ${item.index}: ${item.name}`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Type: ${item.type}`);

      if (Object.keys(item.componentProperties).length > 0) {
        console.log(`   Component Properties:`);
        Object.entries(item.componentProperties).forEach(([key, value]) => {
          console.log(`      ${key}: ${JSON.stringify(value)}`);
        });
      }

      if (item.texts.length > 0) {
        console.log(`   Text Nodes:`);
        item.texts.forEach(t => {
          console.log(`      - "${t.characters}" (visible: ${t.visible})`);
        });
      }

      if (item.icons.length > 0) {
        console.log(`   Icon Nodes:`);
        item.icons.forEach(ic => {
          console.log(`      - ${ic.name} (${ic.type}, visible: ${ic.visible})`);
        });
      }

      console.log('');
    });

    await notifyFigma('✅ Analysis complete!', 2000);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 KEY FINDINGS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Component Properties to check:');
    const allProps = new Set();
    analysis.result.items.forEach(item => {
      Object.keys(item.componentProperties).forEach(prop => allProps.add(prop));
    });
    if (allProps.size > 0) {
      allProps.forEach(prop => console.log(`   - ${prop}`));
    } else {
      console.log('   (No component properties found)');
    }

    console.log('\n2. Text nodes found:');
    const hasHelpText = analysis.result.items.some(item =>
      item.texts.some(t => t.name && t.name.toLowerCase().includes('help'))
    );
    if (hasHelpText) {
      console.log('   ✓ Help text nodes detected - need to hide/disable');
    } else {
      console.log('   ✓ All text nodes are labels');
    }

    console.log('\n3. Icons status:');
    const iconCount = analysis.result.items.reduce((sum, item) => sum + item.icons.length, 0);
    console.log(`   ✓ Found ${iconCount} icon-related nodes\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
