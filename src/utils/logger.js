// lib/logger.js
/**
 * Logger class provides logging functionality with different log levels
 * and formatted output with timestamps.
 */
class Logger {
  /**
   * Creates an instance of Logger.
   * @param {object} config - Configuration object containing logging settings
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Logs a message with timestamp to console.
   * Respects silent logging level setting.
   * @param {string} message - The message to log
   */
  log(message) {
    if (this.config?.logging?.level === "silent") return;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  /**
   * Logs an error message with timestamp and optional error details.
   * Includes stack trace if verbose logging is enabled.
   * @param {string} message - The error message to log
   * @param {Error} [error] - Optional Error object with additional details
   */
  logError(message, error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`);
    if (error) {
      console.error(`  Details: ${error.message}`);
      if (error.stack && this.config?.logging?.verbose) {
        console.error(`  Stack: ${error.stack}`);
      }
    }
  }

  /**
   * Logs a success message with a success indicator.
   * @param {string} message - The success message to log
   */
  logSuccess(message) {
    this.log(`? ${message}`);
  }

  /**
   * Logs a failure message with a failure indicator.
   * @param {string} message - The failure message to log
   */
  logFailure(message) {
    this.log(`? ${message}`);
  }

  /**
   * Logs an informational message with an info indicator.
   * @param {string} message - The informational message to log
   */
  logInfo(message) {
    this.log(`? ${message}`);
  }
}

module.exports = Logger;
