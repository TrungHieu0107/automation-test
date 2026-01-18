// src/screenshots/dialog-screenshot-handler.js

/**
 * Handler for dialog screenshot operations.
 * 
 * SOLID Principles:
 * - SRP: Single responsibility for dialog screenshot management
 * - DIP: Depends on ScreenshotManager abstraction, not concrete implementation
 * - OCP: Easily extensible for different screenshot types/strategies
 * 
 * Responsibilities:
 * - Generate screenshot filenames with metadata
 * - Manage screenshot output directories
 * - Coordinate with ScreenshotManager for actual capture
 */
class DialogScreenshotHandler {
  /**
   * @param {object} config - Configuration object
   * @param {object} logger - Logger instance
   * @param {ScreenshotManager} screenshotManager - Screenshot strategy manager
   */
  constructor(config, logger, screenshotManager) {
    this.config = config;
    this.logger = logger;
    this.screenshotManager = screenshotManager;
  }

  /**
   * Capture a screenshot for a dialog.
   * Handles filename generation, directory creation, and delegates capture to ScreenshotManager.
   * 
   * @param {object} dialog - Playwright Dialog object
   * @param {object} page - Playwright Page object
   * @param {string} testName - Current test name for filename
   * @param {string} stepInfo - Additional step context (e.g., "submit", "step-3")
   * @returns {Promise<string|null>} Path to saved screenshot or null if disabled
   */
  async captureForDialog(dialog, page, testName, stepInfo = '') {
    if (!this.config.screenshots?.captureDialogs) {
      return null;
    }

    const fs = require('fs').promises;
    const path = require('path');

    try {
      // Ensure directory exists
      const outputPath = this.config.screenshots.dialogPath;
      await fs.mkdir(outputPath, { recursive: true });

      // Build filename with metadata
      const filename = this.generateFilename(dialog, testName, stepInfo);
      const fullPath = path.join(outputPath, filename);

      // Delegate actual screenshot capture to ScreenshotManager
      await this.screenshotManager.captureDialog({
        page: page,
        path: fullPath,
      });

      this.logger.log(`  📸 Dialog screenshot saved: ${filename}`);

      return fullPath;
    } catch (error) {
      this.logger.log(`  ⚠️ Failed to capture dialog screenshot: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate screenshot filename with metadata.
   * 
   * @param {object} dialog - Playwright Dialog object
   * @param {string} testName - Test name
   * @param {string} stepInfo - Step information
   * @returns {string} Generated filename
   * @private
   */
  generateFilename(dialog, testName, stepInfo) {
    const dialogType = dialog.type(); // 'alert', 'confirm', or 'prompt'
    const safeName = (testName || 'unknown-test')
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);

    const parts = [];

    if (this.config.screenshots.includeDialogTestName) {
      parts.push(safeName);
    }

    if (stepInfo) {
      parts.push(stepInfo);
    }

    parts.push(dialogType);

    if (this.config.screenshots.includeDialogTimestamp) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      parts.push(timestamp);
    }

    return parts.join('_') + '.png';
  }
}

module.exports = DialogScreenshotHandler;
