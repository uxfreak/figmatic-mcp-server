const FigmaAIAgent = require('./agent');

async function runExamples() {
  const agent = new FigmaAIAgent();

  try {
    console.log('🤖 AI Agent Examples\n');

    // Check connection
    await agent.checkConnection();
    console.log('✓ Connected to Figma\n');

    // Example 1: Get context
    console.log('Example 1: Getting Figma context...');
    const context = await agent.getContext();
    console.log(`  Current page: ${context.currentPage.name}`);
    console.log(`  Selection: ${context.selectionCount} items\n`);

    // Example 2: Create a button
    console.log('Example 2: Creating a button...');
    const button = await agent.createButton('Click Me', { r: 0.1, g: 0.7, b: 0.3 });
    console.log(`  Created button with ID: ${button.id}\n`);

    // Example 3: Create variable collection
    console.log('Example 3: Creating variable collection...');
    const collection = await agent.createVariableCollection('Design Tokens', [
      { name: 'primary-color', type: 'COLOR', value: { r: 0.2, g: 0.4, b: 1.0, a: 1 } },
      { name: 'spacing-base', type: 'FLOAT', value: 16 },
      { name: 'border-radius', type: 'FLOAT', value: 8 }
    ]);
    console.log(`  Created collection: ${collection.collectionName}\n`);

    // Example 4: Execute custom script
    console.log('Example 4: Creating custom layout...');
    const customResult = await agent.execute(`
      // Create a card layout
      const frame = figma.createFrame();
      frame.name = "Card";
      frame.resize(300, 200);
      frame.cornerRadius = 12;
      frame.fills = [{
        type: 'SOLID',
        color: { r: 1, g: 1, b: 1 }
      }];

      figma.currentPage.appendChild(frame);
      return { id: frame.id, name: frame.name };
    `);
    console.log(`  Created frame: ${customResult.result.name}\n`);

    console.log('✅ All examples completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run if executed directly
if (require.main === module) {
  runExamples();
}

module.exports = { runExamples };
