// Check text style fonts
const {
  startServer,
  executeInFigma,
  notifyFigma
} = require('./websocket-server/server');

console.log('🔍 Checking Text Styles\n');

startServer();

setTimeout(async () => {
  console.log('\n📊 Analyzing text styles...\n');

  try {
    const styles = await executeInFigma(`
      const textStyles = figma.getLocalTextStyles();

      return textStyles.map(style => ({
        id: style.id,
        name: style.name,
        fontName: style.fontName,
        fontSize: style.fontSize,
        fontWeight: style.fontName.style
      }));
    `);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 TEXT STYLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    styles.result.forEach(style => {
      console.log(`Name: ${style.name}`);
      console.log(`   Font: ${style.fontName.family} ${style.fontName.style}`);
      console.log(`   Size: ${style.fontSize}px\n`);
    });

    await notifyFigma('✅ Text style check complete!', 2000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}, 5000);

console.log('⏳ Waiting for Figma plugin...\n');
