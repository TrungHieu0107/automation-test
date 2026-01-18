// src/screenshots/strategies/page-screenshot-strategy.js

const ScreenshotStrategy = require("../screenshot-strategy");

/**
 * Strategy for capturing page screenshots using Playwright.
 * Used for regular test step screenshots (before/after submit, failures).
 */
class PageScreenshotStrategy extends ScreenshotStrategy {
  /**
   * Capture a page screenshot using Playwright.
   *
   * @param {object} context - { page, path, fullPage }
   * @returns {Promise<string>} Path to saved screenshot
   */
  async capture(context) {
    const { page, path, fullPage = true } = context;

    await page.screenshot({
      path,
      fullPage,
      timeout: 5000, // 5 second timeout to prevent hanging on fonts
    });

    this.logger.log(`  📸 Page screenshot saved: ${path.split(/[\\/]/).pop()}`);

    return path;
  }

  isEnabled() {
    return this.config.screenshots?.enabled !== false;
  }
}

module.exports = PageScreenshotStrategy;
