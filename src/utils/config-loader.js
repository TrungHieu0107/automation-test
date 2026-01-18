// src/utils/config-loader.js
const fs = require("fs").promises;
const yaml = require("js-yaml");

/**
 * ConfigLoader handles loading and validating YAML configuration files.
 */
class ConfigLoader {
  /**
   * Loads a YAML configuration file
   * @param {string} configPath - Path to the YAML configuration file
   * @returns {Promise<object>} Parsed configuration object
   * @throws {Error} If file cannot be read or parsed
   */
  static async load(configPath) {
    try {
      const configFile = await fs.readFile(configPath, "utf8");
      const config = yaml.load(configFile);
      return ConfigLoader.applyDefaults(config);
    } catch (error) {
      throw new Error(
        `Failed to load configuration from ${configPath}: ${error.message}`,
      );
    }
  }

  /**
   * Applies default values to configuration
   * @param {object} config - Configuration object
   * @returns {object} Configuration with defaults applied
   */
  static applyDefaults(config) {
    return {
      browser: {
        headless: false,
        baseUrl: null,
        viewport: { width: 1280, height: 720 },
        args: [],
        ...config.browser,
      },
      execution: {
        actionTimeout: 30000,
        navigationTimeout: 30000,
        pageLoadWait: 1000,
        childTestDelay: 500,
        stepDelay: 500,
        stopOnFailure: false,
        stopOnChildFailure: false,
        maxRetries: 3,
        ...config.execution,
      },
      screenshots: {
        enabled: config.screenshots?.enabled ?? true,
        fullPage: config.screenshots?.fullPage ?? true,
        captureBeforeSubmit: config.screenshots?.captureBeforeSubmit ?? true,
        captureAfterSubmit: config.screenshots?.captureAfterSubmit ?? true,
        captureOnFailure: config.screenshots?.captureOnFailure ?? true,
        cleanupBeforeRun: config.screenshots?.cleanupBeforeRun ?? true,
        successPath:
          config.screenshots?.successPath ?? "./results/successes",
        failurePath:
          config.screenshots?.failurePath ?? "./results/failures",
        reportPath: config.screenshots?.reportPath ?? "./results",

        // Dialog screenshots under main screenshots config
        dialogPath: config.screenshots?.dialogPath ?? "./results/dialogs",
        captureDialogs: config.screenshots?.captureDialogs ?? true,
        includeDialogTimestamp:
          config.screenshots?.includeDialogTimestamp ?? true,
        includeDialogTestName:
          config.screenshots?.includeDialogTestName ?? true,
      },
      logging: {
        level: "info",
        logFile: "./test-execution.log",
        ...config.logging,
      },
      paths: config.paths || {},
    };
  }
}

module.exports = ConfigLoader;
