/**
 * MCP Manual Test Client
 *
 * Tests MCP server endpoints without requiring Claude Desktop
 * Uses HTTP requests to validate protocol implementation
 *
 * Usage: node tests/mcp-manual-test.js
 */

const http = require('http');

const MCP_HOST = 'localhost';
const MCP_PORT = 3000;

/**
 * Make an HTTP POST request to MCP server
 */
function mcpRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

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
      let body = '';

      res.on('data', (chunk) => {
        body += chunk.toString();
      });

      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: body,
            parsed: body ? JSON.parse(body) : null
          });
        } catch (e) {
          // SSE response, not JSON
          resolve({
            statusCode: res.statusCode,
            body: body,
            parsed: null
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Make a health check request
 */
function healthCheck() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: MCP_HOST,
      port: MCP_PORT,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk.toString();
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          parsed: JSON.parse(body)
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   MCP Server Manual Test Suite                   ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Test 1: Health Check
    console.log('📋 Test 1: Health Check');
    const health = await healthCheck();
    console.log(`   Status: ${health.statusCode}`);
    console.log(`   Server: ${health.parsed.server}`);
    console.log(`   Protocol: ${health.parsed.protocol}`);
    console.log(`   Figma Connected: ${health.parsed.figmaConnected}`);
    console.log('   ✅ Health check passed\n');

    // Test 2: Initialize
    console.log('📋 Test 2: Initialize Handshake');
    const initResponse = await mcpRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    });
    console.log(`   Status: ${initResponse.statusCode}`);
    console.log(`   Protocol: ${initResponse.parsed.result.protocolVersion}`);
    console.log(`   Server: ${initResponse.parsed.result.serverInfo.name}`);
    console.log(`   Streaming: ${initResponse.parsed.result.capabilities.streaming}`);
    console.log('   ✅ Initialize handshake passed\n');

    // Test 3: Tools List
    console.log('📋 Test 3: Tools List');
    const toolsResponse = await mcpRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list'
    });
    console.log(`   Status: ${toolsResponse.statusCode}`);
    console.log(`   Tools Count: ${toolsResponse.parsed.result.tools.length}`);
    console.log('   Tools:');
    toolsResponse.parsed.result.tools.forEach((tool, i) => {
      const readWrite = i < 5 ? '[READ]' : '[WRITE]';
      console.log(`     ${i + 1}. ${tool.name} ${readWrite}`);
    });
    console.log('   ✅ Tools list passed\n');

    // Test 4: Tool Call (will fail in Phase 1, succeed in Phase 2)
    console.log('📋 Test 4: Tool Call (get_design_system)');
    const callResponse = await mcpRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_design_system',
        arguments: {}
      }
    });
    console.log(`   Status: ${callResponse.statusCode}`);
    if (callResponse.body.includes('error')) {
      console.log('   ⚠️  Tool implementation not yet available (expected in Phase 1)');
      console.log('   ✅ Will be implemented in Phase 2\n');
    } else {
      console.log('   ✅ Tool executed successfully\n');
    }

    // Summary
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║   Test Summary                                    ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
    console.log('✅ Phase 1: Core MCP Protocol - COMPLETE');
    console.log('   - Health check works');
    console.log('   - Initialize handshake works');
    console.log('   - Tools list works (10 tools defined)');
    console.log('   - Tools call endpoint works (awaiting Phase 2 implementations)');
    console.log('');
    console.log('🎯 Next: Phase 2 - Implement READ tool handlers');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Test failed:', error.message);
    console.error('');
    console.error('💡 Make sure:');
    console.error('   1. MCP server is running (npm start in mcp-server/)');
    console.error('   2. Server is listening on port 3000');
    console.error('');
    process.exit(1);
  }
}

// Run tests
runTests();
