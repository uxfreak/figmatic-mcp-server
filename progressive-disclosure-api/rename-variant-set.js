const api = require('./mcp-server/utils/context').createAPIContext();

async function renameVariantSet() {
  const result = await api.executeInFigma(`
    const variantSet = figma.getNodeById("192:6111");
    if (variantSet && variantSet.type === "COMPONENT_SET") {
      variantSet.name = "InboxListItem";
      return {
        success: true,
        id: variantSet.id,
        name: variantSet.name,
        type: variantSet.type
      };
    } else {
      return { success: false, message: "ComponentSet not found" };
    }
  `);

  console.log(JSON.stringify(result, null, 2));
}

renameVariantSet().catch(console.error);
