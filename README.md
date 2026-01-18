# Web Automation Test Engine

A robust, configurable web automation testing tool that executes YAML-based test scenarios on Microsoft Edge browser with session state preservation, screenshot capture, and comprehensive result validation.

## ✨ Key Features

✅ **YAML-Based Test Scenarios** - Simple, readable test configuration  
✅ **Pre-Execution Validation** - Catch configuration errors before running tests  
✅ **Hierarchical Test Organization** - Parent-child test dependencies  
✅ **Session State Preservation** - Cookies and storage maintained across tests  
✅ **Configurable Screenshots** - Capture at key points and failures  
✅ **Comprehensive Reporting** - HTML & JSON test reports  
✅ **Detailed Logging** - Full execution visibility  
✅ **Microsoft Edge Support** - Real browser automation

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Usage](#usage)
- [Examples](#examples)
- [Configuration](#configuration)

## 🚀 Installation

### Prerequisites

- **Node.js** 16.x or higher
- **Microsoft Edge** browser installed

### Setup

```bash
# 1. Clone or download the project
cd automation_test

# 2. Install dependencies
npm install

# 3. Install Microsoft Edge for Playwright
npm run install-browsers
# or manually: npx playwright install msedge
```

## ⚡ Quick Start

### 1. Create a Simple Test Scenario

Create `my-first-test.yaml`:

```yaml
test_name: "My First Test"
url: "http://example.com"

steps:
  - input:
      field: username
      value: "testuser"
  
  - input:
      field: password
      value: "password123"

submit:
  button: loginButton
  wait_after: 2000ms

verify:
  - message: "Welcome!"
```

### 2. Run the Test

```bash
node test-engine.js ./config.yaml ./my-first-test.yaml
```

### 3. View Results

- **Console**: Real-time execution logs
- **HTML Report**: `screenshots/test-report.html`
- **JSON Report**: `screenshots/test-report.json`
- **Screenshots**: `screenshots/successes/` and `screenshots/failures/`

## 📁 Project Structure

```
automation_test/
├── src/                          # Source code
│   ├── core/                     # Core engine modules
│   │   ├── test-engine.js        # Main orchestrator
│   │   ├── browser-manager.js    # Browser lifecycle
│   │   └── test-executor.js      # Test execution logic
│   ├── actions/                  # Action handlers
│   │   └── action-handler.js     # All form interactions
│   ├── parsers/                  # YAML parsers
│   │   ├── yaml-list-parser.js   # Test list parsing
│   │   └── yaml-test-parser.js   # Scenario parsing
│   ├── validators/               # Validation
│   │   └── yaml-validator.js     # Pre-execution validation
│   ├── reporting/                # Reports
│   │   └── report-generator.js   # HTML/JSON reports
│   └── utils/                    # Utilities
│       ├── logger.js             # Logging
│       ├── config-loader.js      # Configuration
│       └── directory-manager.js  # File system ops
├── examples/                     # Sample YAML files
│   ├── simple-login.yaml         # Beginner example
│   ├── comprehensive-scenario.yaml # All features
│   └── hierarchical-tests.yaml   # Test organization
├── tests/                        # Your test scenarios
│   ├── scenarios/                # Individual test files
│   └── test-lists/               # Hierarchical test lists
├── docs/                         # Documentation
├── screenshots/                  # Test screenshots
├── test-engine.js                # CLI entry point
├── config.yaml                   # Configuration
└── package.json
```

## 📚 Documentation

- **[Quick Start Guide](docs/quick-start-guide.md)** - Get started in 5 minutes
- **[Action Types Reference](docs/action-types-reference.md)** - All supported actions
- **[Hierarchical Testing Guide](docs/hierarchical-testing-guide.md)** - Organize complex tests
- **[YAML Best Practices](docs/yaml-best-practices.md)** - Write better tests
- **[Performance Guide](docs/performance-optimization-guide.md)** - Faster test execution

## 💻 Usage

### Run a Single Test Scenario

```bash
node test-engine.js ./config.yaml ./tests/scenarios/login.yaml
```

### Run a Test List (Hierarchical)

```bash
node test-engine.js ./config.yaml ./tests/test-lists/regression.yaml
```

### Using NPM Scripts

```bash
# Run default test list
npm test

# Or custom command
npm run test-list
```

## 📝 Examples

### Simple Login Test

```yaml
test_name: "Login Test"
url: "http://example.com/login"

steps:
  - input: { field: username, value: "admin" }
  - input: { field: password, value: "pass123" }

submit:
  button: loginBtn
  wait_for_navigation: true

verify:
  - message: "Welcome, admin!"
```

### Comprehensive Test (All Features)

See [examples/comprehensive-scenario.yaml](examples/comprehensive-scenario.yaml) for a complete reference covering:
- All action types (input, click, checkbox, radio, select)
- Multiple selector strategies (id, name, css, xpath)
- Various verification methods
- Wait configurations

### Hierarchical Test Organization

See [examples/hierarchical-tests.yaml](examples/hierarchical-tests.yaml) for patterns like:
- Parent-child test dependencies
- Test reuse
- Multi-level hierarchies

## ⚙️ Configuration

Edit `config.yaml` to customize:

### Browser Settings

```yaml
browser:
  headless: false                 # Show browser window
  baseUrl: "http://localhost:3000"  # Default URL
  viewport:
    width: 1280
    height: 720
```

### Execution Settings

```yaml
execution:
  actionTimeout: 30000            # Action timeout (ms)
  navigationTimeout: 30000        # Navigation timeout (ms)
  pageLoadWait: 1000             # Wait after page load (ms)
  stepDelay: 500                 # Delay between steps (ms)
  stopOnFailure: false           # Continue after failures
```

### Screenshot Settings

```yaml
screenshots:
  enabled: true
  fullPage: true
  captureBeforeSubmit: true
  captureAfterSubmit: true
  captureOnFailure: true
  cleanupBeforeRun: true
  outputPath: ./screenshots/successes
  failurePath: ./screenshots/failures
```

## 🎯 Supported Actions

| Action | Purpose | Example |
|--------|---------|---------|
| `input` | Fill text fields | `field: username, value: "admin"` |
| `click` | Click buttons/links | `button: submitBtn` |
| `checkbox` | Check/uncheck boxes | `field: agree, value: true` |
| `radio` | Select radio button | `id: optionA` |
| `select` | Choose from dropdown | `field: country, value: "US"` |

See [Action Types Reference](docs/action-types-reference.md) for complete details.

## ✅ YAML Validation

Tests are automatically validated before execution. Common errors caught:
- Missing required fields
- Invalid action types
- Malformed selectors
- Wrong data types
- Empty steps arrays

Validation runs **before** browser initialization, saving time.

## 🧪 Test Results

### Console Output
Real-time colored logs with test progress and status.

### HTML Report
Visual report with pass/fail summary, screenshots, and error details.  
Location: `screenshots/test-report.html`

### JSON Report
Machine-readable results for CI/CD integration.  
Location: `screenshots/test-report.json`

## 🤝 Best Practices

1. **Start Simple** - Use `examples/simple-login.yaml` as a template
2. **Validate Early** - Run tests to catch YAML errors immediately
3. **Use IDs** - Prefer ID selectors for stability
4. **Organize Hierarchically** - Group related tests in lists
5. **Add Comments** - Document complex test logic
6. **Review Screenshots** - Debug failures visually
7. **Check Reports** - Use HTML reports for quick analysis

## 🐛 Troubleshooting

### Browser Not Found
```bash
npx playwright install msedge
```

### Validation Errors
Check the error message - it points to the specific field and issue.

### Element Not Found
- Verify selector in browser dev tools
- Increase `actionTimeout` in config
- Check if element is in iframe

### Tests Run But Fail
- Review failure screenshots in `screenshots/failures/`
- Check HTML report for detailed error messages
- Verify target application is running

## 📄 License

MIT

## 🙋 Support

For issues or questions:
1. Check the [documentation](docs/)
2. Review [examples](examples/)
3. Examine failure screenshots
4. Check console logs

---

**Ready to automate?** Start with `examples/simple-login.yaml` and customize for your needs!
