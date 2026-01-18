// src/reporting/report-generator.js
const fs = require("fs").promises;
const path = require("path");

/**
 * ReportGenerator class handles generation of test execution reports
 * in both JSON and HTML formats with enhanced step-by-step screenshot support.
 */
class ReportGenerator {
  /**
   * Creates an instance of ReportGenerator.
   * @param {object} config - Configuration object containing screenshot and output path settings
   * @param {object} logger - Logger instance for outputting logs
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Generates both JSON and HTML test reports from test results.
   * Calculates test statistics (total, passed, failed) and writes reports to the output directory.
   * @param {Array<object>} testResults - Array of test result objects containing status, errors, screenshots, etc.
   * @returns {Promise<void>}
   */
  async generate(testResults) {
    const report = {
      executionTime: new Date().toISOString(),
      totalTests: testResults.length,
      passed: testResults.filter((t) => t.status === "passed").length,
      failed: testResults.filter((t) => t.status === "failed").length,
      results: testResults.map((result) => ({
        ...result,
        screenshots: (result.screenshots || []).filter(
          (s) => s && (typeof s === "string" || s.path),
        ),
      })),
    };

    // Generate JSON report
    const jsonPath = path.join(
      this.config.screenshots.reportPath,
      "test-report.json",
    );
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtml(report);
    const htmlPath = path.join(
      this.config.screenshots.reportPath,
      "test-report.html",
    );
    await fs.writeFile(htmlPath, htmlReport);

    this.printSummary(report, jsonPath, htmlPath);
  }

  /**
   * Prints a formatted test summary to the console including statistics and report file paths.
   * @param {object} report - Report object containing totalTests, passed, failed, and executionTime
   * @param {string} jsonPath - File path to the generated JSON report
   * @param {string} htmlPath - File path to the generated HTML report
   */
  printSummary(report, jsonPath, htmlPath) {
    this.logger.log(`\n========================================`);
    this.logger.log(`TEST SUMMARY`);
    this.logger.log(`========================================`);
    this.logger.log(`Total: ${report.totalTests}`);
    this.logger.log(`Passed: ${report.passed} ✓`);
    this.logger.log(`Failed: ${report.failed} ✗`);
    this.logger.log(
      `Success Rate: ${((report.passed / report.totalTests) * 100).toFixed(1)}%`,
    );
    this.logger.log(`----------------------------------------`);
    this.logger.log(`JSON Report: ${jsonPath}`);
    this.logger.log(`HTML Report: ${htmlPath}`);
    this.logger.log(`========================================`);
  }

  /**
   * Groups screenshots by type for organized display
   * @param {Array} screenshots - Array of screenshot objects
   * @returns {object} Grouped screenshots
   */
  groupScreenshots(screenshots) {
    const groups = {
      submitSteps: [],
      dialogs: [],
      regular: [],
    };

    screenshots.forEach((screenshot) => {
      // Handle both string paths (legacy) and object format (new)
      const screenshotObj =
        typeof screenshot === "string"
          ? { path: screenshot, type: "regular" }
          : screenshot;

      const type = screenshotObj.type || "regular";

      if (type === "submit-step") {
        groups.submitSteps.push(screenshotObj);
      } else if (type === "dialog") {
        groups.dialogs.push(screenshotObj);
      } else {
        groups.regular.push(screenshotObj);
      }
    });

    return groups;
  }

  /**
   * Determines screenshot stage label from filename or metadata
   * @param {string|object} screenshot - Screenshot path or object
   * @returns {string} Human-readable stage label
   */
  getScreenshotStage(screenshot) {
    const filename =
      typeof screenshot === "string" ? screenshot : screenshot.path;

    const basename = filename.replace(/\\/g, "/").split("/").pop();

    if (basename.includes("before")) return "Before Submit";
    if (basename.includes("after")) return "After Submit";
    if (basename.includes("failure")) return "Failure";
    if (basename.includes("_alert_")) return "🔔 Alert Dialog";
    if (basename.includes("_confirm_")) return "🔔 Confirm Dialog";
    if (basename.includes("_prompt_")) return "🔔 Prompt Dialog";
    if (basename.includes("dialog")) return "🔔 Dialog";
    if (basename.includes("submit-step")) return "Submit Step";

    return "Screenshot";
  }

  /**
   * Generates an HTML report string from the test results.
   * Creates a styled HTML page with test summary cards and detailed test results including screenshots.
   * @param {object} report - Report object containing executionTime, totalTests, passed, failed, and results array
   * @returns {string} Complete HTML document as a string
   */
  generateHtml(report) {
    const successRate = ((report.passed / report.totalTests) * 100).toFixed(1);
    const statusColor =
      successRate >= 90 ? "#27ae60" : successRate >= 70 ? "#f39c12" : "#e74c3c";

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Execution Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container { 
      max-width: 1400px; 
      margin: 0 auto; 
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    
    .header { 
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      color: white; 
      padding: 40px;
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: pulse 4s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.3; }
    }
    
    .header-content { position: relative; z-index: 1; }
    .header h1 { 
      font-size: 36px; 
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .header-icon {
      font-size: 48px;
      animation: bounce 2s ease-in-out infinite;
    }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    .timestamp { 
      color: rgba(255,255,255,0.8); 
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
    }
    
    .content { padding: 40px; }
    
    .summary { 
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px; 
      margin-bottom: 40px;
    }
    
    .summary-card { 
      padding: 30px;
      border-radius: 12px;
      color: white;
      text-align: center;
      position: relative;
      overflow: hidden;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .summary-card::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%);
      transition: transform 0.5s ease;
    }
    
    .summary-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    
    .summary-card:hover::before {
      transform: translate(10%, 10%);
    }
    
    .total { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
    .passed { background: linear-gradient(135deg, #27ae60 0%, #229954 100%); }
    .failed { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }
    .success-rate { background: linear-gradient(135deg, ${statusColor} 0%, ${this.darkenColor(statusColor)} 100%); }
    
    .summary-card h2 { 
      font-size: 48px; 
      margin-bottom: 10px;
      font-weight: 700;
      position: relative;
      z-index: 1;
    }
    
    .summary-card p { 
      margin: 0;
      font-size: 18px;
      font-weight: 500;
      position: relative;
      z-index: 1;
      opacity: 0.95;
    }
    
    .section-title {
      font-size: 28px;
      margin: 40px 0 20px 0;
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .test-result { 
      background: white;
      margin: 20px 0;
      border-radius: 12px;
      border: 2px solid #ecf0f1;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    .test-result:hover {
      border-color: #3498db;
      box-shadow: 0 5px 20px rgba(52, 152, 219, 0.2);
    }
    
    .test-result.passed { border-left: 5px solid #27ae60; }
    .test-result.failed { border-left: 5px solid #e74c3c; }
    
    .test-header {
      padding: 20px;
      background: #f8f9fa;
      cursor: pointer;
      user-select: none;
      transition: background 0.3s ease;
    }
    
    .test-header:hover {
      background: #e9ecef;
    }
    
    .test-name { 
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 10px;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .test-status { 
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      color: white;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .status-passed { background: #27ae60; }
    .status-failed { background: #e74c3c; }
    
    .test-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      background: #3498db;
      color: white;
    }
    
    .test-body {
      padding: 20px;
      display: none;
    }
    
    .test-body.expanded {
      display: block;
      animation: slideDown 0.3s ease;
    }
    
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .error-message { 
      background: linear-gradient(135deg, #ffe6e6 0%, #ffcccc 100%);
      padding: 20px;
      border-radius: 8px;
      margin: 15px 0;
      color: #c0392b;
      font-family: 'Courier New', monospace;
      border-left: 4px solid #e74c3c;
      font-size: 14px;
      line-height: 1.6;
    }
    
    .error-message strong {
      display: block;
      margin-bottom: 10px;
      color: #e74c3c;
      font-size: 16px;
    }
    
    .screenshots { 
      margin-top: 20px;
    }
    
    .screenshot-section {
      margin-bottom: 30px;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
    }
    
    .screenshot-section h3 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 15px;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    /* Timeline view for submit steps */
    .screenshot-timeline {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .screenshot-step {
      display: grid;
      grid-template-columns: 80px 1fr 300px 120px;
      gap: 15px;
      align-items: center;
      padding: 15px;
      background: white;
      border-radius: 8px;
      border-left: 4px solid #3498db;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
    }
    
    .screenshot-step:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      transform: translateX(5px);
    }
    
    .step-badge {
      background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-align: center;
      white-space: nowrap;
    }
    
    .step-name {
      font-weight: 600;
      color: #2c3e50;
      font-size: 14px;
    }
    
    .screenshot-step img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 6px;
      cursor: pointer;
      transition: transform 0.2s;
      border: 2px solid #dee2e6;
    }
    
    .screenshot-step img:hover {
      transform: scale(1.05);
      border-color: #3498db;
    }
    
    .step-time {
      color: #7f8c8d;
      font-size: 13px;
      text-align: right;
      white-space: nowrap;
    }
    
    /* Grid view for regular screenshots */
    .screenshot-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 15px;
      margin-top: 10px;
    }
    
    .screenshot-item {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      background: white;
      border: 2px solid #dee2e6;
      transition: all 0.3s ease;
      cursor: pointer;
    }
    
    .screenshot-item:hover {
      transform: scale(1.02);
      border-color: #3498db;
      box-shadow: 0 5px 20px rgba(52, 152, 219, 0.3);
    }
    
    .screenshot-item img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      display: block;
    }
    
    .screenshot-label {
      padding: 10px;
      background: white;
      font-size: 13px;
      color: #495057;
      font-weight: 500;
      text-align: center;
      border-top: 1px solid #dee2e6;
    }
    
    .screenshot-actions {
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 5px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    .screenshot-item:hover .screenshot-actions,
    .screenshot-step:hover .screenshot-actions {
      opacity: 1;
    }
    
    .action-btn {
      padding: 8px 12px;
      background: rgba(255,255,255,0.95);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    
    .action-btn:hover {
      background: white;
      transform: scale(1.05);
    }
    
    .action-btn.copy {
      color: #3498db;
    }
    
    .action-btn.view {
      color: #27ae60;
    }
    
    .indent { margin-left: 20px; }
    
    .collapse-icon {
      display: inline-block;
      transition: transform 0.3s ease;
      font-size: 14px;
      color: #7f8c8d;
    }
    
    .test-header.expanded .collapse-icon {
      transform: rotate(90deg);
    }
    
    /* Modal for full-size image */
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .modal-content {
      position: relative;
      margin: 2% auto;
      max-width: 95%;
      max-height: 95vh;
      animation: zoomIn 0.3s ease;
    }
    
    @keyframes zoomIn {
      from { transform: scale(0.7); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    .modal-content img {
      width: 100%;
      height: auto;
      border-radius: 8px;
    }
    
    .modal-close {
      position: absolute;
      top: 20px;
      right: 35px;
      color: white;
      font-size: 40px;
      font-weight: bold;
      cursor: pointer;
      transition: color 0.3s ease;
    }
    
    .modal-close:hover {
      color: #3498db;
    }
    
    .toast {
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: #27ae60;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: none;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      animation: slideInRight 0.3s ease;
      z-index: 2000;
    }
    
    @keyframes slideInRight {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    .toast.show {
      display: flex;
    }
    
    @media (max-width: 768px) {
      .summary { grid-template-columns: 1fr; }
      .screenshot-grid { grid-template-columns: 1fr; }
      .screenshot-timeline { grid-template-columns: 1fr; }
      .screenshot-step {
        grid-template-columns: 1fr;
        text-align: center;
      }
      .step-time {
        text-align: center;
      }
      .header h1 { font-size: 28px; }
      .content { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-content">
        <h1>
          <span class="header-icon">${report.failed === 0 ? "✅" : report.passed > report.failed ? "⚠️" : "❌"}</span>
          Test Execution Report
        </h1>
        <p class="timestamp">
          <span>🕒</span>
          <span>Executed: ${new Date(report.executionTime).toLocaleString()}</span>
        </p>
      </div>
    </div>
    
    <div class="content">
      <div class="summary">
        <div class="summary-card total">
          <h2>${report.totalTests}</h2>
          <p>Total Tests</p>
        </div>
        <div class="summary-card passed">
          <h2>${report.passed}</h2>
          <p>Passed ✓</p>
        </div>
        <div class="summary-card failed">
          <h2>${report.failed}</h2>
          <p>Failed ✗</p>
        </div>
        <div class="summary-card success-rate">
          <h2>${successRate}%</h2>
          <p>Success Rate</p>
        </div>
      </div>

      <h2 class="section-title">
        <span>📋</span>
        <span>Test Results</span>
      </h2>
      
      ${report.results
        .map((test, idx) => {
          const screenshotGroups = this.groupScreenshots(test.screenshots);

          return `
        <div class="test-result ${test.status}" style="margin-left: ${(test.hierarchyLevel || 0) * 20}px;">
          <div class="test-header" onclick="toggleTest(${idx})">
            <div class="test-name">
              <span class="collapse-icon">▶</span>
              <span>${test.name}</span>
              <span class="test-status status-${test.status}">${test.status}</span>
              ${test.skippedNavigation ? '<span class="test-badge">Continued on same page</span>' : ""}
            </div>
          </div>
          <div class="test-body" id="test-body-${idx}">
            ${
              test.error
                ? `
              <div class="error-message">
                <strong>❌ Error Details:</strong>
                ${test.error}
              </div>
            `
                : ""
            }
            
            ${
              test.screenshots.length > 0
                ? `
              <div class="screenshots">
                ${
                  screenshotGroups.submitSteps.length > 0
                    ? `
                  <div class="screenshot-section">
                    <h3>📍 Submit Process Steps (${screenshotGroups.submitSteps.length})</h3>
                    <div class="screenshot-timeline">
                      ${screenshotGroups.submitSteps
                        .map((ss, ssIdx) => {
                          const screenshotPath =
                            typeof ss === "string" ? ss : ss.path;
                          const stepName =
                            typeof ss === "object" && ss.step
                              ? ss.step
                              : `Step ${ssIdx + 1}`;
                          const timestamp =
                            typeof ss === "object" && ss.timestamp
                              ? new Date(ss.timestamp).toLocaleTimeString()
                              : "";

                          return `
                        <div class="screenshot-step">
                          <div class="step-badge">Step ${ssIdx + 1}</div>
                          <div class="step-name">${stepName}</div>
                          <div style="position: relative;">
                            <img src="${screenshotPath.replace(/\\/g, "/")}" 
                                 alt="${stepName}"
                                 onclick="viewImage('${screenshotPath.replace(/\\/g, "/")}')">
                            <div class="screenshot-actions">
                              <button class="action-btn copy" onclick="event.stopPropagation(); copyImagePath('${screenshotPath.replace(/\\/g, "/")}')">
                                📋 Copy
                              </button>
                              <button class="action-btn view" onclick="event.stopPropagation(); viewImage('${screenshotPath.replace(/\\/g, "/")}')">
                                🔍 View
                              </button>
                            </div>
                          </div>
                          <div class="step-time">${timestamp}</div>
                        </div>
                      `;
                        })
                        .join("")}
                    </div>
                  </div>
                `
                    : ""
                }
                
                ${
                  screenshotGroups.dialogs.length > 0
                    ? `
                  <div class="screenshot-section">
                    <h3>🔔 Dialog Screenshots (${screenshotGroups.dialogs.length})</h3>
                    <div class="screenshot-grid">
                      ${screenshotGroups.dialogs
                        .map((ss) => {
                          const screenshotPath =
                            typeof ss === "string" ? ss : ss.path;
                          const stage = this.getScreenshotStage(ss);
                          return `
                        <div class="screenshot-item" onclick="viewImage('${screenshotPath.replace(/\\/g, "/")}')">
                          <img src="${screenshotPath.replace(/\\/g, "/")}" alt="${stage}">
                          <div class="screenshot-label">${stage}</div>
                          <div class="screenshot-actions">
                            <button class="action-btn copy" onclick="event.stopPropagation(); copyImagePath('${screenshotPath.replace(/\\/g, "/")}')">
                              📋 Copy
                            </button>
                            <button class="action-btn view" onclick="event.stopPropagation(); viewImage('${screenshotPath.replace(/\\/g, "/")}')">
                              🔍 View
                            </button>
                          </div>
                        </div>
                      `;
                        })
                        .join("")}
                    </div>
                  </div>
                `
                    : ""
                }
                
                ${
                  screenshotGroups.regular.length > 0
                    ? `
                  <div class="screenshot-section">
                    <h3>📸 Other Screenshots (${screenshotGroups.regular.length})</h3>
                    <div class="screenshot-grid">
                      ${screenshotGroups.regular
                        .map((ss) => {
                          const screenshotPath =
                            typeof ss === "string" ? ss : ss.path;
                          const stage = this.getScreenshotStage(ss);
                          return `
                        <div class="screenshot-item" onclick="viewImage('${screenshotPath.replace(/\\/g, "/")}')">
                          <img src="${screenshotPath.replace(/\\/g, "/")}" alt="${stage}">
                          <div class="screenshot-label">${stage}</div>
                          <div class="screenshot-actions">
                            <button class="action-btn copy" onclick="event.stopPropagation(); copyImagePath('${screenshotPath.replace(/\\/g, "/")}')">
                              📋 Copy
                            </button>
                            <button class="action-btn view" onclick="event.stopPropagation(); viewImage('${screenshotPath.replace(/\\/g, "/")}')">
                              🔍 View
                            </button>
                          </div>
                        </div>
                      `;
                        })
                        .join("")}
                    </div>
                  </div>
                `
                    : ""
                }
              </div>
            `
                : ""
            }
          </div>
        </div>
      `;
        })
        .join("")}
    </div>
  </div>
  
  <!-- Image Modal -->
  <div id="imageModal" class="modal" onclick="closeModal()">
    <span class="modal-close" onclick="closeModal()">&times;</span>
    <div class="modal-content">
      <img id="modalImage" src="">
    </div>
  </div>
  
  <!-- Toast Notification -->
  <div id="toast" class="toast">
    <span>✓</span>
    <span id="toastMessage">Path copied to clipboard!</span>
  </div>

  <script>
    function toggleTest(idx) {
      const body = document.getElementById('test-body-' + idx);
      const header = body.previousElementSibling;
      
      if (body.classList.contains('expanded')) {
        body.classList.remove('expanded');
        header.classList.remove('expanded');
      } else {
        body.classList.add('expanded');
        header.classList.add('expanded');
      }
    }
    
    async function copyImagePath(path) {
      try {
        const response = await fetch(path);
        const blob = await response.blob();
        
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        
        showToast('Image copied to clipboard! You can paste it now.');
      } catch (err) {
        console.error('Failed to copy image:', err);
        
        try {
          const img = new Image();
img.crossOrigin = 'anonymous';
img.src = path;
await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          showToast('Image copied to clipboard!');
        } catch (e) {
          showToast('Failed to copy image. Please try viewing and copying manually.', 'error');
        }
      });
    } catch (fallbackErr) {
      showToast('Failed to copy image. Please try right-click > Copy Image.', 'error');
    }
  }
}

function viewImage(path) {
  const modal = document.getElementById('imageModal');
  const modalImg = document.getElementById('modalImage');
  modal.style.display = 'block';
  modalImg.src = path;
}

function closeModal() {
  const modal = document.getElementById('imageModal');
  modal.style.display = 'none';
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  
  if (type === 'error') {
    toast.style.background = '#e74c3c';
  } else {
    toast.style.background = '#27ae60';
  }
  
  toastMessage.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const failedTests = document.querySelectorAll('.test-result.failed');
  if (failedTests.length > 0) {
    const firstFailed = failedTests[0];
    const header = firstFailed.querySelector('.test-header');
    if (header) {
      header.click();
    }
  }
});

</script>
</body>
</html>`;
  }

  /**

Darkens a hex color for gradient effects
@param {string} color - Hex color code
@returns {string} Darkened hex color
*/
  darkenColor(color) {
    const hex = color.replace("#", "");
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 30);
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 30);
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 30);
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
}

module.exports = ReportGenerator;
