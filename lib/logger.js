// lib/logger.js
class Logger {
    constructor(config) {
      this.config = config;
    }
  
    log(message) {
      if (this.config?.logging?.level === 'silent') return;
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${message}`);
    }
  
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
  
    logSuccess(message) {
      this.log(`? ${message}`);
    }
  
    logFailure(message) {
      this.log(`? ${message}`);
    }
  
    logInfo(message) {
      this.log(`? ${message}`);
    }
  }
  
  module.exports = Logger;