/**
 * Test WebSocket connection status
 */

const wsServer = require('../../websocket-server/server.js');

console.log('Testing WebSocket connection...\n');

// Test isConnected
const connected = wsServer.isConnected();
console.log(`isConnected() result: ${connected}`);

// Test getStatus
const status = wsServer.getStatus();
console.log(`\nFull status:`, JSON.stringify(status, null, 2));

// Also test if we can actually execute
if (connected) {
  console.log('\n✓ Figma is connected! Ready to test tools.');
} else {
  console.log('\n✗ Figma is NOT connected.');
  console.log('Please make sure:');
  console.log('1. WebSocket server is running (port 8080)');
  console.log('2. Figma Desktop is open');
  console.log('3. AI Agent Bridge plugin is active in Figma');
}
