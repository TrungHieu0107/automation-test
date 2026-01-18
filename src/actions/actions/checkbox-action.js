// src/actions/actions/checkbox-action.js

const BaseAction = require("./base-action");

/**
 * Handles checkbox actions.
 * Single Responsibility: Only handles checkbox check/uncheck operations.
 */
class CheckboxAction extends BaseAction {
  /**
   * Execute checkbox action with smart toggle logic.
   * @param {object} element - Playwright Locator
   * @param {object} step - Step configuration
   * @param {string} indent - Logging indentation
   */
  async execute(element, step, indent) {
    const isChecked = await element.isChecked();

    if (step.value !== undefined) {
      // Explicit value specified
      if (step.value && !isChecked) {
        await this.checkWithNavigation(element, step, indent);
        this.logger.log(`${indent}  ☑️ Checked`);
      } else if (!step.value && isChecked) {
        await this.checkWithNavigation(element, step, indent);
        this.logger.log(`${indent}  ☐ Unchecked`);
      } else {
        this.logger.log(
          `${indent}  ℹ️ Already ${step.value ? "checked" : "unchecked"}`,
        );
      }
    } else {
      // Toggle checkbox
      await this.checkWithNavigation(element, step, indent);
      this.logger.log(`${indent}  ${isChecked ? "☐ Unchecked" : "☑️ Checked"}`);
    }
  }

  /**
   * Check/uncheck with optional navigation wait.
   * @private
   */
  async checkWithNavigation(element, step, indent) {
    if (step.waitForNavigation) {
      await Promise.all([
        this.page.waitForNavigation({
          timeout: this.config.execution.navigationTimeout,
          waitUntil: "domcontentloaded",
        }),
        element.check(),
      ]);
      this.logger.log(`${indent}  🧭 Page reloaded after checkbox action`);

      if (step.postNavigationWait) {
        this.logger.log(
          `${indent}  ⏳ Waiting ${step.postNavigationWait}ms after reload...`,
        );
        await this.wait(step.postNavigationWait);
      }
    } else {
      await element.check();
    }
  }
}

module.exports = CheckboxAction;
