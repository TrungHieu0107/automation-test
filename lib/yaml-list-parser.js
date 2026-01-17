// lib/yaml-list-parser.js
const yaml = require("js-yaml");
const fs = require("fs").promises;
const path = require("path");

class YamlListParser {
  constructor(config) {
    this.yamlTestParser = null;
    this.config = config;

    // Determine test config root
    if (config && config.paths && config.paths.testConfigRoot) {
      this.testConfigRoot = path.isAbsolute(config.paths.testConfigRoot)
        ? config.paths.testConfigRoot
        : path.join(process.cwd(), config.paths.testConfigRoot);
    } else {
      this.testConfigRoot = process.cwd();
    }
  }

  /**
   * Parse a YAML test list file that references other scenario files
   */
  async parseListFile(listFilePath) {
    const YamlTestParser = require("./yaml-test-parser");
    this.yamlTestParser = new YamlTestParser();

    // Resolve list file path
    const fullListPath = this.resolveFilePath(listFilePath);

    const content = await fs.readFile(fullListPath, "utf8");
    const listData = yaml.load(content);

    // Support both formats: test_list and tests
    const testList = listData.test_list || listData.tests;

    if (!testList || !Array.isArray(testList)) {
      throw new Error(
        'YAML list file must contain "test_list" or "tests" array',
      );
    }

    // Parse each test node in the list
    const testNodes = [];
    for (const item of testList) {
      const node = await this.parseListItem(item);
      testNodes.push(node);
    }

    return testNodes;
  }

  /**
   * Parse a single item from the test list
   */
  async parseListItem(item) {
    // Format 1: Simple file path string
    if (typeof item === "string") {
      return await this.loadScenarioFile(item);
    }

    // Format 2: Object with file property
    if (item.file) {
      const node = await this.loadScenarioFile(item.file);

      // Override name if provided
      if (item.name) {
        node.name = item.name;
        node.scenario.name = item.name;
      }

      // Parse children
      if (item.children && Array.isArray(item.children)) {
        node.children = [];
        for (const child of item.children) {
          const childNode = await this.parseListItem(child);
          node.children.push(childNode);
        }
      }

      return node;
    }

    // Format 3: Simple format - file path as key, children as value
    const keys = Object.keys(item);
    if (keys.length === 1) {
      const filePath = keys[0];
      const children = item[filePath];

      const node = await this.loadScenarioFile(filePath);

      if (children && Array.isArray(children)) {
        node.children = [];
        for (const child of children) {
          const childNode = await this.parseListItem(child);
          node.children.push(childNode);
        }
      }

      return node;
    }

    throw new Error(`Invalid test list item format: ${JSON.stringify(item)}`);
  }

  /**
   * Load a scenario file and return as test node
   */
  async loadScenarioFile(relativePath) {
    const fullPath = this.resolveFilePath(relativePath);

    try {
      const content = await fs.readFile(fullPath, "utf8");
      const scenarioData = yaml.load(content);

      // Convert YAML scenario to test format
      const testScenarios =
        this.yamlTestParser.convertToTestScenario(scenarioData);

      // Return as test node structure
      return {
        name: scenarioData.test_name || scenarioData.name || relativePath,
        scenario: testScenarios[0],
        children: [],
      };
    } catch (error) {
      throw new Error(
        `Failed to load scenario file "${relativePath}": ${error.message}`,
      );
    }
  }

  /**
   * Resolve file path based on configuration
   * Supports:
   * 1. Absolute paths
   * 2. Relative paths from testConfigRoot
   * 3. Paths with scenario/list prefixes (e.g., "scenarios/search.yaml")
   */
  resolveFilePath(filePath) {
    // Already absolute
    if (path.isAbsolute(filePath)) {
      return filePath;
    }

    // Try direct path from testConfigRoot
    let fullPath = path.join(this.testConfigRoot, filePath);

    // Check if file exists
    try {
      fs.accessSync(fullPath);
      return fullPath;
    } catch (err) {
      // File doesn't exist, continue trying other paths
    }

    // Try with scenarios subdirectory if configured
    if (this.config?.paths?.scenarios && !filePath.includes(path.sep)) {
      const scenarioPath = path.join(
        this.testConfigRoot,
        this.config.paths.scenarios,
        filePath,
      );
      try {
        fs.accessSync(scenarioPath);
        return scenarioPath;
      } catch (err) {
        // Continue
      }
    }

    // Return original attempt for error reporting
    return fullPath;
  }
}

module.exports = YamlListParser;
