// src/actions/action-handler-refactored.js

/**
 * ActionHandler (Refactored) - Coordinates action execution using SOLID principles.
 *
 * SOLID Principles Applied:
 * - SRP: Only coordinates, doesn't implement actions
 * - OCP: Extensible via registry without modification
 * - DIP: Depends on abstractions (ElementLocator, ExecutorRegistry, DialogOrchestrator)
 *
 * Reduced from 864 lines to ~200 lines through delegation.
 */

const ElementLocator = require("../infrastructure/element-locator");
const ExecutorRegistry = require("./executors/executor-registry");
const InputActionExecutor = require("./executors/input-action-executor");
const ClickActionExecutor = require("./executors/click-action-executor");
const CheckboxActionExecutor = require("./executors/checkbox-action-executor");
const RadioActionExecutor = require("./executors/radio-action-executor");
const SelectActionExecutor = require("./executors/select-action-executor");
const DialogOrchestrator = require("./orchestrators/dialog-orchestrator");

class ActionHandler {
  /**
   * @param {object} page - Playwright Page object
   * @param {object} config - Configuration
   * @param {object} logger - Logger
   * @param {DialogScreenshotHandler} dialogScreenshotHandler - Screenshot handler (DIP)
   */
  constructor(page, config, logger, dialogScreenshotHandler = null) {
    this.page = page;
    this.config = config;
    this.logger = logger;
    this.dialogScreenshotHandler = dialogScreenshotHandler;
    this.currentTestName = null;

    // Infrastructure dependencies
    this.elementLocator = new ElementLocator(page, logger);
    this.dialogOrchestrator = new DialogOrchestrator(
      page,
      config,
      logger,
      dialogScreenshotHandler,
    );

    // Initialize executor registry (Strategy Pattern)
    this.executorRegistry = new ExecutorRegistry();
    this._registerExecutors();
  }

  /**
   * Register action executors (Strategy Pattern).
   * Private method - called during construction.
   * @private
   */
  _registerExecutors() {
    this.executorRegistry.register(
      "input",
      new InputActionExecutor(this.config, this.logger),
    );
    this.executorRegistry.register(
      "click",
      new ClickActionExecutor(this.config, this.logger, this.page),
    );
    this.executorRegistry.register(
      "check",
      new CheckboxActionExecutor(this.config, this.logger, this.page),
    );
    this.executorRegistry.register(
      "checkbox",
      new CheckboxActionExecutor(this.config, this.logger, this.page),
    );
    this.executorRegistry.register(
      "radio",
      new RadioActionExecutor(this.config, this.logger),
    );
    this.executorRegistry.register(
      "select",
      new SelectActionExecutor(this.config, this.logger),
    );
  }

  /**
   * Set current test context for screenshots.
   * @param {string} testName - Test name
   */
  setTestContext(testName) {
    this.currentTestName = testName;
  }

  /**
   * Capture dialog screenshot (delegates to handler).
   * @param {object} dialog - Dialog object
   * @param {string} stepInfo - Step info
   * @returns {Promise<string|null>} Screenshot path
   */
  async captureDialogScreenshot(dialog, stepInfo = "") {
    if (!this.dialogScreenshotHandler) {
      return null;
    }
    return await this.dialogScreenshotHandler.captureForDialog(
      dialog,
      this.page,
      this.currentTestName,
      stepInfo,
    );
  }

  /**
   * Execute a test step (orchestration only).
   * Delegates to appropriate executor via registry.
   *
   * @param {object} step - Step configuration
   * @param {string} indent - Logging indent
   * @returns {Promise<void>}
   */
  async executeStep(step, indent = "") {
    // Special case: dialog-only steps
    if (step.type === "dialog") {
      await this.handleDialog(step, indent);
      return;
    }

    // Find element (infrastructure)
    const element = await this.elementLocator.findElement(step.selector);

    // Get executor from registry (eliminates switch statement)
    const executor = this.executorRegistry.get(step.type);

    // Execute action (delegation)
    await executor.execute(element, step, indent);
  }

  /**
   * Execute step with dialog handling.
   * Orchestrates: trigger action → handle dialog → navigate.
   *
   * @param {object} clickStep - Click configuration
   * @param {object} dialogStep - Dialog configuration
   * @param {string} indent - Logging indent
   * @returns {Promise<void>}
   */
  async executeStepWithDialog(clickStep, dialogStep, indent = "") {
    const element = await this.elementLocator.findElement(clickStep.selector);

    // Define trigger action
    const triggerAction = async () => {
      await element.click({ timeout: this.config.execution.actionTimeout });
      this.logger.log(`${indent}  👆 Clicked`);
    };

    // Delegate to orchestrator
    await this.dialogOrchestrator.executeWithDialog(
      triggerAction,
      dialogStep,
      this.currentTestName || "click-dialog",
      indent,
    );
  }

  /**
   * Handle dialog-only step (no trigger action).
   * @param {object} step - Dialog step configuration
   * @param {string} indent - Logging indent
   * @returns {Promise<void>}
   */
  async handleDialog(step, indent = "") {
    const dialogPromise = this.page.waitForEvent("dialog", {
      timeout: this.config.execution.actionTimeout,
    });

    const dialog = await dialogPromise;

    await this.captureDialogScreenshot(dialog, "standalone-dialog");

    const action = step.action || "accept";
    if (action === "accept") {
      await dialog.accept(step.value || "");
    } else {
      await dialog.dismiss();
    }

    this.logger.log(
      `${indent}  ${action === "accept" ? "✓" : "✗"} Dialog ${action}ed`,
    );
  }

  /**
   * Execute submit action with potential dialogs.
   *
   * @param {object} submitAction - Submit configuration
   * @param {string} indent - Logging indent
   * @returns {Promise<Array<string>>} Screenshot paths
   */
  async executeSubmit(submitConfig, testResult, indent) {
    this.logger.log(`${indent}Executing submit steps...`);

    for (let i = 0; i < submitConfig.steps.length; i++) {
      const step = submitConfig.steps[i];
      const stepName = step.name || `Submit Step ${i + 1}`;

      this.logger.log(
        `${indent}  ${i + 1}/${submitConfig.steps.length}: ${stepName}`,
      );

      // Execute step
      await this.executeSubmitStep(step, indent);

      // Capture screenshot if requested
      if (step.capture) {
        const screenshotPath = await this.captureScreenshot(
          testResult.name,
          `submit-step-${i + 1}-${this.sanitizeName(stepName)}`,
        );

        testResult.screenshots.push({
          step: stepName,
          path: screenshotPath,
          timestamp: new Date().toISOString(),
        });
      }

      // Wait if specified
      if (step.wait_after) {
        await this.wait(this.parseTime(step.wait_after));
      }
    }
  }

  async executeSubmitStep(step, indent) {
    switch (step.action) {
      case "click":
        const element = await this.actionHandler.findElement(step.selector);
        await element.click({ timeout: this.config.execution.actionTimeout });
        break;

      case "dialog":
        await this.actionHandler.handleDialog(
          {
            type: "dialog",
            dialogType: step.dialogType,
            action: step.dialogAction,
          },
          indent,
        );
        break;

      case "input":
        await this.actionHandler.executeStep(
          {
            type: "input",
            selector: step.selector,
            value: step.value,
          },
          indent,
        );
        break;

      default:
        throw new Error(`Unknown submit step action: ${step.action}`);
    }
  }

  /**
   * Capture a screenshot (delegates to appropriate handler/strategy).
   * @param {string} suffix - Filename suffix
   * @returns {Promise<string|null>} Screenshot path
   */
  async captureScreenshot(suffix) {
    if (!this.config.screenshots?.enabled) {
      return null;
    }

    const fs = require("fs").promises;
    const path = require("path");

    try {
      const outputPath = this.config.screenshots.successPath;
      await fs.mkdir(outputPath, { recursive: true });

      const testName = this.currentTestName || "unknown-test";
      const safeName = testName.replace(/[^a-zA-Z0-9-_]/g, "_");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${safeName}_${suffix}_${timestamp}.png`;
      const fullPath = path.join(outputPath, filename);

      await this.page.screenshot({
        path: fullPath,
        fullPage: this.config.screenshots.fullPage,
        timeout: 5000,
      });

      this.logger.log(`  📸 Screenshot saved: ${path.basename(fullPath)}`);
      return fullPath;
    } catch (error) {
      this.logger.log(`  ⚠️  Failed to capture screenshot: ${error.message}`);
      return null;
    }
  }

  /**
   * Execute assertion (kept for compatibility - could be extracted to AssertionHandler later).
   * @param {object} assertion - Assertion config
   * @param {string} indent - Logging indent
   * @returns {Promise<void>}
   */
  async executeAssertion(assertion, indent = "") {
    const element = await this.elementLocator.findElement(assertion.selector);
    let actualValue = "";
    let expectedValue = "";
    let assertionDescription = "";

    switch (assertion.type) {
      case "input":
        actualValue = await element.inputValue();
        expectedValue = assertion.expectedText || assertion.expectedValue;
        assertionDescription = "input value";
        break;

      case "text":
        actualValue = await element.textContent();
        expectedValue = assertion.expectedText;
        assertionDescription = "text content";
        break;

      case "visible":
        const isVisible = await element.isVisible();
        expectedValue = assertion.expectedValue ?? true;
        actualValue = isVisible;
        assertionDescription = "visibility";

        if (isVisible !== expectedValue) {
          throw new Error(
            `Element visibility mismatch: expected ${expectedValue} but got ${actualValue}`,
          );
        }
        this.logger.log(`${indent}  ✓ Element visibility: ${actualValue}`);
        return;

      default:
        throw new Error(`Unknown assertion type: ${assertion.type}`);
    }

    if (actualValue !== expectedValue) {
      throw new Error(
        `Assertion failed for ${assertionDescription}: expected="${expectedValue}", actual="${actualValue}"`,
      );
    }

    this.logger.log(
      `${indent}  ✓ ${assertionDescription}: expected="${expectedValue}", actual="${actualValue}"`,
    );
  }

  /**
   * Execute V2 step (for new action factory integration).
   * @param {object} step - Step config
   * @param {string} indent - Logging indent
   * @returns {Promise<void>}
   */
  async executeStepV2(step, indent = "") {
    // Placeholder for future factory integration
    return await this.executeStep(step, indent);
  }

  // Legacy compatibility shims (to be removed after migration)
  async findElement(selector) {
    return await this.elementLocator.findElement(selector);
  }

  async wait(ms) {
    await this.page.waitForTimeout(ms);
  }
}

module.exports = ActionHandler;
