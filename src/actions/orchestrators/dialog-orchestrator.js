// src/actions/orchestrators/dialog-orchestrator.js

/**
 * DialogOrchestrator - Orchestrates complex dialog handling workflows.
 *
 * Pattern: Orchestrator Pattern
 * - Coordinates multiple operations: listener setup, action execution,
 *   dialog handling, screenshot capture, navigation
 *
 * Responsibility: Business logic for dialog workflows
 */
class DialogOrchestrator {
  /**
   * @param {object} page - Playwright Page
   * @param {object} config - Configuration
   * @param {object} logger - Logger
   * @param {object} dialogScreenshotHandler - Screenshot handler
   */
  constructor(page, config, logger, dialogScreenshotHandler) {
    this.page = page;
    this.config = config;
    this.logger = logger;
    this.dialogScreenshotHandler = dialogScreenshotHandler;
  }

  /**
   * Execute dialog workflow: setup listener, trigger action, handle dialog.
   *
   * @param {Function} triggerAction - Async function that triggers the dialog
   * @param {object} dialogConfig - Dialog configuration {dialogType, action, waitForNavigation}
   * @param {string} stepInfo - Step context for logging/screenshots
   * @param {string} indent - Logging indentation
   * @returns {Promise<string|null>} Screenshot path or null
   */
  async executeWithDialog(triggerAction, dialogConfig, stepInfo, indent = "") {
    this.logger.log(
      `${indent}  🔔 Setting up dialog listener for ${dialogConfig.dialogType} dialog...`,
    );

    // Setup dialog listener BEFORE triggering action
    const dialogPromise = this.page.waitForEvent("dialog", {
      timeout: this.config.execution.actionTimeout,
    });

    // Trigger the action (e.g., click button)
    const actionPromise = triggerAction();

    // Wait for dialog to appear
    let dialog;
    try {
      dialog = await dialogPromise;
    } catch (err) {
      // Dialog didn't appear
      try {
        await actionPromise;
        throw new Error(
          `Expected ${dialogConfig.dialogType} dialog did not appear`,
        );
      } catch (actionErr) {
        throw new Error(
          `Action failed and dialog did not appear: ${actionErr.message}`,
        );
      }
    }

    this.logger.log(`${indent}  🔔 Dialog appeared: ${dialog.type()}`);

    // Validate dialog type
    if (dialogConfig.dialogType && dialog.type() !== dialogConfig.dialogType) {
      throw new Error(
        `Dialog type mismatch: expected "${dialogConfig.dialogType}" but got "${dialog.type()}"`,
      );
    }

    // Capture screenshot BEFORE handling dialog
    let screenshotPath = null;
    if (this.dialogScreenshotHandler) {
      screenshotPath = await this.dialogScreenshotHandler.captureForDialog(
        dialog,
        this.page,
        stepInfo,
        "",
      );
    }

    // Handle dialog
    const action = dialogConfig.action || "accept";
    switch (action) {
      case "accept":
        await dialog.accept();
        this.logger.log(`${indent}  ✓ Dialog accepted`);
        break;
      case "dismiss":
        await dialog.dismiss();
        this.logger.log(`${indent}  ✗ Dialog dismissed`);
        break;
      default:
        throw new Error(`Unknown dialog action: ${action}`);
    }

    // Wait for navigation if configured
    if (dialogConfig.waitForNavigation) {
      await this.page.waitForLoadState("domcontentloaded", {
        timeout: this.config.execution.navigationTimeout,
      });
      this.logger.log(`${indent}  ↻ Navigation completed`);
    }

    return screenshotPath;
  }

  /**
   * Handle multiple sequential dialogs.
   *
   * @param {Function} triggerAction - Function that triggers dialogs
   * @param {Array} dialogConfigs - Array of dialog configurations
   * @param {string} stepInfo - Step context
   * @param {string} indent - Logging indentation
   * @returns {Promise<Array<string>>} Array of screenshot paths
   */
  async executeWithMultipleDialogs(
    triggerAction,
    dialogConfigs,
    stepInfo,
    indent = "",
  ) {
    const screenshots = [];
    const totalDialogs = dialogConfigs.length;

    this.logger.log(
      `${indent}  🔔 Will handle ${totalDialogs} sequential dialogs...`,
    );

    let dialogCount = 0;

    // Setup handler for all dialogs
    const dialogHandler = async (dialog) => {
      const dialogConfig = dialogConfigs[dialogCount];
      dialogCount++;

      this.logger.log(
        `${indent}  🔔 Dialog ${dialogCount}/${totalDialogs} appeared: ${dialog.type()}`,
      );

      // Validate dialog type
      if (
        dialogConfig.dialogType &&
        dialog.type() !== dialogConfig.dialogType
      ) {
        throw new Error(
          `Dialog ${dialogCount} type mismatch: expected "${dialogConfig.dialogType}" but got "${dialog.type()}"`,
        );
      }

      // Capture screenshot
      if (this.dialogScreenshotHandler) {
        const screenshot = await this.dialogScreenshotHandler.captureForDialog(
          dialog,
          this.page,
          stepInfo,
          `dialog-${dialogCount}`,
        );
        if (screenshot) {
          screenshots.push(screenshot);
        }
      }

      // Handle dialog
      const action = dialogConfig.action || "accept";
      if (action === "accept") {
        await dialog.accept();
      } else if (action === "dismiss") {
        await dialog.dismiss();
      }

      this.logger.log(
        `${indent}  ${action === "accept" ? "✓" : "✗"} Dialog ${dialogCount} ${action}ed`,
      );
    };

    this.page.on("dialog", dialogHandler);

    try {
      // Trigger action
      await triggerAction();

      // Wait for all dialogs to be handled
      while (dialogCount < totalDialogs) {
        await this.page.waitForTimeout(100);
      }
    } finally {
      this.page.off("dialog", dialogHandler);
    }

    return screenshots;
  }
}

module.exports = DialogOrchestrator;
