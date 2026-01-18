// src/actions/executors/input-action-executor.js

const ActionExecutor = require('./action-executor');

/**
 * InputActionExecutor - Handles text input actions.
 * 
 * Responsibility: Fill input fields with text values
 */
class InputActionExecutor extends ActionExecutor {
  async execute(element, step, indent = '') {
    await element.fill(step.value, {
      timeout: this.config.execution.actionTimeout,
    });
    this.logger.log(`${indent}  ✏️ Entered "${step.value}"`);
  }
}

module.exports = InputActionExecutor;
