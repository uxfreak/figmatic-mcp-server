/**
 * Research script to explore Figma Component Properties API
 * Tests what methods are available for:
 * 1. Component properties (exposing text, boolean, etc.)
 * 2. Text truncation (maxLines, ellipsis)
 */

const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('Connected to Figma');

  ws.send(JSON.stringify({
    type: 'execute',
    requestId: 'research-1',
    script: `
      // Get our InboxListItem component
      const component = figma.getNodeById("184:5648");

      if (!component) {
        return { error: "Component not found" };
      }

      // Research 1: Component Properties API
      const componentPropertiesAPI = {
        hasAddComponentProperty: typeof component.addComponentProperty === 'function',
        hasComponentProperties: 'componentProperties' in component,
        hasComponentPropertyDefinitions: 'componentPropertyDefinitions' in component,
        currentProperties: component.componentPropertyDefinitions || {}
      };

      // Research 2: Get a text node to test truncation
      const titleNode = figma.getNodeById("184:5655"); // Title text node

      const textTruncationAPI = {
        hasTextTruncation: 'textTruncation' in titleNode,
        hasMaxLines: 'maxLines' in titleNode,
        currentTruncation: titleNode.textTruncation,
        currentMaxLines: titleNode.maxLines,
        hasComponentPropertyReferences: 'componentPropertyReferences' in titleNode
      };

      // Research 3: Instance property overrides
      const instance = figma.getNodeById("184:5659"); // First inbox item instance
      const instanceAPI = {
        hasComponentProperties: 'componentProperties' in instance,
        hasSetProperties: typeof instance.setProperties === 'function',
        currentProperties: instance.componentProperties || {}
      };

      return {
        componentAPI: componentPropertiesAPI,
        textAPI: textTruncationAPI,
        instanceAPI: instanceAPI,
        componentType: component.type,
        textNodeType: titleNode.type
      };
    `
  }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data.toString());
  console.log('\n=== Figma API Research Results ===\n');
  console.log(JSON.stringify(response, null, 2));
  ws.close();
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('Error:', error);
  process.exit(1);
});

setTimeout(() => {
  console.error('Timeout');
  ws.close();
  process.exit(1);
}, 5000);
