#!/usr/bin/env node
/**
 * Dynamic Tool Counter
 *
 * Automatically counts and categorizes MCP tools from schemas
 * Returns JSON object with counts and categorized tool lists
 */

const { getAllSchemas } = require('../tools/schemas');

function countAndCategorizeTools() {
  const schemas = getAllSchemas();

  // Categorize tools based on their characteristics
  const categories = {
    READ: [],
    WRITE: []
  };

  schemas.forEach(schema => {
    const name = schema.name;
    const desc = schema.description || '';

    // READ tools: get_, find_, validate_, analyze_, or mentions "Layer"
    if (
      name.startsWith('get_') ||
      name.startsWith('find_') ||
      name.startsWith('validate_') ||
      name.startsWith('analyze_') ||
      desc.includes('Layer')
    ) {
      categories.READ.push(schema);
    } else {
      categories.WRITE.push(schema);
    }
  });

  return {
    total: schemas.length,
    read: categories.READ.length,
    write: categories.WRITE.length,
    readTools: categories.READ.map(s => s.name),
    writeTools: categories.WRITE.map(s => s.name),
    categories
  };
}

// Export for use in other scripts
module.exports = { countAndCategorizeTools };

// CLI usage
if (require.main === module) {
  const result = countAndCategorizeTools();
  console.log(`Total Tools: ${result.total}`);
  console.log(`  READ: ${result.read}`);
  console.log(`  WRITE: ${result.write}`);
  console.log('');
  console.log('READ Tools:', result.readTools.join(', '));
  console.log('');
  console.log('WRITE Tools:', result.writeTools.join(', '));
}
