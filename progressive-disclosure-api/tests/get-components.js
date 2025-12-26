/**
 * Get all local components from Figma
 */

const wsServer = require('/Users/kasa/Downloads/Projects/figmatic/websocket-server/server.js');

async function getComponents() {
  try {
    const result = await wsServer.executeInFigma(`
      const components = await figma.getLocalComponentsAsync();

      return components.map(comp => ({
        id: comp.id,
        name: comp.name,
        description: comp.description || '',
        width: comp.width,
        height: comp.height
      })).slice(0, 20); // First 20 components
    `);

    console.log('\n📦 Available Components:\n');
    console.log(JSON.stringify(result.result, null, 2));

    // Return component IDs for screenshots
    return result.result;

  } catch (error) {
    console.error('Error:', error.message);
  }
}

getComponents();
