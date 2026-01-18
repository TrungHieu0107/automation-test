// src/core/test-engine.js
const ConfigLoader = require("../utils/config-loader");
const Logger = require("../utils/logger");
const DirectoryManager = require("../utils/directory-manager");
const BrowserManager = require("./browser-manager");
const TestExecutor = require("./test-executor");
const ActionHandler = require("../actions/action-handler");
const ReportGenerator = require("../reporting/report-generator");
const {
  YamlValidator,
  ValidationError,
} = require("../validators/yaml-validator");
const fs = require("fs").promises;
const yaml = require("js-yaml");

/**
 * TestEngine is the main orchestrator for test execution.
 * Supports YAML-based test scenarios with hierarchical execution.
 *
 * Usage:
 *   const engine = new TestEngine('./config.yaml');
 *   await engine.initialize();
 *   await engine.runTests('./tests/test-list.yaml');
 *   await engine.cleanup();
 */
class TestEngine {
  /**
   * Creates an instance of TestEngine.
   * @param {string} configPath - Path to the YAML configuration file
   */
  constructor(configPath) {
    this.configPath = configPath;
    this.config = null;
    this.testResults = [];

    // Modules
    this.logger = null;
    this.browserManager = null;
    this.testExecutor = null;
    this.actionHandler = null;
    this.reportGenerator = null;
  }

  /**
   * Initializes the test engine by loading configuration, setting up directories,
   * launching the browser, and initializing all required modules.
   * @returns {Promise<void>}
   */
  async initialize() {
    // Load configuration
    this.config = await ConfigLoader.load(this.configPath);

    // Initialize logger
    this.logger = new Logger(this.config);

    this.logger.log("=================================================");
    this.logger.log("  WEB AUTOMATION TEST ENGINE - INITIALIZATION");
    this.logger.log("=================================================");

    // Setup directories using DirectoryManager static method
    await DirectoryManager.ensureDirectories(
      [
        this.config.screenshots.successPath,
        this.config.screenshots.failurePath,
        this.config.screenshots.dialogPath,
      ],
      this.config.screenshots.cleanupBeforeRun,
      (msg) => this.logger.log(msg),
    );

    // Initialize browser
    this.browserManager = new BrowserManager(this.config, this.logger);
    await this.browserManager.initialize();

    const page = this.browserManager.getPage();

    // TestExecutor creates ActionHandler and screenshot dependencies internally
    this.testExecutor = new TestExecutor(page, this.config, this.logger);
    this.reportGenerator = new ReportGenerator(this.config, this.logger);

    this.logger.logSuccess("Test engine initialized successfully");
    this.logger.log("=================================================\n");
  }

  /**
   * Main entry point for running tests from YAML files.
   * Automatically detects test list vs scenario file format.
   * @param {string} yamlPath - Path to YAML test file (.yaml or .yml)
   * @returns {Promise<void>}
   */
  async runTests(yamlPath) {
    try {
      if (yamlPath.endsWith(".yaml") || yamlPath.endsWith(".yml")) {
        await this.runYamlTests(yamlPath);
      } else {
        throw new Error(
          "Only YAML test files are supported. Please use .yaml or .yml files.",
        );
      }

      await this.reportGenerator.generate(this.testResults);
      this.logger.log("All tests completed");
    } catch (error) {
      this.logger.logError("Test execution failed", error);
      throw error;
    }
  }

  /**
   * Runs tests from YAML configuration - auto-detects list vs scenario file
   * @param {string} yamlPath - Path to YAML file (list or scenario)
   * @returns {Promise<void>}
   */
  async runYamlTests(yamlPath) {
    const content = await fs.readFile(yamlPath, "utf8");
    const yamlData = yaml.load(content);

    // Validate YAML before execution
    const validator = new YamlValidator();
    try {
      // Detect if this is a test list or a scenario file
      const isListFile = yamlData.test_list || yamlData.tests;

      if (isListFile) {
        this.logger.log("Validating test list structure...");
        validator.validateTestList(yamlData);
        this.logger.logSuccess("✓ Test list validation passed");
        await this.runYamlListTests(yamlPath);
      } else {
        this.logger.log("Validating test scenario...");
        validator.validateScenario(yamlData);
        this.logger.logSuccess("✓ Scenario validation passed");
        await this.runYamlScenarioTests(yamlPath);
      }
    } catch (error) {
      if (error.name === "ValidationError") {
        this.logger.logError("❌ YAML Validation Failed", error);
        this.logger.log(
          "\nPlease fix the errors in your YAML file before running tests.",
        );
        if (error.field) {
          this.logger.log(`Field: ${error.field}`);
        }
        throw new Error(`YAML validation failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Runs tests from a YAML test list file
   * @param {string} listFilePath - Path to YAML test list file
   * @returns {Promise<void>}
   */
  async runYamlListTests(listFilePath) {
    const YamlListParser = require("../parsers/yaml-list-parser");

    // Pass config to parser for path resolution
    const parser = new YamlListParser(this.config);

    this.logger.log("Loading YAML test list configuration...");
    this.logger.log(`Test config root: ${parser.testConfigRoot}`);

    const testNodes = await parser.parseListFile(listFilePath);

    this.logger.log(`Found ${testNodes.length} root test(s) in test list`);

    for (const testNode of testNodes) {
      await this.executeYamlTestNode(testNode, 0);
    }
  }

  /**
   * Runs tests from a YAML scenario file (single test or with inline children)
   * @param {string} yamlPath - Path to YAML scenario file
   * @returns {Promise<void>}
   */
  async runYamlScenarioTests(yamlPath) {
    const YamlTestParser = require("../parsers/yaml-test-parser");
    const parser = new YamlTestParser();

    this.logger.log("Loading YAML test scenario...");
    const testNodes = await parser.parseFile(yamlPath);

    this.logger.log(`Found ${testNodes.length} root test(s) in scenario`);

    for (const testNode of testNodes) {
      await this.executeYamlTestNode(testNode, 0);
    }
  }

  /**
   * Executes a YAML test node in the hierarchical test structure.
   * Recursively executes child tests if the parent test passes.
   * @param {object} testNode - Test node object containing name, scenario, and optional child tests
   * @param {number} level - Hierarchy level for indentation and logging
   * @param {boolean} [skipNavigation=false] - Whether to skip navigation for child tests
   * @returns {Promise<boolean>} True if all tests passed, false otherwise
   */
  async executeYamlTestNode(testNode, level, skipNavigation = false) {
    const testName = testNode.name;
    const indent = "  ".repeat(level);

    this.logger.log(`${indent}📋 Executing: ${testName}`);

    let testPassed = false;

    try {
      const result = await this.executeTestCase(
        testNode.scenario,
        level,
        skipNavigation,
      );

      if (result.status !== "passed") {
        testPassed = false;
        this.logger.log(
          `${indent}  ✗ Test node "${testName}" failed - skipping child tests`,
        );
        return false;
      }

      testPassed = true;
      this.logger.log(`${indent}  ✓ Test node "${testName}" passed`);
    } catch (error) {
      // Even if execution throws, ensure a failure record exists
      this.logger.logError(
        `${indent}  Failed to execute test: ${testName}`,
        error,
      );

      // Capture failure screenshot
      const screenshots = [];
      if (this.config.screenshots?.captureOnFailure) {
        try {
          const page = this.browserManager.getPage();
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const filename = `${testName.replace(/\s+/g, "_")}_failure_${timestamp}.png`;
          const fullPath = require("path").join(
            this.config.screenshots.failurePath,
            filename,
          );

          await page.screenshot({
            path: fullPath,
            fullPage: this.config.screenshots.fullPage,
            timeout: this.config.execution.actionTimeout || 30000,
          });

          screenshots.push(fullPath);
          this.logger.log(`${indent}  📸 Screenshot saved: ${fullPath}`);
        } catch (screenshotError) {
          this.logger.log(
            `${indent}  ⚠️  Failed to capture failure screenshot: ${screenshotError.message}`,
          );
        }
      }

      // Find if result was already added by executeTestCase
      const existingResult = this.testResults.find((r) => r.name === testName);
      if (existingResult) {
        // Add screenshots to existing result
        existingResult.screenshots.push(...screenshots);
      } else {
        // Add new failure result if not already added
        this.testResults.push({
          name: testName,
          status: "failed",
          error: error.message,
          screenshots: screenshots,
        });
      }

      return false;
    }

    // Execute child tests
    if (testPassed && testNode.children && testNode.children.length > 0) {
      this.logger.log(
        `${indent}  → Executing ${testNode.children.length} child test(s)...`,
      );

      for (const childTest of testNode.children) {
        const childPassed = await this.executeYamlTestNode(
          childTest,
          level + 1,
          true,
        );

        if (!childPassed && this.config.execution.stopOnChildFailure) {
          this.logger.log(
            `${indent}  ⚠ Child test failed - stopping sibling execution`,
          );
          break;
        }
      }
    }

    return testPassed;
  }

  /**
   * Executes a single test case (programmatic API).
   * Can be used to run tests without loading from files.
   * @param {object} testCase - Test case object with name, steps, submit, assertion
   * @param {number} [hierarchyLevel=0] - Hierarchy level for indentation
   * @param {boolean} [skipNavigation=false] - Whether to skip navigation
   * @returns {Promise<object>} Test result object
   */
  async executeTestCase(testCase, hierarchyLevel = 0, skipNavigation = false) {
    const result = await this.testExecutor.executeTestCase(
      testCase,
      hierarchyLevel,
      skipNavigation,
    );
    this.testResults.push(result);
    return result;
  }

  /**
   * Executes multiple test cases in sequence (programmatic API).
   * @param {Array<object>} testCases - Array of test case objects
   * @returns {Promise<void>}
   */
  async executeTestCases(testCases) {
    this.logger.log(`Executing ${testCases.length} test case(s)...`);

    for (const testCase of testCases) {
      await this.executeTestCase(testCase);
    }

    await this.reportGenerator.generate(this.testResults);
    this.logger.log("All tests completed");
  }

  /**
   * Cleans up browser resources.
   * Should be called after all tests are completed.
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (this.browserManager) {
      await this.browserManager.cleanup();
    }
  }
}

module.exports = TestEngine;
