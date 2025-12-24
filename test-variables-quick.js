// Quick variables test - assumes server is running
const { getAllVariables, isConnected } = require('./websocket-server/server');

async function test() {
  console.log('\n🧪 Quick Variables Test\n');

  if (!isConnected()) {
    console.log('❌ Not connected. Make sure server is running and plugin is connected.');
    return;
  }

  try {
    console.log('Getting all variables...\n');
    const allVars = await getAllVariables();

    console.log('✓ Variables extracted!\n');
    console.log('📊 Summary:');
    console.log(`   Collections: ${allVars.summary.totalCollections}`);
    console.log(`   Variables: ${allVars.summary.totalVariables}`);
    console.log(`   - Boolean: ${allVars.summary.variablesByType.boolean}`);
    console.log(`   - Color: ${allVars.summary.variablesByType.color}`);
    console.log(`   - Float: ${allVars.summary.variablesByType.float}`);
    console.log(`   - String: ${allVars.summary.variablesByType.string}\n`);

    if (allVars.collections.length > 0) {
      console.log('📁 Collections:');
      allVars.collections.forEach(c => {
        console.log(`   - ${c.name} (${c.modes.length} modes, ${c.variableCount} variables)`);
      });
      console.log('');
    }

    if (allVars.variables.length > 0) {
      console.log('🎨 Sample Variables (first 3):');
      allVars.variables.slice(0, 3).forEach(v => {
        console.log(`\n   ${v.name} (${v.resolvedType})`);
        console.log(`   Collection: ${v.collectionName}`);
        Object.entries(v.modeValues).forEach(([mode, val]) => {
          if (val.type === 'ALIAS') {
            console.log(`     ${mode}: -> ${val.aliasTo}`);
          } else {
            const valStr = typeof val.value === 'object'
              ? JSON.stringify(val.value)
              : val.value;
            console.log(`     ${mode}: ${valStr}`);
          }
        });
      });
    }

    console.log('\n✅ Variables API working!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
