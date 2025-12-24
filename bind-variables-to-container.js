// Bind variables to the Settings List Container
const {
  startServer,
  executeInFigma,
  notifyFigma
} = require('./websocket-server/server');

console.log('🔗 Binding variables to Settings List Container\n');

startServer();

setTimeout(async () => {
  console.log('\n📡 Binding variables...\n');

  try {
    const script = `
      // Find the Settings List Container by searching the current page
      function findNode(node, name) {
        if (node.name === name) return node;
        if ('children' in node) {
          for (const child of node.children) {
            const found = findNode(child, name);
            if (found) return found;
          }
        }
        return null;
      }

      const container = findNode(figma.currentPage, 'Settings List Container');

      if (!container) {
        throw new Error('Settings List Container not found on current page');
      }

      // Get the variables
      const variables = await figma.variables.getLocalVariablesAsync();
      const spacing4 = variables.find(v => v.name === 'Spacing/spacing-4');
      const cardRadius = variables.find(v => v.name === 'Dimensions/Radius/card-radius');

      if (!spacing4) {
        throw new Error('spacing-4 variable not found');
      }
      if (!cardRadius) {
        throw new Error('card-radius variable not found');
      }

      // Bind spacing-4 to all padding properties
      container.setBoundVariable('paddingLeft', spacing4);
      container.setBoundVariable('paddingRight', spacing4);
      container.setBoundVariable('paddingTop', spacing4);
      container.setBoundVariable('paddingBottom', spacing4);

      // Bind card-radius to cornerRadius
      container.setBoundVariable('cornerRadius', cardRadius);

      // Get bound variables to confirm
      const boundVars = container.boundVariables || {};
      const bindings = {};

      for (const [field, binding] of Object.entries(boundVars)) {
        if (binding && binding.id) {
          const variable = figma.variables.getVariableById(binding.id);
          if (variable) {
            bindings[field] = {
              variableName: variable.name,
              variableId: variable.id,
              type: variable.resolvedType
            };
          }
        }
      }

      return {
        success: true,
        containerId: container.id,
        containerName: container.name,
        boundVariables: bindings,
        message: 'Variables bound successfully!'
      };
    `;

    const result = await executeInFigma(script);
    const data = result.result;

    console.log('✅ Variables bound successfully!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 BOUND VARIABLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`   Container: "${data.containerName}"`);
    console.log(`   ID: ${data.containerId}\n`);

    Object.entries(data.boundVariables).forEach(([field, binding]) => {
      console.log(`   ${field}:`);
      console.log(`      → ${binding.variableName}`);
      console.log(`      Type: ${binding.type}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 SUCCESS!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎯 Now the container is linked to variables:');
    console.log('   • Padding: spacing-4 (all sides)');
    console.log('   • Corner Radius: card-radius');
    console.log('   • Changing these variables will update the container!\n');

    await notifyFigma('🔗 Variables bound!', 3000);

    process.exit(0);

  } catch (error) {
    console.error('❌ Binding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}, 10000);

console.log('⏳ Waiting for Figma plugin to connect (10 seconds)...\n');
console.log('📌 Make sure "Settings List Container" is selected in Figma!\n');
