const { executeInFigma, getFigmaContext } = require('../websocket-server/server');

/**
 * AI Agent for Figma operations
 * Provides high-level functions for common operations
 */
class FigmaAIAgent {
  constructor() {
    this.operationHistory = [];
  }

  /**
   * Check if connected to Figma
   */
  async checkConnection() {
    const { executeInFigma } = require('../websocket-server/server');
    // Try a simple operation to verify connection
    try {
      await executeInFigma('return true;');
      return true;
    } catch (error) {
      throw new Error(
        '❌ Not connected to Figma. Please:\n' +
        '   1. Open Figma Desktop App\n' +
        '   2. Open any design file\n' +
        '   3. Run the "AI Agent Bridge" plugin\n' +
        '   4. Ensure WebSocket server is running on port 8080\n\n' +
        `Original error: ${error.message}`
      );
    }
  }

  /**
   * Get current Figma context
   */
  async getContext() {
    const result = await getFigmaContext();
    return result.context;
  }

  /**
   * Execute raw Plugin API script
   * Use this for custom operations not covered by helper methods
   */
  async execute(script) {
    const result = await executeInFigma(script);
    this.operationHistory.push({
      timestamp: new Date(),
      script: script.substring(0, 100),
      success: result.success
    });
    return result;
  }

  /**
   * Create a component
   */
  async createComponent(name, width = 100, height = 100) {
    const script = `
      const component = figma.createComponent();
      component.name = "${name}";
      component.resize(${width}, ${height});
      figma.currentPage.appendChild(component);
      figma.currentPage.selection = [component];
      figma.viewport.scrollAndZoomIntoView([component]);
      return {
        id: component.id,
        name: component.name,
        width: component.width,
        height: component.height
      };
    `;

    const result = await this.execute(script);
    console.log(`✓ Created component: ${name}`);
    return result.result;
  }

  /**
   * Create a button component with text
   */
  async createButton(text, bgColor = { r: 0.2, g: 0.4, b: 1.0 }) {
    const script = `
      // Create button component
      const button = figma.createComponent();
      button.name = "Button / ${text}";
      button.resize(120, 40);
      button.cornerRadius = 8;

      // Set background color
      button.fills = [{
        type: 'SOLID',
        color: ${JSON.stringify(bgColor)}
      }];

      // Add text
      await figma.loadFontAsync({ family: "Inter", style: "Medium" });
      const textNode = figma.createText();
      textNode.characters = "${text}";
      textNode.fontSize = 14;
      textNode.fills = [{
        type: 'SOLID',
        color: { r: 1, g: 1, b: 1 }
      }];

      // Center text
      textNode.x = (button.width - textNode.width) / 2;
      textNode.y = (button.height - textNode.height) / 2;

      button.appendChild(textNode);
      figma.currentPage.appendChild(button);
      figma.currentPage.selection = [button];
      figma.viewport.scrollAndZoomIntoView([button]);

      return {
        id: button.id,
        name: button.name,
        textId: textNode.id
      };
    `;

    const result = await this.execute(script);
    console.log(`✓ Created button: ${text}`);
    return result.result;
  }

  /**
   * Create a variable collection with variables
   */
  async createVariableCollection(collectionName, variables) {
    const variablesScript = variables.map(v => {
      const safeName = v.name.replace(/[^a-zA-Z0-9]/g, '_');
      return `
        const var_${safeName} = figma.variables.createVariable(
          "${v.name}",
          collection,
          "${v.type}"
        );
        var_${safeName}.setValueForMode(modeId, ${JSON.stringify(v.value)});
      `;
    }).join('\n');

    const script = `
      // Create collection
      const collection = figma.variables.createVariableCollection("${collectionName}");
      const modeId = collection.modes[0].modeId;

      // Create variables
      ${variablesScript}

      return {
        collectionId: collection.id,
        collectionName: collection.name,
        variableCount: ${variables.length}
      };
    `;

    const result = await this.execute(script);
    console.log(`✓ Created collection: ${collectionName} with ${variables.length} variables`);
    return result.result;
  }

  /**
   * Get all selected nodes
   */
  async getSelection() {
    const context = await this.getContext();
    return context.selection;
  }

  /**
   * Log operation history
   */
  getHistory() {
    return this.operationHistory;
  }
}

module.exports = FigmaAIAgent;
