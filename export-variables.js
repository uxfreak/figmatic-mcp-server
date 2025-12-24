// Export all Figma variables to a JSON file
const fs = require('fs');
const path = require('path');
const { getAllVariables, isConnected } = require('./websocket-server/server');

async function exportVariables() {
  console.log('\n📝 Exporting Figma Variables...\n');

  if (!isConnected()) {
    console.log('❌ Not connected. Make sure server is running and plugin is connected.');
    return;
  }

  try {
    console.log('Fetching all variables from Figma...');
    const allVars = await getAllVariables();

    console.log(`✓ Retrieved ${allVars.summary.totalVariables} variables from ${allVars.summary.totalCollections} collections\n`);

    // Create output directory
    const outputDir = path.join(process.env.HOME, 'Downloads');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `figma-variables-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    // Write to file with pretty formatting
    fs.writeFileSync(filepath, JSON.stringify(allVars, null, 2), 'utf8');

    console.log(`✅ Variables exported successfully!`);
    console.log(`📁 File: ${filepath}`);
    console.log(`📊 Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB\n`);

    // Also create a human-readable markdown version
    const mdFilename = `figma-variables-${timestamp}.md`;
    const mdFilepath = path.join(outputDir, mdFilename);

    let markdown = `# Figma Variables Export\n\n`;
    markdown += `**Exported:** ${new Date().toLocaleString()}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Total Collections:** ${allVars.summary.totalCollections}\n`;
    markdown += `- **Total Variables:** ${allVars.summary.totalVariables}\n`;
    markdown += `- **Boolean Variables:** ${allVars.summary.variablesByType.boolean}\n`;
    markdown += `- **Color Variables:** ${allVars.summary.variablesByType.color}\n`;
    markdown += `- **Float Variables:** ${allVars.summary.variablesByType.float}\n`;
    markdown += `- **String Variables:** ${allVars.summary.variablesByType.string}\n\n`;

    // Collections
    markdown += `## Collections\n\n`;
    allVars.collections.forEach(collection => {
      markdown += `### ${collection.name}\n\n`;
      markdown += `- **ID:** \`${collection.id}\`\n`;
      markdown += `- **Modes:** ${collection.modes.map(m => m.name).join(', ')}\n`;
      markdown += `- **Variables:** ${collection.variableCount}\n`;
      markdown += `- **Default Mode:** ${collection.modes.find(m => m.modeId === collection.defaultModeId)?.name || 'N/A'}\n\n`;
    });

    // Variables
    markdown += `## Variables\n\n`;

    // Group by collection
    allVars.collections.forEach(collection => {
      const collectionVars = allVars.variables.filter(v => v.collectionId === collection.id);

      if (collectionVars.length === 0) return;

      markdown += `### ${collection.name}\n\n`;

      // Group by type
      const types = ['COLOR', 'FLOAT', 'BOOLEAN', 'STRING'];
      types.forEach(type => {
        const typeVars = collectionVars.filter(v => v.resolvedType === type);
        if (typeVars.length === 0) return;

        markdown += `#### ${type} Variables\n\n`;

        typeVars.forEach(variable => {
          markdown += `**${variable.name}**\n\n`;

          if (variable.description) {
            markdown += `> ${variable.description}\n\n`;
          }

          markdown += `- **Type:** ${variable.resolvedType}\n`;
          markdown += `- **ID:** \`${variable.id}\`\n`;

          if (variable.scopes && variable.scopes.length > 0) {
            markdown += `- **Scopes:** ${variable.scopes.join(', ')}\n`;
          }

          markdown += `\n**Mode Values:**\n\n`;

          Object.entries(variable.modeValues).forEach(([modeName, modeValue]) => {
            if (modeValue.type === 'ALIAS') {
              markdown += `- **${modeName}:** → \`${modeValue.aliasTo}\` *(alias)*\n`;
            } else {
              let valueStr;
              if (variable.resolvedType === 'COLOR') {
                const c = modeValue.value;
                valueStr = `rgba(${Math.round(c.r*255)}, ${Math.round(c.g*255)}, ${Math.round(c.b*255)}, ${c.a})`;
              } else {
                valueStr = typeof modeValue.value === 'object'
                  ? JSON.stringify(modeValue.value)
                  : modeValue.value;
              }
              markdown += `- **${modeName}:** ${valueStr}\n`;
            }
          });

          markdown += `\n`;
        });

        markdown += `\n`;
      });
    });

    fs.writeFileSync(mdFilepath, markdown, 'utf8');

    console.log(`✅ Markdown version created!`);
    console.log(`📁 File: ${mdFilepath}`);
    console.log(`📊 Size: ${(fs.statSync(mdFilepath).size / 1024).toFixed(2)} KB\n`);

    console.log(`🎉 Export complete!\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

exportVariables();
