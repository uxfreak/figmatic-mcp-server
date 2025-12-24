// Analyze Profile page auto-layout structure
const {
  startServer,
  executeInFigma,
  notifyFigma
} = require('./websocket-server/server');

console.log('🔍 Analyzing Profile Page Structure\n');

startServer();

setTimeout(async () => {
  console.log('\n📊 Finding and analyzing Profile page...\n');

  try {
    const analysis = await executeInFigma(`
      // Find onboarding light frame/component
      const profilePage = figma.root.findOne(node =>
        node.name.toLowerCase().includes('onboarding') &&
        node.name.toLowerCase().includes('light')
      );

      if (!profilePage) {
        // List all frames, components, and component sets
        const all = figma.root.findAll(node =>
          (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') &&
          (node.name.toLowerCase().includes('screen') ||
           node.name.toLowerCase().includes('page') ||
           node.name.toLowerCase().includes('card') ||
           node.name.toLowerCase().includes('navigation'))
        );

        return {
          found: false,
          available: all.map(f => ({ id: f.id, name: f.name, type: f.type }))
        };
      }

      // Analyze auto-layout structure
      const structure = {
        id: profilePage.id,
        name: profilePage.name,
        type: profilePage.type,
        width: profilePage.width,
        height: profilePage.height,
        layoutMode: profilePage.layoutMode,
        primaryAxisSizingMode: profilePage.primaryAxisSizingMode,
        counterAxisSizingMode: profilePage.counterAxisSizingMode,
        primaryAxisAlignItems: profilePage.primaryAxisAlignItems,
        counterAxisAlignItems: profilePage.counterAxisAlignItems,
        itemSpacing: profilePage.itemSpacing,
        paddingLeft: profilePage.paddingLeft,
        paddingRight: profilePage.paddingRight,
        paddingTop: profilePage.paddingTop,
        paddingBottom: profilePage.paddingBottom,
        fills: profilePage.fills,
        childCount: profilePage.children.length
      };

      // Analyze children
      const children = profilePage.children.map((child, index) => ({
        index: index,
        id: child.id,
        name: child.name,
        type: child.type,
        layoutMode: child.layoutMode,
        width: child.width,
        height: child.height,
        layoutAlign: child.layoutAlign,
        layoutGrow: child.layoutGrow,
        itemSpacing: child.itemSpacing,
        paddingTop: child.paddingTop,
        paddingBottom: child.paddingBottom,
        paddingLeft: child.paddingLeft,
        paddingRight: child.paddingRight
      }));

      return {
        found: true,
        structure: structure,
        children: children
      };
    `);

    if (!analysis.result.found) {
      console.log('❌ Profile page not found!\n');
      console.log('📋 Available pages/screens:');
      analysis.result.availablePages.forEach(page => {
        console.log(`   - ${page.name} (${page.id})`);
      });
      return;
    }

    const s = analysis.result.structure;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 PROFILE PAGE STRUCTURE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`Name: ${s.name}`);
    console.log(`ID: ${s.id}`);
    console.log(`Type: ${s.type}`);
    console.log(`Size: ${s.width}×${s.height}px\n`);

    console.log('🔲 Auto-Layout Settings:');
    console.log(`   Layout Mode: ${s.layoutMode || 'NONE (absolute positioning)'}`);
    if (s.layoutMode) {
      console.log(`   Primary Axis Sizing: ${s.primaryAxisSizingMode}`);
      console.log(`   Counter Axis Sizing: ${s.counterAxisSizingMode}`);
      console.log(`   Primary Align: ${s.primaryAxisAlignItems}`);
      console.log(`   Counter Align: ${s.counterAxisAlignItems}`);
      console.log(`   Item Spacing: ${s.itemSpacing}px`);
    }
    console.log(`   Padding: T=${s.paddingTop} R=${s.paddingRight} B=${s.paddingBottom} L=${s.paddingLeft}\n`);

    console.log('👶 Children (' + s.childCount + ' items):\n');
    analysis.result.children.forEach((child, i) => {
      console.log(`${i + 1}. ${child.name}`);
      console.log(`   Type: ${child.type}`);
      console.log(`   Layout Mode: ${child.layoutMode || 'NONE'}`);
      console.log(`   Size: ${child.width}×${child.height}px`);
      if (child.layoutMode) {
        console.log(`   Item Spacing: ${child.itemSpacing}px`);
        console.log(`   Padding: T=${child.paddingTop} R=${child.paddingRight} B=${child.paddingBottom} L=${child.paddingLeft}`);
      }
      if (child.layoutAlign) {
        console.log(`   Layout Align: ${child.layoutAlign}`);
      }
      if (child.layoutGrow !== undefined && child.layoutGrow !== 0) {
        console.log(`   Layout Grow: ${child.layoutGrow}`);
      }
      console.log('');
    });

    await notifyFigma('✅ Profile page analyzed!', 2000);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 KEY PATTERNS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Use this structure for Help screen:');
    if (s.layoutMode === 'VERTICAL') {
      console.log('✓ Vertical auto-layout');
      console.log('✓ Item spacing: ' + s.itemSpacing + 'px');
      console.log('✓ Padding: ' + s.paddingTop + 'px (or appropriate variable)');
    } else {
      console.log('⚠️  Profile page uses absolute positioning');
      console.log('   Consider using vertical auto-layout for Help screen\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
