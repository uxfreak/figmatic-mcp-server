// Export all Figma variables to a JSON file (with server start)
const fs = require('fs');
const path = require('path');
const { startServer, getAllVariables } = require('./websocket-server/server');

console.log('\n📝 Figma Variables Exporter\n');

startServer();

setTimeout(async () => {
  console.log('\n📡 Fetching variables...\n');

  try {
    console.log('Getting all variables from Figma...');
    const allVars = await getAllVariables();

    console.log(`✓ Retrieved ${allVars.summary.totalVariables} variables from ${allVars.summary.totalCollections} collections\n`);

    // Create output directory
    const outputDir = path.join(process.env.HOME, 'Downloads');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

    // JSON file
    const jsonFilename = `figma-variables-${timestamp}.json`;
    const jsonFilepath = path.join(outputDir, jsonFilename);
    fs.writeFileSync(jsonFilepath, JSON.stringify(allVars, null, 2), 'utf8');

    console.log(`✅ JSON exported!`);
    console.log(`   ${jsonFilepath}`);
    console.log(`   ${(fs.statSync(jsonFilepath).size / 1024).toFixed(2)} KB\n`);

    // Markdown file
    const mdFilename = `figma-variables-${timestamp}.md`;
    const mdFilepath = path.join(outputDir, mdFilename);

    let markdown = `# Figma Variables Export\n\n`;
    markdown += `**Exported:** ${new Date().toLocaleString()}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Total Collections:** ${allVars.summary.totalCollections}\n`;
    markdown += `- **Total Variables:** ${allVars.summary.totalVariables}\n`;
    markdown += `  - Boolean: ${allVars.summary.variablesByType.boolean}\n`;
    markdown += `  - Color: ${allVars.summary.variablesByType.color}\n`;
    markdown += `  - Float: ${allVars.summary.variablesByType.float}\n`;
    markdown += `  - String: ${allVars.summary.variablesByType.string}\n\n`;

    // Collections
    markdown += `## Collections\n\n`;
    allVars.collections.forEach(collection => {
      markdown += `### ${collection.name}\n\n`;
      markdown += `- **Modes:** ${collection.modes.map(m => m.name).join(', ')}\n`;
      markdown += `- **Variables:** ${collection.variableCount}\n\n`;
    });

    // Variables by collection
    allVars.collections.forEach(collection => {
      const collectionVars = allVars.variables.filter(v => v.collectionId === collection.id);
      if (collectionVars.length === 0) return;

      markdown += `## ${collection.name} Variables\n\n`;

      // Group by type
      ['COLOR', 'FLOAT', 'BOOLEAN', 'STRING'].forEach(type => {
        const typeVars = collectionVars.filter(v => v.resolvedType === type);
        if (typeVars.length === 0) return;

        markdown += `### ${type}\n\n`;
        markdown += `| Variable | ${collection.modes.map(m => m.name).join(' | ')} |\n`;
        markdown += `|----------|${collection.modes.map(() => '---').join('|')}|\n`;

        typeVars.forEach(variable => {
          const values = collection.modes.map(mode => {
            const modeValue = variable.modeValues[mode.name];
            if (!modeValue) return 'N/A';

            if (modeValue.type === 'ALIAS') {
              return `→ ${modeValue.aliasTo}`;
            }

            if (type === 'COLOR') {
              const c = modeValue.value;
              return `rgb(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)})`;
            }

            return typeof modeValue.value === 'object'
              ? JSON.stringify(modeValue.value)
              : modeValue.value;
          });

          markdown += `| **${variable.name}** | ${values.join(' | ')} |\n`;
        });

        markdown += `\n`;
      });
    });

    fs.writeFileSync(mdFilepath, markdown, 'utf8');

    console.log(`✅ Markdown exported!`);
    console.log(`   ${mdFilepath}`);
    console.log(`   ${(fs.statSync(mdFilepath).size / 1024).toFixed(2)} KB\n`);

    console.log(`🎉 Export complete! Check ~/Downloads/\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}, 12000);

console.log('⏳ Waiting for Figma plugin to connect (12 seconds)...\n');
