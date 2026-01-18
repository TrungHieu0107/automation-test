// src/actions/executors/radio-action-executor.js

const ActionExecutor = require("./action-executor");

/**
 * RadioActionExecutor - Handles radio button selection.
 *
 * Responsibility: Select radio buttons with optional value verification
 */
class RadioActionExecutor extends ActionExecutor {
  async execute(element, step, indent = "") {
    const isSelected = await element.isChecked();

    if (!isSelected) {
      await element.click({ timeout: this.config.execution.actionTimeout });
    }

    // Optional: verify selected value
    if (step.verifyValue && step.value) {
      const actualValue = await element.inputValue();
      if (actualValue !== step.value) {
        throw new Error(
          `Radio value mismatch: expected "${step.value}" but got "${actualValue}"`,
        );
      }
    }

    this.logger.log(`${indent}  ⦿ Radio selected`);
  }
}

module.exports = RadioActionExecutor;
