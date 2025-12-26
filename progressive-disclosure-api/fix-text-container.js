/**
 * Quick script to fix Text Container styling
 * Removes white background and sets itemSpacing to 4px
 */

const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('Connected to WebSocket bridge');

  // Send execute command
  ws.send(JSON.stringify({
    type: 'execute',
    requestId: 'fix-text-container-1',
    script: `
      const textContainer = figma.getNodeById("184:5652");

      if (!textContainer) {
        throw new Error("Text Container not found");
      }

      // Remove white background (set to transparent)
      textContainer.fills = [];

      // Set itemSpacing to 4px
      textContainer.itemSpacing = 4;

      return {
        success: true,
        nodeId: textContainer.id,
        nodeName: textContainer.name,
        fills: textContainer.fills,
        itemSpacing: textContainer.itemSpacing
      };
    `
  }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data.toString());
  console.log('Response:', JSON.stringify(response, null, 2));

  if (response.type === 'result' || response.type === 'error') {
    ws.close();
    process.exit(response.type === 'error' ? 1 : 0);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
  process.exit(1);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.error('Timeout waiting for response');
  ws.close();
  process.exit(1);
}, 5000);
