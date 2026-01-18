// src/utils/directory-manager.js
const fs = require("fs").promises;

/**
 * DirectoryManager handles directory creation and cleanup operations.
 */
class DirectoryManager {
  /**
   * Ensures directories exist, optionally cleaning them first
   * @param {Array<string>} directories - Array of directory paths
   * @param {boolean} cleanupFirst - Whether to clean directories before creating
   * @param {Function} logger - Logger function for output
   * @returns {Promise<void>}
   */
  static async ensureDirectories(
    directories,
    cleanupFirst = false,
    logger = null,
  ) {
    for (const dir of directories) {
      if (cleanupFirst) {
        try {
          await fs.rm(dir, { recursive: true, force: true });
          if (logger) logger(`Cleaned up directory: ${dir}`);
        } catch (error) {
          if (error.code !== "ENOENT") {
            throw new Error(
              `Failed to cleanup directory ${dir}: ${error.message}`,
            );
          }
        }
      }

      await fs.mkdir(dir, { recursive: true });
      if (logger) logger(`Ensured directory exists: ${dir}`);
    }
  }
}

module.exports = DirectoryManager;
