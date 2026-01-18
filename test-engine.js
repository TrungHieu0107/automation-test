// test-engine.js - CLI wrapper for backward compatibility
// This file maintains backward compatibility with existing npm scripts
const TestEngine = require("./src/core/test-engine");

/**
 * Main execution function for command-line usage.
 * Parses command-line arguments for config and test scenario paths,
 * initializes the test engine, runs tests, and handles cleanup.
 * @returns {Promise<void>}
 */
async function main() {
  const configPath = process.argv[2] || "./config.yaml";
  const testScenarioPath = process.argv[3] || "./test-scenarios.yaml";

  const engine = new TestEngine(configPath);

  try {
    await engine.initialize();
    await engine.runTests(testScenarioPath);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    await engine.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = TestEngine;
