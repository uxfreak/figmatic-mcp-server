// Check Help screen padding structure
const {
  startServer,
  executeInFigma,
  notifyFigma
} = require('./websocket-server/server');

console.log('📏 Checking Help Screen Padding\n');

startServer();

setTimeout(async () => {
  console.log('\n📊 Analyzing padding structure...\n');

  try {
    const analysis = await executeInFigma(`
      const helpScreen = figma.root.findOne(node =>
        node.name === 'Help Screen'
      );

      if (!helpScreen) {
        throw new Error('Help Screen not found');
      }

      // Get main frame padding
      const mainPadding = {
        left: helpScreen.paddingLeft,
        right: helpScreen.paddingRight,
        top: helpScreen.paddingTop,
        bottom: helpScreen.paddingBottom
      };

      // Find content area
      const content = helpScreen.findOne(n => n.name === 'Content');
      const contentPadding = content ? {
        left: content.paddingLeft,
        right: content.paddingRight,
        top: content.paddingTop,
        bottom: content.paddingBottom
      } : null;

      // Find Help Navigation Card
      const helpCard = content ? content.findOne(n =>
        n.name === 'Help Navigation Card' ||
        (n.mainComponent && n.mainComponent.name === 'Help Navigation Card')
      ) : null;

      // Get card position relative to content
      const cardInfo = helpCard ? {
        x: helpCard.x,
        y: helpCard.y,
        width: helpCard.width,
        layoutAlign: helpCard.layoutAlign
      } : null;

      // Find header
      const header = helpScreen.findOne(n => n.name === 'Header');
      const headerPadding = header ? {
        left: header.paddingLeft,
        right: header.paddingRight,
        top: header.paddingTop,
        bottom: header.paddingBottom
      } : null;

      return {
        mainPadding: mainPadding,
        headerPadding: headerPadding,
        contentPadding: contentPadding,
        cardInfo: cardInfo,
        screenWidth: helpScreen.width
      };
    `);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 HELP SCREEN PADDING STRUCTURE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`Screen Width: ${analysis.result.screenWidth}px\n`);

    console.log('Main Frame Padding:');
    console.log(`   Left: ${analysis.result.mainPadding.left}px`);
    console.log(`   Right: ${analysis.result.mainPadding.right}px`);
    console.log(`   Top: ${analysis.result.mainPadding.top}px`);
    console.log(`   Bottom: ${analysis.result.mainPadding.bottom}px\n`);

    if (analysis.result.headerPadding) {
      console.log('Header Padding:');
      console.log(`   Left: ${analysis.result.headerPadding.left}px`);
      console.log(`   Right: ${analysis.result.headerPadding.right}px`);
      console.log(`   Top: ${analysis.result.headerPadding.top}px`);
      console.log(`   Bottom: ${analysis.result.headerPadding.bottom}px\n`);
    }

    if (analysis.result.contentPadding) {
      console.log('Content Area Padding:');
      console.log(`   Left: ${analysis.result.contentPadding.left}px`);
      console.log(`   Right: ${analysis.result.contentPadding.right}px`);
      console.log(`   Top: ${analysis.result.contentPadding.top}px`);
      console.log(`   Bottom: ${analysis.result.contentPadding.bottom}px\n`);
    }

    if (analysis.result.cardInfo) {
      console.log('Help Navigation Card:');
      console.log(`   Layout Align: ${analysis.result.cardInfo.layoutAlign}`);
      console.log(`   Width: ${analysis.result.cardInfo.width}px`);
      console.log(`   Position X: ${analysis.result.cardInfo.x}px`);
      console.log(`   Position Y: ${analysis.result.cardInfo.y}px\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📐 HORIZONTAL SPACING CALCULATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const totalHorizontalPadding = analysis.result.mainPadding.left +
                                   (analysis.result.contentPadding?.left || 0);

    console.log(`Edge to Card padding: ${totalHorizontalPadding}px`);
    console.log(`   = Main frame left (${analysis.result.mainPadding.left}px) + Content left (${analysis.result.contentPadding?.left || 0}px)\n`);

    const expectedCardWidth = analysis.result.screenWidth - (totalHorizontalPadding * 2);
    console.log(`Expected card width: ${expectedCardWidth}px`);
    console.log(`   = Screen width (${analysis.result.screenWidth}px) - (padding × 2)\n`);

    if (analysis.result.cardInfo) {
      console.log(`Actual card width: ${analysis.result.cardInfo.width}px`);
      if (analysis.result.cardInfo.layoutAlign === 'STRETCH') {
        console.log('   ✓ Card uses STRETCH (fills width automatically)\n');
      } else {
        console.log(`   ⚠️  Card uses ${analysis.result.cardInfo.layoutAlign} (may not fill width)\n`);
      }
    }

    await notifyFigma('✅ Padding analysis complete!', 2000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
