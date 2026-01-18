// src/actions/actions/select-action.js

const BaseAction = require("./base-action");

/**
 * Handles select/dropdown actions.
 * Single Responsibility: Only handles dropdown selection operations.
 */
class SelectAction extends BaseAction {
  /**
   * Execute select action with multiple selection methods.
   * @param {object} element - Playwright Locator
   * @param {object} step - Step configuration
   * @param {string} indent - Logging indentation
   */
  async execute(element, step, indent) {
    const selectBy = step.selectBy || "value"; // value, label, or index

    if (step.waitForNavigation) {
      await Promise.all([
        this.page.waitForNavigation({
          timeout: this.config.execution.navigationTimeout,
          waitUntil: "domcontentloaded",
        }),
        this.performSelect(element, step.value, selectBy),
      ]);
      this.logger.log(
        `${indent}  🔽 Selected "${step.value}" (navigation completed)`,
      );

      if (step.postNavigationWait) {
        await this.wait(step.postNavigationWait);
      }
    } else {
      await this.performSelect(element, step.value, selectBy);
      this.logger.log(`${indent}  🔽 Selected "${step.value}"`);
    }

    // Verify selection if requested
    if (step.verifyValue) {
      const selectedValue = await element.inputValue();
      if (selectBy === "value" && selectedValue !== step.value) {
        throw new Error(
          `Select value mismatch: expected "${step.value}" but got "${selectedValue}"`,
        );
      }
    }
  }

  /**
   * Perform the selection based on selectBy method.
   * @private
   */
  async performSelect(element, value, selectBy) {
    switch (selectBy) {
      case "value":
        await element.selectOption({ value });
        break;
      case "label":
        await element.selectOption({ label: value });
        break;
      case "index":
        await element.selectOption({ index: parseInt(value) });
        break;
      default:
        await element.selectOption(value);
    }
  }
}

module.exports = SelectAction;
