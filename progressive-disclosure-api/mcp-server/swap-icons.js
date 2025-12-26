const api = require('./utils/context');

async function swapIcons() {
  const result = await api.executeInFigma(`
    // Get the mail icon components
    const mailOpen = figma.getNodeById("163:5584"); // lucide/mail-open
    const mailClosed = figma.getNodeById("54:1191"); // lucide/mail
    
    // Instance IDs and which icon to use
    const instances = [
      { id: "184:5659", icon: mailOpen },   // Instance 1: mail-open
      { id: "184:5669", icon: mailClosed }, // Instance 2: mail (closed)
      { id: "184:5679", icon: mailOpen },   // Instance 3: mail-open
      { id: "184:5689", icon: mailClosed }, // Instance 4: mail (closed)
      { id: "184:5699", icon: mailOpen }    // Instance 5: mail-open
    ];
    
    const results = [];
    
    for (const item of instances) {
      const instance = figma.getNodeById(item.id);
      
      // Find the Icon Container child
      const iconContainer = instance.children.find(child => child.name === "Icon Container");
      
      if (iconContainer && iconContainer.type === "INSTANCE") {
        // Find the icon instance inside Icon Container
        const iconInstance = iconContainer.children.find(child => child.type === "INSTANCE");
        
        if (iconInstance) {
          iconInstance.swapComponent(item.icon);
          results.push({
            instance: instance.name,
            icon: item.icon.name,
            success: true
          });
        }
      }
    }
    
    return { results, totalSwapped: results.length };
  `);
  
  console.log(JSON.stringify(result, null, 2));
}

swapIcons().catch(console.error);
