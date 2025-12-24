// Analyze existing components for Help screen assembly
const {
  startServer,
  executeInFigma,
  notifyFigma
} = require('./websocket-server/server');

console.log('🔍 Analyzing Existing Components for Help Screen\n');

startServer();

setTimeout(async () => {
  console.log('\n📊 Finding required components...\n');

  try {
    const components = await executeInFigma(`
      // Find all components we need
      const backButton = figma.root.findOne(node =>
        node.type === 'COMPONENT' &&
        node.name === 'BackButton'
      );

      const helpCard = figma.root.findOne(node =>
        node.type === 'COMPONENT' &&
        node.name === 'Help Navigation Card'
      );

      // Find Button component (might be called "Button" or have variants)
      const buttonComponent = figma.root.findOne(node =>
        node.type === 'COMPONENT' &&
        (node.name === 'Button' || node.name.toLowerCase().includes('button/'))
      );

      const buttonSet = figma.root.findOne(node =>
        node.type === 'COMPONENT_SET' &&
        node.name === 'Button'
      );

      // Get text styles
      const textStyles = figma.getLocalTextStyles();

      return {
        backButton: backButton ? { id: backButton.id, name: backButton.name } : null,
        helpCard: helpCard ? { id: helpCard.id, name: helpCard.name } : null,
        buttonComponent: buttonComponent ? { id: buttonComponent.id, name: buttonComponent.name } : null,
        buttonSet: buttonSet ? { id: buttonSet.id, name: buttonSet.name, childCount: buttonSet.children?.length } : null,
        textStyles: textStyles.map(s => ({ id: s.id, name: s.name }))
      };
    `);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 AVAILABLE COMPONENTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✓ Components Found:');
    if (components.result.backButton) {
      console.log('   BackButton: ✅ ' + components.result.backButton.name);
    } else {
      console.log('   BackButton: ❌ Not found');
    }

    if (components.result.helpCard) {
      console.log('   Help Navigation Card: ✅ ' + components.result.helpCard.name);
    } else {
      console.log('   Help Navigation Card: ❌ Not found');
    }

    if (components.result.buttonComponent) {
      console.log('   Button Component: ✅ ' + components.result.buttonComponent.name);
    } else {
      console.log('   Button Component: ❌ Not found');
    }

    if (components.result.buttonSet) {
      console.log('   Button Set: ✅ ' + components.result.buttonSet.name + ' (' + components.result.buttonSet.childCount + ' variants)');
    } else {
      console.log('   Button Set: ❌ Not found');
    }
    console.log('');

    console.log('✓ Text Styles Available:');
    components.result.textStyles.forEach(style => {
      console.log('   - ' + style.name);
    });
    console.log('');

    await notifyFigma('✅ Component analysis complete!', 2000);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 NEXT STEPS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('To build Help screen, we need to:');
    console.log('1. Create page frame (Help Screen)');
    console.log('2. Add BackButton instance');
    console.log('3. Add "Help" title text (using appropriate text style)');
    console.log('4. Add Help Navigation Card instance');
    if (components.result.buttonComponent || components.result.buttonSet) {
      console.log('5. Add Button instance with "Get in touch" label\n');
    } else {
      console.log('5. Create "Get in touch" button (no Button component found)\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
