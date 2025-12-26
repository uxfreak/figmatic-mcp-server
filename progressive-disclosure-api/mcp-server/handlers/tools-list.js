/**
 * MCP Tools List Handler
 *
 * Returns the catalog of available tools
 * Called when client requests tools/list
 */

const { getToolCatalog } = require('../tools');

function handleToolsList(req, res) {
  const tools = getToolCatalog();

  res.json({
    jsonrpc: '2.0',
    id: req.body.id,
    result: {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    }
  });
}

module.exports = { handleToolsList };
