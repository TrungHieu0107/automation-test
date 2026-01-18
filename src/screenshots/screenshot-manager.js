// src/screenshots/screenshot-manager.js

const PageScreenshotStrategy = require("./strategies/page-screenshot-strategy");

/**
 * Manager for screenshot operations using Strategy Pattern.
 *
 * Design Pattern: Strategy + Context
 * SOLID Principles:
 * - SRP: Manages screenshot strategies
 * - DIP: Depends on ScreenshotStrategy abstraction
 * - OCP: Add new strategies without modifying this class
 *
 * Usage:
 *   const manager = new ScreenshotManager(config, logger);
 *   await manager.capturePage({ page, path });
 *   await manager.captureDialog({ page, path });
 */
class ScreenshotManager {
  /**
   * @param {object} config - Configuration object
   * @param {object} logger - Logger instance
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;

    // Use PageScreenshotStrategy for all screenshot types
    this.pageStrategy = new PageScreenshotStrategy(config, logger);
  }

  /**
   * Capture page screenshot using Playwright.
   *
   * @param {object} context - { page, path, fullPage }
   * @returns {Promise<string>} Path to saved screenshot
   */
  async capturePage(context) {
    return await this.pageStrategy.capture(context);
  }

  /**
   * Capture dialog screenshot using Playwright page screenshot.
   * Adds 50ms delay before capture for page stabilization.
   *
   * @param {object} context - { page, path }
   * @returns {Promise<string|null>} Path to saved screenshot or null
   */
  async captureDialog(context) {
    if (!this.config.dialogScreenshots?.enabled) {
      return null;
    }

    // Wait 50ms for page to stabilize after dialog dismissal
    await new Promise((resolve) => setTimeout(resolve, 50));

    return await this.pageStrategy.capture({
      page: context.page,
      path: context.path,
      fullPage: this.config.screenshots?.fullPage ?? true,
    });
  }

  /**
   * Register a custom screenshot strategy.
   * Demonstrates Open/Closed Principle.
   *
   * @param {string} type - Strategy type identifier
   * @param {ScreenshotStrategy} strategy - Strategy instance
   */
  registerStrategy(type, strategy) {
    this[`${type}Strategy`] = strategy;
  }
}

module.exports = ScreenshotManager;
