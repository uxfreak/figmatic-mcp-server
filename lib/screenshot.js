/**
 * Screenshot Utilities
 *
 * Functions for taking visual screenshots of Figma components, frames, and nodes.
 * Uses the exportAsync() API to capture node renders for visual analysis.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Creates a screenshot helper with methods for capturing node renders
 * @param {Object} api - The Figma API instance from runScript
 * @returns {Object} Screenshot helper object
 */
function createScreenshotHelper(api) {
  const tmpDir = path.join(os.tmpdir(), 'figmatic-screenshots');

  // Ensure tmp directory exists
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  return {
    /**
     * Take a screenshot of a node by ID
     * @param {string} nodeId - The node ID to screenshot
     * @param {Object} options - Export options
     * @param {number} options.scale - Export scale (1x, 2x, 3x, etc.)
     * @param {string} options.format - Export format ('PNG' | 'JPG' | 'SVG_STRING')
     * @param {string} options.filename - Optional custom filename
     * @returns {Promise<Object>} Screenshot info with path and metadata
     */
    async screenshotById(nodeId, options = {}) {
      const { scale = 2, format = 'PNG', filename } = options;

      const result = await api.executeInFigma(`
        const node = figma.getNodeById('${nodeId}');

        if (!node) {
          throw new Error('Node not found: ${nodeId}');
        }

        // Export node as image
        const bytes = await node.exportAsync({
          format: '${format}',
          ${format === 'PNG' || format === 'JPG' ? `constraint: { type: 'SCALE', value: ${scale} },` : ''}
          contentsOnly: true
        });

        return {
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          width: node.width,
          height: node.height,
          bytes: Array.from(bytes),
          format: '${format}',
          scale: ${scale}
        };
      `);

      const { nodeId: id, nodeName, nodeType, width, height, bytes, format: fmt } = result.result;

      // Generate filename
      const sanitizedName = nodeName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const timestamp = Date.now();
      const ext = fmt === 'SVG_STRING' ? 'svg' : fmt.toLowerCase();
      const finalFilename = filename || `${sanitizedName}-${id.replace(':', '-')}-${timestamp}.${ext}`;
      const filePath = path.join(tmpDir, finalFilename);

      // Write bytes to file
      const buffer = Buffer.from(bytes);
      fs.writeFileSync(filePath, buffer);

      return {
        path: filePath,
        nodeId: id,
        nodeName,
        nodeType,
        width,
        height,
        scale,
        format: fmt,
        size: buffer.length
      };
    },

    /**
     * Take a screenshot of a node by name (finds first match)
     * @param {string} nodeName - The node name to find and screenshot
     * @param {Object} options - Export options (same as screenshotById)
     * @returns {Promise<Object>} Screenshot info with path and metadata
     */
    async screenshotByName(nodeName, options = {}) {
      const result = await api.executeInFigma(`
        const node = figma.currentPage.findOne(n => n.name === '${nodeName}');

        if (!node) {
          throw new Error('Node not found: ${nodeName}');
        }

        return { nodeId: node.id };
      `);

      return this.screenshotById(result.result.nodeId, options);
    },

    /**
     * Take screenshots of multiple nodes by IDs
     * @param {string[]} nodeIds - Array of node IDs to screenshot
     * @param {Object} options - Export options (same as screenshotById)
     * @returns {Promise<Object[]>} Array of screenshot info objects
     */
    async screenshotMultiple(nodeIds, options = {}) {
      const screenshots = [];

      for (const nodeId of nodeIds) {
        try {
          const screenshot = await this.screenshotById(nodeId, options);
          screenshots.push(screenshot);
        } catch (error) {
          console.error(`Failed to screenshot node ${nodeId}:`, error.message);
          screenshots.push({
            nodeId,
            error: error.message
          });
        }
      }

      return screenshots;
    },

    /**
     * Take screenshots of all components matching a pattern
     * @param {string} pattern - Name pattern to match (supports wildcards with *)
     * @param {Object} options - Export options (same as screenshotById)
     * @returns {Promise<Object[]>} Array of screenshot info objects
     */
    async screenshotComponentsByPattern(pattern, options = {}) {
      // Convert pattern to regex (simple * wildcard support)
      const regexPattern = pattern.replace(/\*/g, '.*');

      const result = await api.executeInFigma(`
        const regex = new RegExp('${regexPattern}', 'i');
        const components = figma.currentPage.findAll(n =>
          (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') &&
          regex.test(n.name)
        );

        return {
          nodeIds: components.map(c => c.id),
          nodeNames: components.map(c => c.name)
        };
      `);

      const { nodeIds, nodeNames } = result.result;

      console.log(`Found ${nodeIds.length} components matching pattern "${pattern}"`);
      nodeNames.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));

      return this.screenshotMultiple(nodeIds, options);
    },

    /**
     * Take a screenshot of all variants in a component set
     * @param {string} componentSetId - Component set ID or name
     * @param {Object} options - Export options (same as screenshotById)
     * @returns {Promise<Object[]>} Array of screenshot info objects for each variant
     */
    async screenshotVariants(componentSetId, options = {}) {
      const result = await api.executeInFigma(`
        let componentSet;

        // Try as ID first, then as name
        componentSet = figma.getNodeById('${componentSetId}');
        if (!componentSet) {
          componentSet = figma.currentPage.findOne(n =>
            n.type === 'COMPONENT_SET' && n.name === '${componentSetId}'
          );
        }

        if (!componentSet || componentSet.type !== 'COMPONENT_SET') {
          throw new Error('Component set not found: ${componentSetId}');
        }

        return {
          componentSetId: componentSet.id,
          componentSetName: componentSet.name,
          variantIds: componentSet.children.map(c => c.id),
          variantNames: componentSet.children.map(c => c.name)
        };
      `);

      const { componentSetName, variantIds, variantNames } = result.result;

      console.log(`Taking screenshots of ${variantIds.length} variants in "${componentSetName}"`);
      variantNames.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));

      return this.screenshotMultiple(variantIds, options);
    },

    /**
     * Get the temporary directory where screenshots are saved
     * @returns {string} Path to screenshots directory
     */
    getScreenshotsDir() {
      return tmpDir;
    },

    /**
     * Clear all screenshots from temporary directory
     */
    clearScreenshots() {
      if (fs.existsSync(tmpDir)) {
        const files = fs.readdirSync(tmpDir);
        files.forEach(file => {
          fs.unlinkSync(path.join(tmpDir, file));
        });
        console.log(`Cleared ${files.length} screenshot(s)`);
      }
    }
  };
}

module.exports = {
  createScreenshotHelper
};
