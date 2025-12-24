// Quick test - assumes server is already running
const { executeInFigma, getFigmaContext, isConnected } = require('./websocket-server/server-refactored');

async function test() {
  console.log('\n🧪 Quick Test of Refactored Server\n');

  if (!isConnected()) {
    console.log('❌ Not connected');
    return;
  }

  try {
    const ctx = await getFigmaContext();
    console.log('✓ Context:', ctx.context.currentPage.name);

    const result = await executeInFigma(`
      const rect = figma.createRectangle();
      rect.name = "Refactored Works!";
      rect.resize(100, 100);
      rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0.4, b: 0 } }];
      figma.currentPage.appendChild(rect);
      return { id: rect.id };
    `);

    console.log('✓ Created rectangle:', result.result.id);
    console.log('\n✅ Refactored server working!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
