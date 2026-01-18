// src/actions/executors/select-action-executor.js

const ActionExecutor = require('./action-executor');

/**
 * SelectActionExecutor - Handles dropdown/select element selection.
 * 
 * Responsibility: Select options by value, label, or index with verification
 */
class SelectActionExecutor extends ActionExecutor {
  async execute(element, step, indent = '') {
    const selectBy = step.selectBy || 'value';
    const value = step.value;

    // Perform selection
    switch (selectBy) {
      case 'value':
        await element.selectOption({ value: value });
        break;
      case 'label':
        await element.selectOption({ label: value });
        break;
      case 'index':
        await element.selectOption({ index: parseInt(value) });
        break;
      default:
        throw new Error(`Unknown selectBy method: ${selectBy}`);
    }

    // Optional: verify selected value
    if (step.verifyValue) {
      const actualValue = await element.inputValue();
      if (actualValue !== value) {
        throw new Error(
          `Select value mismatch: expected "${value}" but got "${actualValue}"`
        );
      }
    }

    this.logger.log(`${indent}  🔽 Selected "${value}" (by ${selectBy})`);
  }
}

module.exports = SelectActionExecutor;
