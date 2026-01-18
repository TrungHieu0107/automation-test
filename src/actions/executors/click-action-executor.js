// src/actions/executors/click-action-executor.js

const ActionExecutor = require("./action-executor");

/**
 * ClickActionExecutor - Handles click actions with optional navigation.
 *
 * Responsibility: Click elements and coordinate navigation timing
 */
class ClickActionExecutor extends ActionExecutor {
  /**
   * @param {object} config - Configuration
   * @param {object} logger - Logger
   * @param {object} page - Playwright Page (for navigation)
   */
  constructor(config, logger, page) {
    super(config, logger);
    this.page = page;
  }

  async execute(element, step, indent = "") {
    if (step.waitForNavigation) {
      // Wait for both click and navigation
      await Promise.all([
        this.page.waitForNavigation({
          timeout: this.config.execution.navigationTimeout,
          waitUntil: "domcontentloaded",
        }),
        element.click({ timeout: this.config.execution.actionTimeout }),
      ]);
      this.logger.log(`${indent}  👆 Clicked (with navigation)`);
    } else {
      await element.click({ timeout: this.config.execution.actionTimeout });
      this.logger.log(`${indent}  👆 Clicked`);
    }

    // Optional post-navigation wait
    if (step.postNavigationWait) {
      const waitTime = parseInt(step.postNavigationWait);
      await this.page.waitForTimeout(waitTime);
      this.logger.log(`${indent}  ⏱️  Waited ${waitTime}ms after navigation`);
    }
  }
}

module.exports = ClickActionExecutor;
