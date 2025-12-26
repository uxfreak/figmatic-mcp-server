/**
 * Single Tool Test - Test one tool and show full response
 */

const http = require('http');

const MCP_HOST = 'localhost';
const MCP_PORT = 3000;

function mcpToolCall(toolName, args) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    });

    const options = {
      hostname: MCP_HOST,
      port: MCP_PORT,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let rawData = '';

      res.on('data', (chunk) => {
        rawData += chunk.toString();
        console.log('Chunk received:', chunk.toString());
      });

      res.on('end', () => {
        console.log('\n=== Full Response ===');
        console.log(rawData);
        console.log('===================\n');
        resolve(rawData);
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTest() {
  console.log('Testing get_design_system tool...\n');

  try {
    const result = await mcpToolCall('get_design_system', {
      includeVariables: true,
      includeStyles: true
    });

    console.log('✅ Test complete');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTest();
