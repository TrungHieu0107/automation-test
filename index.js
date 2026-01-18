// index.js - Main entry point for the test automation engine
module.exports = {
  TestEngine: require("./src/core/test-engine"),
  Logger: require("./src/utils/logger"),
  ConfigLoader: require("./src/utils/config-loader"),
};
