// src/actions/executors/executor-registry.js

/**
 * ExecutorRegistry - Registry pattern for action executors.
 *
 * Pattern: Registry Pattern
 * - Centralizes executor lookup
 * - Eliminates switch/case statements
 * - Enables runtime executor registration
 *
 * SOLID Principles:
 * - OCP: Add new executors without modifying this class
 * - DIP: Depends on ActionExecutor interface
 */
class ExecutorRegistry {
  constructor() {
    this.executors = new Map();
  }

  /**
   * Register an executor for an action type.
   *
   * @param {string} actionType - Action type identifier
   * @param {ActionExecutor} executor - Executor instance
   */
  register(actionType, executor) {
    this.executors.set(actionType, executor);
  }

  /**
   * Get executor for action type.
   *
   * @param {string} actionType - Action type
   * @returns {ActionExecutor} Executor instance
   * @throws {Error} If action type not registered
   */
  get(actionType) {
    if (!this.executors.has(actionType)) {
      throw new Error(`Unknown action type: ${actionType}`);
    }
    return this.executors.get(actionType);
  }

  /**
   * Check if action type is registered.
   *
   * @param {string} actionType - Action type
   * @returns {boolean} True if registered
   */
  has(actionType) {
    return this.executors.has(actionType);
  }
}

module.exports = ExecutorRegistry;
