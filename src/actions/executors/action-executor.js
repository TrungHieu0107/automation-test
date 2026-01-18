// src/actions/executors/action-executor.js

/**
 * ActionExecutor - Base interface for action execution strategies.
 *
 * Pattern: Strategy Pattern
 * - Defines common interface for all action executors
 * - Allows ActionHandler to use executors polymorphically
 *
 * SOLID Principles:
 * - LSP: All subclasses must be substitutable
 * - ISP: Minimal interface - only execute()
 */
class ActionExecutor {
  /**
   * @param {object} config - Configuration object
   * @param {object} logger - Logger instance
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Execute the action.
   * Must be overridden by subclasses.
   *
   * @param {object} element - Playwright Locator object
   * @param {object} step - Step configuration
   * @param {string} indent - Logging indentation
   * @returns {Promise<void>}
   * @abstract
   */
  async execute(element, step, indent = "") {
    throw new Error("execute() must be implemented by subclass");
  }
}

module.exports = ActionExecutor;
