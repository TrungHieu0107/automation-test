# Web Automation Test Engine

A robust, configurable web automation testing tool that executes automated test scenarios on Microsoft Edge browser with session state preservation, screenshot capture, and result validation.

## Project Structure

```
web-automation-test-engine/
├── lib/
│   ├── action-handler.js      # Handles all test actions (input, click, radio, select, etc.)
│   ├── logger.js               # Logging utilities
│   ├── xml-parser.js           # XML test list parser
│   └── report-generator.js    # HTML/JSON report generation
├── tests/
│   ├── login.json              # Example test scenarios
│   ├── registration.json
│   ├── profile-setup.json
│   └── form-examples.json      # Radio and select examples
├── screenshots/                # Test screenshots
│   └── failures/               # Failure screenshots
├── test-engine.js              # Main test engine (refactored)
├── config.yaml                 # Configuration file
├── test-list.xml               # Hierarchical test configuration (optional)
├── test-scenarios.json         # Sequential test scenarios (optional)
└── package.json                # Dependencies
```

## Code Architecture

The test engine is now modular and optimized for performance:

- **test-engine.js**: Main orchestrator (clean, focused)
- **action-handler.js**: All form interactions (input, click, checkbox, radio, select)
- **logger.js**: Centralized logging
- **xml-parser.js**: XML parsing for hierarchical tests
- **report-generator.js**: Report generation logic

This separation makes the code:
- ✅ Easier to maintain
- ✅ Faster to extend
- ✅ More testable
- ✅ Cleaner to read

✅ **Microsoft Edge Browser Support** - All tests run on real Edge browser  
✅ **Session State Preservation** - Cookies, localStorage, and sessionStorage maintained across page reloads  
✅ **Hierarchical Test Execution** - XML-based test organization with parent-child dependencies  
✅ **Conditional Test Flow** - Child tests execute only when parent tests pass  
✅ **Configurable Screenshots** - Capture screenshots before/after submission and on failures  
✅ **Sequential Test Execution** - Tests run in defined order with step tracking  
✅ **Flexible Assertions** - Validate page content after navigation  
✅ **Detailed Logging** - Comprehensive logs for debugging and monitoring  
✅ **HTML & JSON Reports** - Visual and structured test reports  
✅ **Automatic Cleanup** - Remove old results before each run  

## Installation

### Prerequisites

- Node.js 16.x or higher
- Microsoft Edge browser installed

### Setup

1. **Create project structure:**

```bash
mkdir web-automation-test-engine
cd web-automation-test-engine
mkdir lib tests screenshots
```

2. **Install dependencies:**

```bash
npm install
```

3. **Install Microsoft Edge for Playwright:**

```bash
npm run install-browsers
```

Or manually:

```bash
npx playwright install msedge
```

4. **Copy the provided files:**
   - `test-engine.js` (main file)
   - `config.yaml`
   - `lib/action-handler.js`
   - `lib/logger.js`
   - `lib/xml-parser.js`
   - `lib/report-generator.js`
   - Sample test files in `tests/` directory

## Documentation

- **[Action Types Reference](action-types-reference.md)** - Complete guide to all supported actions (input, click, radio, select, checkbox)
- **[Hierarchical Testing Guide](hierarchical-testing-guide.md)** - XML-based test organization and dependencies
- **[Performance Optimization Guide](performance-optimization-guide.md)** - Make your tests run 50-70% faster

## Configuration

The application uses a YAML configuration file (`config.yaml`) to control behavior:

### Browser Settings

```yaml
browser:
  headless: false          # Run with visible browser
  baseUrl: 'http://localhost:3000'  # Default URL to navigate to
  viewport:
    width: 1280
    height: 720
  args:
    - '--start-maximized'
```

### Execution Settings

```yaml
execution:
  actionTimeout: 30000           # Timeout for actions (ms)
  navigationTimeout: 30000       # Timeout for navigation (ms)
  pageLoadWait: 1000            # Wait after page load (ms)
  childTestDelay: 500           # Wait before child test starts (ms)
  stepDelay: 500                 # Delay between steps (ms)
  stopOnFailure: false           # Continue after failures
  stopOnChildFailure: false      # Continue siblings after child failure
  maxRetries: 3                  # Retry failed actions
```

### Screenshot Settings

```yaml
screenshots:
  enabled: true
  fullPage: true
  captureBeforeSubmit: true
  captureAfterSubmit: true
  captureOnFailure: true
  cleanupBeforeRun: true        # Remove old screenshots before test run
  outputPath: ./screenshots
  failurePath: ./screenshots/failures
```

## Test Scenarios

### JSON Format (Sequential Tests)

Test scenarios are defined in JSON format for simple sequential execution. Each test case contains:

- **name**: Test identifier
- **url** (optional): Specific URL to navigate to (overrides baseUrl from config)
- **steps**: Array of actions to perform
- **submit**: Form submission action with navigation handling
- **assertion**: Validation after page load

### XML Format (Hierarchical Tests)

For complex test workflows with dependencies, use XML configuration:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testList>
    <test name="Parent Test" file="tests/parent.json">
        <test name="Child Test" file="tests/child.json" />
    </test>
</testList>
```

**Key Features:**
- Child tests execute ONLY if parent tests pass
- Supports unlimited nesting levels
- Organizes complex test workflows
- Maintains session state across entire hierarchy

See [Hierarchical Testing Guide](hierarchical-testing-guide.md) for detailed documentation.

### Supported Actions

#### Input Action
```json
{
  "type": "input",
  "selector": { "by": "id", "value": "username" },
  "value": "admin"
}
```

#### Click Action
```json
{
  "type": "click",
  "selector": { "by": "id", "value": "submitButton" }
}
```

#### Checkbox Action
```json
{
  "type": "checkbox",
  "selector": { "by": "id", "value": "agreeTerms" },
  "value": true
}
```

#### Radio Button Action
```json
{
  "type": "radio",
  "selector": { "by": "id", "value": "genderMale" },
  "value": "male",
  "verifyValue": true
}
```

#### Select/Dropdown Action
```json
{
  "type": "select",
  "selector": { "by": "id", "value": "country" },
  "value": "US",
  "selectBy": "value",
  "verifyValue": true
}
```

**Select Options:**
- `selectBy: "value"` - Select by option value
- `selectBy: "label"` - Select by visible text
- `selectBy: "index"` - Select by index position

See [Action Types Reference](action-types-reference.md) for complete documentation.

### Selector Types

- `id`: Find element by ID attribute
- `name`: Find element by name attribute
- `css`: Find element by CSS selector
- `xpath`: Find element by XPath expression

### Submit Action Structure

```json
"submit": {
  "step": {
    "type": "click",
    "selector": { "by": "id", "value": "loginBtn" }
  },
  "waitForNavigation": true,
  "postSubmitWait": 2000
}
```

### Assertion Structure

```json
"assertion": {
  "selector": { "by": "id", "value": "welcomeMessage" },
  "expectedText": "Welcome"
}
```

## Usage

### Basic Execution (JSON)

Run tests with default configuration using JSON test scenarios:

```bash
npm test
```

Or:

```bash
node test-engine.js
```

### Hierarchical Tests (XML)

Run tests with XML-based hierarchical configuration:

```bash
node test-engine.js ./config.yaml ./test-list.xml
```

### Custom Configuration

Specify custom config and scenario files:

```bash
# JSON format
node test-engine.js ./custom-config.yaml ./custom-scenarios.json

# XML format  
node test-engine.js ./custom-config.yaml ./custom-test-list.xml
```

### Command Line Arguments

- **Argument 1**: Path to configuration file (default: `./config.yaml`)
- **Argument 2**: Path to test scenarios file - JSON or XML (default: `./test-scenarios.json`)

## Output

### Screenshots

Screenshots are automatically saved to configured directories:

- **Regular screenshots**: `./screenshots/`
- **Failure screenshots**: `./screenshots/failures/`

Filename format: `TestName_stage_timestamp.png`

Example: `Login_Test_after-submit_2024-01-15T10-30-45-123Z.png`

### Test Reports

A JSON report is generated after test execution:

**Location**: `./screenshots/test-report.json`

**Format**:
```json
{
  "executionTime": "2024-01-15T10:30:00.000Z",
  "totalTests": 3,
  "passed": 2,
  "failed": 1,
  "results": [
    {
      "name": "Login Test",
      "status": "passed",
      "steps": [...],
      "screenshots": [...]
    }
  ]
}
```

An HTML report is also generated for easy viewing:

**Location**: `./screenshots/test-report.html`

Open the HTML report in your browser to see:
- Visual summary with pass/fail counts
- Detailed results for each test
- Error messages for failed tests
- Clickable links to screenshots

## Example Test Scenario

```json
[
  {
    "name": "Login Test - Valid Credentials",
    "url": "http://localhost:3000/login",
    "steps": [
      {
        "type": "input",
        "selector": { "by": "id", "value": "username" },
        "value": "admin"
      },
      {
        "type": "input",
        "selector": { "by": "id", "value": "password" },
        "value": "123456"
      }
    ],
    "submit": {
      "step": {
        "type": "click",
        "selector": { "by": "id", "value": "loginBtn" }
      },
      "waitForNavigation": true,
      "postSubmitWait": 2000
    },
    "assertion": {
      "selector": { "by": "id", "value": "welcomeMessage" },
      "expectedText": "Welcome, admin!"
    }
  }
]
```

## How It Works

1. **Initialization**: Launches Microsoft Edge with configured options
2. **Cleanup** (optional): Removes old screenshots and reports if `cleanupBeforeRun: true`
3. **Test Loading**: Reads test scenarios from JSON file
4. **Sequential Execution**: Runs tests one by one in order
5. **Page Navigation**: Navigates to test URL (from test scenario or baseUrl in config)
6. **Step Execution**: Performs each action (input, click, checkbox) on the page
7. **Navigation Handling**: Automatically waits for page reloads triggered by checkboxes or clicks
8. **Screenshot Capture**: Takes screenshots at configured points
9. **Form Submission**: Clicks submit button and waits for navigation
10. **Assertion Validation**: Verifies expected content after page load
11. **Report Generation**: Creates JSON and HTML reports with all results

## Session State Preservation

The test engine maintains a single browser context throughout execution:

- ✅ Cookies persist across tests and page reloads
- ✅ localStorage data retained after navigation
- ✅ sessionStorage maintained through reloads
- ✅ Authentication state preserved
- ✅ Page reloads from checkboxes or clicks don't interrupt flow
- ✅ Form data persists when expected

## Error Handling

### On Test Failure

- Screenshot captured automatically
- Error details logged to console
- Test marked as failed in report
- Execution continues (unless `stopOnFailure: true`)

### Timeouts

- Action timeout: 30 seconds (configurable)
- Navigation timeout: 30 seconds (configurable)
- Element wait: Automatically waits for visibility

## Extensibility

The architecture supports easy addition of new action types:

### Adding New Actions

1. Add new step type to test scenario
2. Implement handler in `executeStep()` method
3. Update documentation

### Potential Extensions

- `select`: Dropdown selection
- `hover`: Mouse hover actions
- `wait`: Explicit wait conditions
- `scroll`: Page scrolling
- `upload`: File upload handling
- `drag`: Drag and drop operations
- `radio`: Radio button selection

## Troubleshooting

### Browser Not Found

```bash
# Reinstall Microsoft Edge for Playwright
npx playwright install msedge
```

### Element Not Found

- Check selector values in test scenarios
- Increase `actionTimeout` in config
- Verify page is fully loaded before assertion

### Navigation Timeout

- Increase `navigationTimeout` in config
- Check network connectivity
- Verify target URL is accessible

## Best Practices

1. **Use Unique Selectors**: Prefer IDs over names when possible
2. **Add Post-Submit Waits**: Allow time for page rendering
3. **Enable Full Page Screenshots**: Capture complete page context
4. **Test Incrementally**: Start with simple scenarios
5. **Review Failure Screenshots**: Debug issues visually
6. **Monitor Logs**: Check console output for detailed information

## License

MIT

## Support

For issues, questions, or contributions, please refer to the project repository.