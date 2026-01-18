// src/actions/actions/click-action.js

const BaseAction = require('./base-action');

/**
 * Handles click actions on elements.
 * Single Responsibility: Only handles click operations and optional navigation.
 */
class ClickAction extends BaseAction {
  /**
   * Execute click action with optional navigation wait.
   * @param {object} element - Playwright Locator
   * @param {object} step - Step configuration
   * @param {string} indent - Logging indentation
   */
  async execute(element, step, indent) {
    if (step.waitForNavigation) {
      await element.click();
      this.logger.log(`${indent}  👆 Clicked`);

      await this.page.waitForNavigation({
        timeout: this.config.execution.navigationTimeout,
        waitUntil: "domcontentloaded",
      });
      this.logger.log(`${indent}  🧭 Navigation completed`);

      if (step.postNavigationWait) {
        await this.wait(step.postNavigationWait);
      }
    } else {
      await element.click();
      this.logger.log(`${indent}  👆 Clicked`);
    }
  }
}

module.exports = ClickAction;
