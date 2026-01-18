// src/screenshots/screenshot-strategy.js

/**
 * Abstract base class for screenshot strategies.
 *
 * Design Pattern: Strategy Pattern
 * SOLID Principles:
 * - SRP: Each strategy handles one type of screenshot
 * - OCP: Add new strategies without modifying existing code
 * - LSP: All strategies can be used interchangeably
 */
class ScreenshotStrategy {
  /**
   * @param {object} config - Configuration object
   * @param {object} logger - Logger instance
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Capture screenshot based on strategy.
   * Must be implemented by subclasses.
   *
   * @param {object} context - Context object containing necessary data
   * @returns {Promise<string|null>} Path to saved screenshot or null
   */
  async capture(context) {
    throw new Error(`${this.constructor.name} must implement capture() method`);
  }

  /**
   * Check if this strategy is enabled in configuration.
   * @returns {boolean}
   */
  isEnabled() {
    return true; // Override in subclasses
  }

  /**
   * Build sanitized filename from components.
   * Shared utility for all strategies.
   *
   * @param {string[]} parts - Filename parts
   * @returns {string} Sanitized filename with .png extension
   */
  buildFilename(parts) {
    return parts.filter((p) => p).join("_") + ".png";
  }

  /**
   * Sanitize text for use in filenames.
   * @param {string} text - Text to sanitize
   * @param {number} maxLength - Maximum length
   * @returns {string} Sanitized text
   */
  sanitize(text, maxLength = 50) {
    return text.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, maxLength);
  }
}

module.exports = ScreenshotStrategy;
