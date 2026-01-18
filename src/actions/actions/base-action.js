// src/actions/actions/base-action.js

/**
 * Base class for all action executors.
 * Following SOLID principles:
 * - SRP: Each concrete action handles one type of interaction
 * - OCP: Extend this class to add new actions without modification
 * - LSP: All actions can be used interchangeably through this interface
 */
class BaseAction {
  /**
   * @param {object} page - Playwright Page object
   * @param {object} config - Configuration object
   * @param {object} logger - Logger instance
   */
  constructor(page, config, logger) {
    this.page = page;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Execute the action on the element.
   * Must be implemented by subclasses.
   * @param {object|null} element - Playwright Locator or null for dialog actions
   * @param {object} step - Step configuration
   * @param {string} indent - Logging indentation
   * @returns {Promise<void>}
   */
  async execute(element, step, indent) {
    throw new Error(`${this.constructor.name} must implement execute() method`);
  }

  /**
   * Find and wait for element to be visible.
   * Shared implementation for all actions that need elements.
   * @param {object} selector - Selector object
   * @returns {Promise<object>} Playwright Locator
   */
  async findElement(selector) {
    let locator;

    switch (selector.by) {
      case "id":
        locator = this.page.locator(`#${selector.value}`);
        break;
      case "name":
        locator = this.page.locator(`[name="${selector.value}"]`);
        break;
      case "css":
        locator = this.page.locator(selector.value);
        break;
      case "xpath":
        locator = this.page.locator(`xpath=${selector.value}`);
        break;
      default:
        throw new Error(`Unknown selector type: ${selector.by}`);
    }

    await locator.waitFor({
      state: "visible",
      timeout: this.config.execution.actionTimeout,
    });

    return locator;
  }

  /**
   * Wait for specified milliseconds.
   * Shared utility for all actions.
   * @param {number} ms - Milliseconds to wait
   * @returns {Promise<void>}
   */
  async wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = BaseAction;
