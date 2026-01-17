// lib/report-generator.js
const fs = require('fs').promises;
const path = require('path');

class ReportGenerator {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  async generate(testResults) {
    const report = {
      executionTime: new Date().toISOString(),
      totalTests: testResults.length,
      passed: testResults.filter(t => t.status === 'passed').length,
      failed: testResults.filter(t => t.status === 'failed').length,
      results: testResults
    };

    // Generate JSON report
    const jsonPath = path.join(this.config.screenshots.outputPath, 'test-report.json');
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtml(report);
    const htmlPath = path.join(this.config.screenshots.outputPath, 'test-report.html');
    await fs.writeFile(htmlPath, htmlReport);

    this.printSummary(report, jsonPath, htmlPath);
  }

  printSummary(report, jsonPath, htmlPath) {
    this.logger.log(`\n========================================`);
    this.logger.log(`TEST SUMMARY`);
    this.logger.log(`========================================`);
    this.logger.log(`Total: ${report.totalTests}`);
    this.logger.log(`Passed: ${report.passed} ?`);
    this.logger.log(`Failed: ${report.failed} ?`);
    this.logger.log(`Success Rate: ${((report.passed / report.totalTests) * 100).toFixed(1)}%`);
    this.logger.log(`----------------------------------------`);
    this.logger.log(`JSON Report: ${jsonPath}`);
    this.logger.log(`HTML Report: ${htmlPath}`);
    this.logger.log(`========================================`);
  }

  generateHtml(report) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Test Execution Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .summary-card { flex: 1; padding: 20px; border-radius: 5px; color: white; text-align: center; }
    .total { background: #3498db; }
    .passed { background: #27ae60; }
    .failed { background: #e74c3c; }
    .summary-card h2 { margin: 0; font-size: 36px; }
    .summary-card p { margin: 10px 0 0 0; }
    .test-result { background: white; margin: 10px 0; padding: 15px; border-radius: 5px; border-left: 4px solid #ccc; }
    .test-result.passed { border-color: #27ae60; }
    .test-result.failed { border-color: #e74c3c; }
    .test-name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
    .test-status { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; font-size: 12px; }
    .status-passed { background: #27ae60; }
    .status-failed { background: #e74c3c; }
    .error-message { background: #ffe6e6; padding: 10px; border-radius: 3px; margin-top: 10px; color: #c0392b; font-family: monospace; }
    .screenshots { margin-top: 10px; }
    .screenshot-link { color: #3498db; text-decoration: none; margin-right: 10px; width: 300px }
    .timestamp { color: #7f8c8d; font-size: 14px; }
    .indent { margin-left: ${(level) => level * 20}px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>? Test Execution Report</h1>
    <p class="timestamp">Executed: ${report.executionTime}</p>
  </div>
  
  <div class="summary">
    <div class="summary-card total">
      <h2>${report.totalTests}</h2>
      <p>Total Tests</p>
    </div>
    <div class="summary-card passed">
      <h2>${report.passed}</h2>
      <p>Passed</p>
    </div>
    <div class="summary-card failed">
      <h2>${report.failed}</h2>
      <p>Failed</p>
    </div>
  </div>

  <h2>Test Results</h2>
  ${report.results.map(test => `
    <div class="test-result ${test.status}" style="margin-left: ${(test.hierarchyLevel || 0) * 20}px;">
      <div class="test-name">
        ${test.name}
        <span class="test-status status-${test.status}">${test.status.toUpperCase()}</span>
        ${test.skippedNavigation ? '<span style="color: #7f8c8d; font-size: 12px; margin-left: 10px;">? Continued on same page</span>' : ''}
      </div>
      ${test.error ? `<div class="error-message"><strong>Error:</strong> ${test.error}</div>` : ''}
      ${test.screenshots.length > 0 ? `
        <div class="screenshots">
          <strong>Screenshots:</strong><br>
          ${test.screenshots.map((screenshot, idx) => 
            `<img src="${screenshot.replace("screenshots\\", "")}" target="_blank" class="screenshot-link">? Screenshot ${idx + 1}</img>`
          ).join('')}
        </div>
      ` : ''}
    </div>
  `).join('')}
</body>
</html>`;
  }
}

module.exports = ReportGenerator;