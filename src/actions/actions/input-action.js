// src/actions/actions/input-action.js

const BaseAction = require("./base-action");

/**
 * Handles input/fill actions on text fields.
 * Single Responsibility: Only handles text input operations.
 */
class InputAction extends BaseAction {
  /**
   * Execute input action by filling a text field.
   * @param {object} element - Playwright Locator
   * @param {object} step - Step configuration with value property
   * @param {string} indent - Logging indentation
   */
  async execute(element, step, indent) {
    await element.fill(step.value);
    this.logger.log(`${indent}  ✏️ Entered "${step.value}"`);
  }
}

module.exports = InputAction;
