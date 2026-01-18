// src/actions/actions/radio-action.js

const BaseAction = require('./base-action');

/**
 * Handles radio button selection.
 * Single Responsibility: Only handles radio button operations.
 */
class RadioAction extends BaseAction {
  /**
   * Execute radio button selection with optional verification.
   * @param {object} element - Playwright Locator
   * @param {object} step - Step configuration
   * @param {string} indent - Logging indentation
   */
  async execute(element, step, indent) {
    const isChecked = await element.isChecked();

    if (!isChecked) {
      if (step.waitForNavigation) {
        await Promise.all([
          this.page.waitForNavigation({
            timeout: this.config.execution.navigationTimeout,
            waitUntil: "domcontentloaded",
          }),
          element.check(),
        ]);
        this.logger.log(`${indent}  🔘 Radio selected (navigation completed)`);

        if (step.postNavigationWait) {
          await this.wait(step.postNavigationWait);
        }
      } else {
        await element.check();
        this.logger.log(`${indent}  🔘 Radio selected`);
      }
    } else {
      this.logger.log(`${indent}  ℹ️ Radio already selected`);
    }

    // Verify selection if requested
    if (step.verifyValue) {
      const value = await element.inputValue();
      if (value !== step.value) {
        throw new Error(
          `Radio value mismatch: expected "${step.value}" but got "${value}"`
        );
      }
    }
  }
}

module.exports = RadioAction;
