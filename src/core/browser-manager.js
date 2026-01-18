// src/core/browser-manager.js
const { chromium } = require("playwright");

/**
 * BrowserManager handles browser lifecycle operations including
 * initialization, context creation, and cleanup.
 */
class BrowserManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * Initializes the browser, context, and page
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.log("Launching Microsoft Edge browser...");
    
    this.browser = await chromium.launch({
      headless: this.config.browser.headless || false,
      channel: "msedge",
      args: this.config.browser.args || [],
    });

    this.context = await this.browser.newContext({
      viewport: this.config.browser.viewport || { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.execution.actionTimeout || 30000);

    this.logger.logSuccess("Browser initialized successfully");
  }

  /**
   * Gets the current page instance
   * @returns {Page} Playwright page instance
   */
  getPage() {
    return this.page;
  }

  /**
   * Cleans up browser resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
      this.logger.log("Browser cleanup completed");
    } catch (error) {
      this.logger.logError("Browser cleanup failed", error);
    }
  }
}

module.exports = BrowserManager;
