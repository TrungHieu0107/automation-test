// src/actions/executors/checkbox-action-executor.js

const ActionExecutor = require('./action-executor');

/**
 * CheckboxActionExecutor - Handles checkbox check/uncheck actions.
 * 
 * Responsibility: Check/uncheck checkboxes intelligently (only if needed)
 */
class CheckboxActionExecutor extends ActionExecutor {
  /**
   * @param {object} config - Configuration
   * @param {object} logger - Logger  
   * @param {object} page - Playwright Page
   */
  constructor(config, logger, page) {
    super(config, logger);
    this.page = page;
  }

  async execute(element, step, indent = '') {
    const currentlyChecked = await element.isChecked();
    const desiredValue = step.value === true || step.value === 'true';

    // Only toggle if needed
    if (currentlyChecked !== desiredValue) {
      if (step.waitForNavigation) {
        await Promise.all([
          this.page.waitForNavigation({
            timeout: this.config.execution.navigationTimeout,
            waitUntil: 'domcontentloaded',
          }).catch(() => {}), // Ignore if no navigation
          element.check({ timeout: desiredValue ? this.config.execution.actionTimeout : undefined }),
        ]);
      } else {
        if (desiredValue) {
          await element.check({ timeout: this.config.execution.actionTimeout });
        } else {
          await element.uncheck({ timeout: this.config.execution.actionTimeout });
        }
      }
    }

    this.logger.log(`${indent}  ${desiredValue ? '✓' : '☐'} ${desiredValue ? 'Checked' : 'Unchecked'}`);
  }
}

module.exports = CheckboxActionExecutor;
