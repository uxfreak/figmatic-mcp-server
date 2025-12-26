const api = require('./mcp-server/utils/context');

async function createVariants() {
  const result = await api.executeInFigma(`
    const originalComponent = figma.getNodeById("184:5648");
    if (!originalComponent || originalComponent.type !== "COMPONENT") {
      throw new Error("Original component not found");
    }

    // Load fonts needed for variants
    await figma.loadFontAsync({ family: "DM Sans", style: "Semibold" });
    await figma.loadFontAsync({ family: "DM Sans", style: "Regular" });

    // Duplicate component for Unread variant
    const unreadVariant = originalComponent.clone();
    unreadVariant.name = "State=Unread";
    unreadVariant.x = originalComponent.x + 400;

    // Duplicate component for Read variant
    const readVariant = originalComponent.clone();
    readVariant.name = "State=Read";
    readVariant.x = originalComponent.x + 800;

    // Modify Read variant
    // 1. Find Icon Container and set opacity to 0.5
    const readIconContainer = readVariant.children.find(child => child.name === "Icon Container");
    if (readIconContainer) {
      readIconContainer.opacity = 0.5;

      // 2. Swap icon to MailOpen (163:5584)
      const mailOpenIcon = figma.getNodeById("163:5584");
      const iconInstance = readIconContainer.children.find(child => child.type === "INSTANCE");
      if (iconInstance && mailOpenIcon) {
        iconInstance.swapComponent(mailOpenIcon);
      }
    }

    // 3. Find Title text node and change to Regular font + text-secondary
    const readTextContainer = readVariant.children.find(child => child.name === "Text Container");
    if (readTextContainer) {
      const titleText = readTextContainer.children.find(child => child.name === "Title");
      if (titleText && titleText.type === "TEXT") {
        // Load and apply Regular font
        titleText.fontName = { family: "DM Sans", style: "Regular" };

        // Find and bind text-secondary variable
        const textSecondaryVar = figma.variables.getLocalVariables().find(v => v.name === "Text/text-secondary");
        if (textSecondaryVar && titleText.fills && titleText.fills.length > 0) {
          const boundPaint = figma.variables.setBoundVariableForPaint(titleText.fills[0], "color", textSecondaryVar);
          titleText.fills = [boundPaint];
        }
      }
    }

    // Combine as variants
    const variantSet = figma.combineAsVariants([unreadVariant, readVariant], originalComponent.parent);
    variantSet.name = "InboxListItem";
    variantSet.x = originalComponent.x;
    variantSet.y = originalComponent.y;

    // Remove original component
    originalComponent.remove();

    return {
      variantSetId: variantSet.id,
      unreadVariantId: unreadVariant.id,
      readVariantId: readVariant.id,
      variantSetName: variantSet.name
    };
  `);

  console.log(JSON.stringify(result, null, 2));
}

createVariants().catch(console.error);
