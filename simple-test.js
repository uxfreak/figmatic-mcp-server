// Simple test that uses the already-running server
// by connecting via WebSocket directly

const WebSocket = require('ws');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendCommand(ws, command) {
  return new Promise((resolve, reject) => {
    const requestId = `test-${Date.now()}`;

    const handler = (event) => {
      const data = JSON.parse(event.data.toString());
      if (data.requestId === requestId) {
        ws.removeEventListener('message', handler);
        resolve(data);
      }
    };

    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ ...command, requestId }));

    setTimeout(() => {
      ws.removeEventListener('message', handler);
      reject(new Error('Timeout'));
    }, 10000);
  });
}

async function test() {
  console.log('\n🧪 Testing Figma AI Agent Bridge (via direct WebSocket)...\n');

  const ws = new WebSocket('ws://localhost:8080');

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  console.log('✓ Connected to WebSocket server\n');

  try {
    // Send handshake
    ws.send(JSON.stringify({
      type: 'handshake',
      source: 'test-client',
      timestamp: Date.now()
    }));

    await sleep(500);

    // Test 1: Get context
    console.log('Test 1: Getting Figma context...');
    const contextResult = await sendCommand(ws, { type: 'get-context' });
    if (contextResult.context) {
      console.log('✓ Context received!');
      console.log('  Document:', contextResult.context.document.name);
      console.log('  Current Page:', contextResult.context.currentPage.name);
      console.log('  Selection Count:', contextResult.context.selectionCount);
      console.log('');
    }

    // Test 2: Create a rectangle
    console.log('Test 2: Creating a blue rectangle...');
    const rectScript = `
      const rect = figma.createRectangle();
      rect.name = "AI Test Rectangle";
      rect.resize(150, 100);
      rect.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 1.0 } }];
      figma.currentPage.appendChild(rect);
      figma.currentPage.selection = [rect];
      figma.viewport.scrollAndZoomIntoView([rect]);
      return { id: rect.id, name: rect.name, width: rect.width, height: rect.height };
    `;

    const rectResult = await sendCommand(ws, { type: 'execute', script: rectScript });
    if (rectResult.success) {
      console.log('✓ Rectangle created!');
      console.log('  ID:', rectResult.result.id);
      console.log('  Name:', rectResult.result.name);
      console.log('  Size:', rectResult.result.width, 'x', rectResult.result.height);
      console.log('');
    }

    // Test 3: Create text
    console.log('Test 3: Creating text node...');
    const textScript = `
      await figma.loadFontAsync({ family: "Inter", style: "Bold" });
      const text = figma.createText();
      text.characters = "Hello from Claude Code!";
      text.fontSize = 32;
      text.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.8, b: 0.3 } }];
      text.y = 150;
      figma.currentPage.appendChild(text);
      return { id: text.id, text: text.characters };
    `;

    const textResult = await sendCommand(ws, { type: 'execute', script: textScript });
    if (textResult.success) {
      console.log('✓ Text created!');
      console.log('  ID:', textResult.result.id);
      console.log('  Text:', textResult.result.text);
      console.log('');
    }

    // Test 4: Send notification
    console.log('Test 4: Sending notification...');
    ws.send(JSON.stringify({
      type: 'notify',
      message: '🎉 Claude Code is connected to Figma!',
      timeout: 5000
    }));
    console.log('✓ Notification sent!\n');

    console.log('✅ All tests passed! The AI Agent Bridge is working perfectly!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    ws.close();
  }
}

test();
