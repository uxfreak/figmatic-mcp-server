// Main thread - runs in Figma's sandbox with Plugin API access
// Official API Reference: https://developers.figma.com/docs/plugins/api/figma/

console.log('AI Agent Bridge plugin started');

// Show UI iframe
figma.showUI(__html__, {
  width: 400,
  height: 300,
  themeColors: true,
  title: 'AI Agent Bridge'
});

// Track execution state to prevent concurrent execution
let isExecuting = false;

// Listen for messages from UI iframe
figma.ui.onmessage = async (msg: any) => {
  console.log('Main thread received message:', msg.type);

  // ========================================
  // EXECUTE PLUGIN API SCRIPT
  // ========================================
  if (msg.type === 'execute-script') {
    // Prevent concurrent execution
    if (isExecuting) {
      figma.ui.postMessage({
        type: 'execution-result',
        success: false,
        error: 'Another script is currently executing. Please wait.',
        requestId: msg.requestId
      });
      return;
    }

    isExecuting = true;

    try {
      console.log('Executing script:', msg.script.substring(0, 100) + '...');

      // Try using direct eval wrapped in async function
      // Figma's eval works differently than standard eval but might be available
      console.log('Attempting eval-based execution...');

      const wrappedScript = `(async function() { ${msg.script} })()`;
      const result = await eval(wrappedScript);

      console.log('Script executed successfully, result:', result);

      // Send success response back through UI iframe
      figma.ui.postMessage({
        type: 'execution-result',
        success: true,
        result: result,
        requestId: msg.requestId
      });
    } catch (error: any) {
      console.error('Script execution error:', error);

      // Send detailed error response
      figma.ui.postMessage({
        type: 'execution-result',
        success: false,
        error: error.message,
        stack: error.stack,
        requestId: msg.requestId
      });
    } finally {
      isExecuting = false;
    }
  }

  // ========================================
  // GET FIGMA CONTEXT
  // ========================================
  if (msg.type === 'get-context') {
    try {
      console.log('Gathering Figma context...');

      // Collect current selection with safe property access
      const selection = figma.currentPage.selection.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
        // Conditionally include geometric properties if they exist
        ...(('width' in node) && { width: (node as any).width }),
        ...(('height' in node) && { height: (node as any).height }),
        ...(('x' in node) && { x: (node as any).x }),
        ...(('y' in node) && { y: (node as any).y })
      }));

      // Get all local variables (async)
      const variables = await figma.variables.getLocalVariablesAsync();
      const variableData = variables.map(v => ({
        id: v.id,
        name: v.name,
        type: v.resolvedType,
        description: v.description
      }));

      // Get all variable collections
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const collectionData = collections.map(c => ({
        id: c.id,
        name: c.name,
        modes: c.modes
      }));

      // Build comprehensive context object
      const context = {
        document: {
          name: figma.root.name
        },
        currentPage: {
          id: figma.currentPage.id,
          name: figma.currentPage.name,
          childrenCount: figma.currentPage.children.length
        },
        selection: selection,
        selectionCount: selection.length,
        variables: variableData,
        variableCollections: collectionData,
        viewport: {
          center: figma.viewport.center,
          zoom: figma.viewport.zoom
        }
      };

      console.log('Context gathered successfully');

      // Send context back through UI iframe
      figma.ui.postMessage({
        type: 'context-response',
        context: context,
        requestId: msg.requestId
      });
    } catch (error: any) {
      console.error('Error getting context:', error);

      figma.ui.postMessage({
        type: 'context-response',
        error: error.message,
        requestId: msg.requestId
      });
    }
  }

  // ========================================
  // SHOW NOTIFICATION
  // ========================================
  if (msg.type === 'notify') {
    figma.notify(msg.message, {
      timeout: msg.timeout || 3000,
      error: msg.error || false
    });
  }

  // ========================================
  // CLOSE PLUGIN
  // ========================================
  if (msg.type === 'close') {
    figma.closePlugin(msg.message);
  }
};

console.log('✓ Plugin ready and listening for commands from AI agent');
