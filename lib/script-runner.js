/**
 * Script Runner
 *
 * Functional wrapper for Figmatic scripts that handles:
 * - Server initialization
 * - Error handling
 * - Console output formatting
 * - Timing coordination
 */

const {
  startServer,
  executeInFigma,
  getAllVariables,
  bindVariable,
  bindVariableToPaint,
  notifyFigma
} = require('../websocket-server/server');

/**
 * Run a Figmatic script with standard initialization and error handling
 *
 * @param {string} name - Display name for the script
 * @param {Function} fn - Async function containing script logic
 * @param {Object} options - Configuration options
 * @param {number} options.delay - Delay before execution (default: 5000ms)
 * @returns {void}
 *
 * @example
 * runScript('Create Component', async (api) => {
 *   const vars = await api.getAllVariables();
 *   // ... your logic
 * });
 */
function runScript(name, fn, options = {}) {
  const { delay = 5000 } = options;

  console.log(`🎯 ${name}\n`);
  startServer();

  setTimeout(async () => {
    console.log(`\n🚀 Starting: ${name}...\n`);

    // Provide API helpers to script function
    const api = {
      executeInFigma,
      getAllVariables,
      bindVariable,
      bindVariableToPaint,
      notifyFigma
    };

    try {
      await fn(api);
      console.log('\n✅ Complete!\n');
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      if (process.env.DEBUG) {
        console.error(error);
      }
    }
  }, delay);

  console.log('⏳ Waiting for Figma plugin...\n');
}

module.exports = {
  runScript
};
