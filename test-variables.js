// Test Variables API
const { startServer, getAllVariables, getVariablesByType, isConnected } = require('./websocket-server/server');

console.log('🧪 Testing Variables API\n');

startServer();

setTimeout(async () => {
  console.log('\n📡 Testing variable extraction...\n');

  if (!isConnected()) {
    console.log('❌ Plugin not connected');
    return;
  }

  try {
    // Test 1: Get all variables
    console.log('1. Getting all variables with modes and values...');
    const allVars = await getAllVariables();

    console.log('\n✓ Variables extracted successfully!\n');

    // Display summary
    console.log('📊 Summary:');
    console.log(`   Total Collections: ${allVars.summary.totalCollections}`);
    console.log(`   Total Variables: ${allVars.summary.totalVariables}`);
    console.log(`   - Boolean: ${allVars.summary.variablesByType.boolean}`);
    console.log(`   - Color: ${allVars.summary.variablesByType.color}`);
    console.log(`   - Float: ${allVars.summary.variablesByType.float}`);
    console.log(`   - String: ${allVars.summary.variablesByType.string}`);
    console.log('');

    // Display collections
    if (allVars.collections.length > 0) {
      console.log('📁 Collections:');
      allVars.collections.forEach(collection => {
        console.log(`   - ${collection.name}`);
        console.log(`     Modes: ${collection.modes.map(m => m.name).join(', ')}`);
        console.log(`     Variables: ${collection.variableCount}`);
      });
      console.log('');
    }

    // Display first few variables with details
    if (allVars.variables.length > 0) {
      console.log('🎨 Variables (first 5):');
      allVars.variables.slice(0, 5).forEach(variable => {
        console.log(`   - ${variable.name} (${variable.resolvedType})`);
        console.log(`     Collection: ${variable.collectionName}`);
        console.log(`     Values:`);

        Object.entries(variable.modeValues).forEach(([modeName, modeValue]) => {
          if (modeValue.type === 'ALIAS') {
            console.log(`       ${modeName}: -> ${modeValue.aliasTo} (alias)`);
          } else {
            const valueStr = typeof modeValue.value === 'object'
              ? JSON.stringify(modeValue.value)
              : modeValue.value;
            console.log(`       ${modeName}: ${valueStr}`);
          }
        });
        console.log('');
      });
    }

    // Test 2: Get color variables only
    if (allVars.summary.variablesByType.color > 0) {
      console.log('\n2. Getting COLOR variables only...');
      const colorVars = await getVariablesByType('COLOR');
      console.log(`✓ Found ${colorVars.length} color variables\n`);
    }

    console.log('✅ ALL VARIABLE TESTS PASSED!\n');

    // Output full data for inspection
    console.log('💾 Full data structure:');
    console.log(JSON.stringify(allVars, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}, 8000);

console.log('⏳ Waiting for Figma plugin to connect (8 seconds)...\n');
