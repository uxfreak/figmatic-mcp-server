const { runScript } = require('../../lib');
const fs = require('fs');

runScript("Component Map with IDs", async (api) => {
  const r = await api.executeInFigma(`
    const nodeId = "146:4867";
    const root = figma.getNodeById(nodeId);
    
    function mapNode(node, depth = 0) {
      const info = {
        name: node.name,
        type: node.type,
        id: node.id,
        depth: depth
      };
      
      if (node.type === "INSTANCE" && node.mainComponent) {
        info.component = node.mainComponent.name;
      }
      
      if (node.type === "TEXT") {
        info.text = (node.characters || "").substring(0, 60);
      }
      
      if (node.children && node.children.length > 0) {
        info.children = node.children.map(c => mapNode(c, depth + 1));
      }
      
      return info;
    }
    
    return mapNode(root);
  `);
  
  function printNode(node, isLast = true, prefix = "") {
    const branch = isLast ? "└─ " : "├─ ";
    const componentInfo = node.component ? ` → ${node.component}` : "";
    const textInfo = node.text ? ` "${node.text}"` : "";
    
    return prefix + branch + node.name + " (" + node.type + componentInfo + textInfo + ") [" + node.id + "]";
  }
  
  function buildTree(node, isLast = true, prefix = "") {
    let output = printNode(node, isLast, prefix) + "\n";
    
    if (node.children) {
      const newPrefix = prefix + (isLast ? "   " : "│  ");
      node.children.forEach((child, i) => {
        output += buildTree(child, i === node.children.length - 1, newPrefix);
      });
    }
    
    return output;
  }
  
  const tree = buildTree(r.result);
  
  const header = "=".repeat(80) + "\n" +
                 "COMPONENT MAP: Help Screen (Payment Methods)\n" +
                 "Node ID: 146:4867\n" +
                 "=".repeat(80) + "\n\n";
  
  const fullOutput = header + tree;
  
  console.log("\n" + fullOutput);
  
  // Save to file
  fs.writeFileSync('/tmp/help-screen-component-map-with-ids.txt', fullOutput);
  console.log("\n✅ Saved to: /tmp/help-screen-component-map-with-ids.txt\n");
});
