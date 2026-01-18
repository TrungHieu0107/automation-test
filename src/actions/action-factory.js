// src/actions/action-factory.js

const InputAction = require('./actions/input-action');
const ClickAction = require('./actions/click-action');

/**
 * Factory for creating action executors.
 * 
 * Design Pattern: Factory Method Pattern
 * SOLID Principles:
 * - OCP: Open for extension (register new actions), closed for modification
 * - DIP: Depends on BaseAction abstraction, not concrete implementations
 * 
 * Benefits:
 * - Easy to add new action types without modifying existing code
 * - Centralized action creation logic
 * - Type-safe action instantiation
 */
class ActionFactory {
  /**
   * Registry of action types to their implementing classes.
   * @private
   */
  static actionTypes = new Map();

  /**
   * Register an action type with its implementing class.
   * Allows runtime extension of supported action types.
   * 
   * @param {string} type - Action type identifier (e.g., 'input', 'click')
   * @param {class} ActionClass - Class that extends BaseAction
   */
  static register(type, ActionClass) {
    this.actionTypes.set(type, ActionClass);
  }

  /**
   * Create an action executor for the given type.
   * 
   * @param {string} type - Action type to create
   * @param {object} page - Playwright Page object
   * @param {object} config - Configuration object
   * @param {object} logger - Logger instance
   * @returns {BaseAction} Action executor instance
   * @throws {Error} If action type is not registered
   */
  static create(type, page, config, logger) {
    const ActionClass = this.actionTypes.get(type);
    
    if (!ActionClass) {
      throw new Error(`Unknown action type: ${type}. Available types: ${Array.from(this.actionTypes.keys()).join(', ')}`);
    }
    
    return new ActionClass(page, config, logger);
  }

  /**
   * Check if an action type is registered.
   * 
   * @param {string} type - Action type to check
   * @returns {boolean} True if registered
   */
  static has(type) {
    return this.actionTypes.has(type);
  }

  /**
   * Get all registered action types.
   * 
   * @returns {string[]} Array of registered type names
   */
  static getRegisteredTypes() {
    return Array.from(this.actionTypes.keys());
  }
}

// Register built-in action types
ActionFactory.register('input', InputAction);
ActionFactory.register('click', ClickAction);

// Import and register remaining action types
const CheckboxAction = require('./actions/checkbox-action');
const RadioAction = require('./actions/radio-action');
const SelectAction = require('./actions/select-action');

ActionFactory.register('checkbox', CheckboxAction);
ActionFactory.register('check', CheckboxAction); // Alias
ActionFactory.register('radio', RadioAction);
ActionFactory.register('select', SelectAction);

// Note: DialogAction will be registered separately as it requires special handling.
// This demonstrates the Open/Closed Principle - the factory is open for extension 
// but closed for modification.

module.exports = ActionFactory;
