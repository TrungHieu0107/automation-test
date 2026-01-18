// src/infrastructure/element-locator.js

/**
 * ElementLocator - Infrastructure class for element location.
 * 
 * SOLID Principles:
 * - SRP: Single responsibility for element finding
 * - OCP: Extensible for new selector strategies
 * 
 * Pattern: Facade Pattern
 * - Hides complexity of multiple selector strategies behind simple interface
 */
class ElementLocator {
  /**
   * @param {object} page - Playwright Page object
   * @param {object} logger - Logger instance
   */
  constructor(page, logger) {
    this.page = page;
    this.logger = logger;
  }

  /**
   * Find element by selector strategy.
   * Supports: CSS, XPath, name attribute, button text, and ID.
   * 
   * @param {object} selector - Selector object with 'by' and 'value' properties
   * @returns {Promise<object>} Playwright Locator object
   * @throws {Error} If element cannot be found or selector type is unknown
   */
  async findElement(selector) {
    if (!selector) {
      throw new Error('Selector is required');
    }

    const by = selector.by || 'css';
    const value = selector.value;

    let element;

    switch (by) {
      case 'css':
        element = this.page.locator(value);
        break;

      case 'xpath':
        element = this.page.locator(`xpath=${value}`);
        break;

      case 'name':
        element = this.page.locator(`[name="${value}"]`);
        break;

      case 'button':
        element = this.page.locator(`button:has-text("${value}")`);
        break;

      case 'id':
        element = this.page.locator(`#${value}`);
        break;

      default:
        throw new Error(`Unknown selector type: ${by}`);
    }

    // Verify element exists
    try {
      await element.waitFor({ state: 'attached', timeout: 5000 });
    } catch (error) {
      throw new Error(
        `Element not found: ${by}="${value}". Error: ${error.message}`
      );
    }

    return element;
  }
}

module.exports = ElementLocator;
