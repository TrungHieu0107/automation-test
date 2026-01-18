// src/core/test-executor.js
const path = require("path");

/**
 * TestExecutor handles the execution of individual test cases,
 * including navigation, step execution, and screenshot capture.
 */
class TestExecutor {
  constructor(page, config, logger, actionHandler = null) {
    this.page = page;
    this.config = config;
    this.logger = logger;
    
    // Create dependencies if not provided (Dependency Injection)
    if (actionHandler) {
      this.actionHandler = actionHandler;
    } else {
      // Create screenshot dependencies following SOLID principles
      const ScreenshotManager = require('../screenshots/screenshot-manager');
      const DialogScreenshotHandler = require('../screenshots/dialog-screenshot-handler');
      
      const screenshotManager = new ScreenshotManager(config, logger);
      const dialogScreenshotHandler = new DialogScreenshotHandler(config, logger, screenshotManager);
      
      // Create ActionHandler with injected dependencies (SOLID-compliant version)
      const ActionHandler = require('../actions/action-handler');
      this.actionHandler = new ActionHandler(page, config, logger, dialogScreenshotHandler);
    }
  }

  /**
   * Executes a single test case
   * @param {object} testCase - Test case object
   * @param {number} hierarchyLevel - Indentation level for logging
   * @param {boolean} skipNavigation - Whether to skip navigation
   * @returns {Promise<object>} Test result object
   */
  async executeTestCase(testCase, hierarchyLevel = 0, skipNavigation = false) {
    const testName = testCase.name || 'Unnamed Test';
    const indent = "  ".repeat(hierarchyLevel);
    
    // Set test context for action handler (used in dialog screenshots)
    this.actionHandler.setTestContext(testName);

    this.logger.log(`\n${indent}========================================`);
    this.logger.log(`${indent}Executing test: ${testName}`);
    this.logger.log(`${indent}========================================`);

    const testResult = {
      name: testName,
      status: "pending",
      steps: [],
      error: null,
      screenshots: [],
      hierarchyLevel: hierarchyLevel,
      skippedNavigation: skipNavigation,
    };

    try {
      // Navigate or continue on same page
      if (!skipNavigation) {
        await this.navigateToTestUrl(testCase, indent);
      } else {
        await this.prepareChildTest(indent);
      }

      // Execute steps
      await this.executeSteps(testCase.steps, testResult, indent);

      // Screenshot before submit
      if (this.config.screenshots.captureBeforeSubmit) {
        testResult.screenshots.push(
          await this.captureScreenshot(testName, "before-submit")
        );
      }

      // Submit
      this.logger.log(`${indent}Executing submit action...`);
      await this.actionHandler.executeSubmit(testCase.submit, indent);

      if (testCase.submit.postSubmitWait) {
        this.logger.log(
          `${indent}Waiting ${testCase.submit.postSubmitWait}ms after submit...`
        );
        await this.wait(testCase.submit.postSubmitWait);
      }

      // Screenshot after submit
      if (this.config.screenshots.captureAfterSubmit) {
        testResult.screenshots.push(
          await this.captureScreenshot(testName, "after-submit")
        );
      }

      // Assertion - support both single and multiple
      if (testCase.assertions && Array.isArray(testCase.assertions)) {
        this.logger.log(
          `${indent}Executing ${testCase.assertions.length} assertions...`
        );
        await this.actionHandler.executeAssertions(testCase.assertions, indent);
      } else if (testCase.assertion) {
        this.logger.log(`${indent}Executing assertion...`);
        await this.actionHandler.executeAssertion(testCase.assertion, indent);
      } else {
        this.logger.log(`${indent}⚠ No assertions defined for this test`);
      }

      testResult.status = "passed";
      this.logger.logSuccess(`${indent}Test "${testName}" PASSED`);
    } catch (error) {
      testResult.status = "failed";
      testResult.error = error.message;
      this.logger.logFailure(
        `${indent}Test "${testName}" FAILED: ${error.message}`
      );

      if (this.config.screenshots.captureOnFailure) {
        testResult.screenshots.push(
          await this.captureScreenshot(testName, "failure", true)
        );
      }

      if (this.config.execution.stopOnFailure) {
        throw error;
      }
    }

    // Collect dialog screenshots for this test
    if (this.config.screenshots?.captureDialogs) {
      await this.collectDialogScreenshots(testResult, testName);
    }

    return testResult;
  }

  /**
   * Collects dialog screenshots from the dialogs directory for the current test.
   * @param {object} testResult - Test result object to add screenshots to
   * @param {string} testName - Name of the test
   */
  async collectDialogScreenshots(testResult, testName) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const dialogsDir = this.config.screenshots.dialogPath;
      const files = await fs.readdir(dialogsDir);
      
      // Filter files that match this test name (sanitized)
      const safeName = testName.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
      const matchingFiles = files.filter(file => 
        file.startsWith(safeName) && file.endsWith('.png')
      );
      
      // Add full paths to test results
      for (const file of matchingFiles) {
        const fullPath = path.join(dialogsDir, file);
        testResult.screenshots.push(fullPath);
      }
      
      if (matchingFiles.length > 0) {
        this.logger.log(`  📸 Collected ${matchingFiles.length} dialog screenshot(s)`);
      }
    } catch (error) {
      // Directory doesn't exist or other error - just skip
    }
  }

  /**
   * Navigates to the test URL
   * @param {object} testCase - Test case object
   * @param {string} indent - Indentation for logging
   * @returns {Promise<void>}
   */
  async navigateToTestUrl(testCase, indent) {
    const targetUrl = testCase.url || this.config.browser.baseUrl;
    if (targetUrl) {
      this.logger.log(`${indent}Navigating to: ${targetUrl}`);
      await this.page.goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: this.config.execution.navigationTimeout || 30000,
      });
      this.logger.log(`${indent}  → Page loaded successfully`);

      if (this.config.execution.pageLoadWait) {
        await this.wait(this.config.execution.pageLoadWait);
      }
    }
  }

  /**
   * Prepares for a child test execution
   * @param {string} indent - Indentation for logging
   * @returns {Promise<void>}
   */
  async prepareChildTest(indent) {
    this.logger.log(
      `${indent}Continuing on current page (child test - no navigation)`
    );

    if (this.config.execution.childTestDelay) {
      this.logger.log(
        `${indent}  → Waiting ${this.config.execution.childTestDelay}ms before child test...`
      );
      await this.wait(this.config.execution.childTestDelay);
    }
  }

  /**
   * Executes test steps
   * @param {Array<object>} steps - Array of test steps
   * @param {object} testResult - Test result object
   * @param {string} indent - Indentation for logging
   * @returns {Promise<void>}
   */
  async executeSteps(steps, testResult, indent) {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const nextStep = i + 1 < steps.length ? steps[i + 1] : null;

      // Check if this is a click followed by a dialog
      if (step.type === "click" && nextStep && nextStep.type === "dialog") {
        this.logger.log(
          `${indent}Step ${i + 1}/${steps.length}: ${step.type} - ${step.selector.by}="${step.selector.value}" (will trigger dialog)`
        );

        await this.actionHandler.executeStepWithDialog(step, nextStep, indent);
        testResult.steps.push({ step: i + 1, status: "passed" });
        testResult.steps.push({ step: i + 2, status: "passed" });

        i++; // Skip the next step since we already handled it
      } else {
        this.logger.log(
          `${indent}Step ${i + 1}/${steps.length}: ${step.type}${step.selector ? ` - ${step.selector.by}="${step.selector.value}"` : ""}`
        );

        await this.actionHandler.executeStep(step, indent);
        testResult.steps.push({ step: i + 1, status: "passed" });
      }

      if (this.config.execution.stepDelay) {
        await this.wait(this.config.execution.stepDelay);
      }
    }
  }

  /**
   * Captures a screenshot
   * @param {string} testName - Test name
   * @param {string} stage - Screenshot stage
   * @param {boolean} isFailure - Whether this is a failure screenshot
   * @returns {Promise<string>} Screenshot path
   */
  async captureScreenshot(testName, stage, isFailure = false) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${testName.replace(/\s+/g, "_")}_${stage}_${timestamp}.png`;

    const screenshotDir = isFailure
      ? this.config.screenshots.failurePath
      : this.config.screenshots.successPath;

    const fullPath = path.join(screenshotDir, filename);

    await this.page.screenshot({
      path: fullPath,
      fullPage: this.config.screenshots.fullPage || false,
    });

    this.logger.log(`  📸 Screenshot saved: ${fullPath}`);
    return fullPath;
  }

  /**
   * Waits for a specified duration
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  async wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = TestExecutor;
