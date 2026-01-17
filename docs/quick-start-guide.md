# Quick Start Guide

Get up and running with the Web Automation Test Engine in 5 minutes.

## 1. Installation (2 minutes)

```bash
# Clone or create project directory
mkdir web-automation-test-engine
cd web-automation-test-engine

# Install dependencies
npm install

# Install Edge browser
npx playwright install msedge
```

## 2. Create Your First Test (1 minute)

Create `tests/my-first-test.json`:

```json
[
  {
    "name": "Google Search Test",
    "url": "https://www.google.com",
    "steps": [
      {
        "type": "input",
        "selector": { "by": "name", "value": "q" },
        "value": "Playwright automation"
      }
    ],
    "submit": {
      "step": {
        "type": "click",
        "selector": { "by": "name", "value": "btnK" }
      },
      "waitForNavigation": true,
      "postSubmitWait": 2000
    },
    "assertion": {
      "selector": { "by": "id", "value": "result-stats" },
      "expectedText": "results"
    }
  }
]
```

## 3. Configure (1 minute)

Create `config.yaml`:

```yaml
browser:
  headless: false
  baseUrl: "https://www.google.com"
  viewport:
    width: 1280
    height: 720

execution:
  actionTimeout: 30000
  navigationTimeout: 30000
  stepDelay: 500
  stopOnFailure: false

screenshots:
  enabled: true
  fullPage: true
  captureBeforeSubmit: true
  captureAfterSubmit: true
  captureOnFailure: true
  cleanupBeforeRun: true
  outputPath: ./screenshots
  failurePath: ./screenshots/failures

logging:
  level: info
```

## 4. Run Your Test (1 minute)

```bash
node test-engine.js ./config.yaml ./tests/my-first-test.json
```

## 5. View Results

Open `./screenshots/test-report.html` in your browser to see:

- ? Test results
- ? Screenshots
- ? Execution summary

## What's Next?

### Try Different Actions

```json
{
  "steps": [
    { "type": "input", "selector": {...}, "value": "text" },
    { "type": "click", "selector": {...} },
    { "type": "checkbox", "selector": {...}, "value": true },
    { "type": "radio", "selector": {...}, "value": "option1" },
    { "type": "select", "selector": {...}, "value": "US", "selectBy": "value" }
  ]
}
```

### Create Hierarchical Tests

Create `test-list.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testList>
  <test name="Login" file="tests/login.json">
    <test name="Dashboard" file="tests/dashboard.json" />
  </test>
</testList>
```

Run with:

```bash
node test-engine.js ./config.yaml ./test-list.xml
```

### Optimize for Speed

Edit `config.yaml`:

```yaml
browser:
  headless: true

execution:
  stepDelay: 0

screenshots:
  captureBeforeSubmit: false
  captureAfterSubmit: false
```

This makes tests run **50-70% faster**!

## Common Use Cases

### Test a Login Form

```json
{
  "name": "Login Test",
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
      "value": "password123"
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
    "selector": { "by": "id", "value": "welcomeMsg" },
    "expectedText": "Welcome, admin!"
  }
}
```

### Test a Registration Form with Multiple Field Types

```json
{
  "name": "User Registration",
  "url": "http://localhost:3000/register",
  "steps": [
    {
      "type": "input",
      "selector": { "by": "id", "value": "email" },
      "value": "user@test.com"
    },
    {
      "type": "input",
      "selector": { "by": "id", "value": "password" },
      "value": "Pass123!"
    },
    {
      "type": "radio",
      "selector": { "by": "id", "value": "genderMale" },
      "value": "male"
    },
    {
      "type": "select",
      "selector": { "by": "id", "value": "country" },
      "value": "US",
      "selectBy": "value"
    },
    {
      "type": "checkbox",
      "selector": { "by": "id", "value": "terms" },
      "value": true
    }
  ],
  "submit": {
    "step": {
      "type": "click",
      "selector": { "by": "id", "value": "registerBtn" }
    },
    "waitForNavigation": true,
    "postSubmitWait": 2000
  },
  "assertion": {
    "selector": { "by": "id", "value": "successMsg" },
    "expectedText": "Registration successful"
  }
}
```

### Test a Multi-Step Flow

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testList>
  <test name="Login" file="tests/login.json">
    <test name="Add to Cart" file="tests/add-cart.json">
      <test name="Checkout" file="tests/checkout.json">
        <test name="Payment" file="tests/payment.json" />
      </test>
    </test>
  </test>
</testList>
```

Each test continues on the same page - no reloads between steps!

## Troubleshooting

### "Browser not found"

```bash
npx playwright install msedge
```

### "Element not found"

- Increase timeout in config: `actionTimeout: 60000`
- Check selector is correct
- Ensure page is fully loaded

### Tests are slow

- Set `stepDelay: 0`
- Use `headless: true`
- Disable unnecessary screenshots
- See [Performance Guide](performance-optimization-guide.md)

### Page reload issues

Add `waitForNavigation: true` to the action:

```json
{
  "type": "checkbox",
  "selector": { "by": "id", "value": "myCheckbox" },
  "value": true,
  "waitForNavigation": true,
  "postNavigationWait": 1000
}
```

## Tips

1. **Start Simple**: Begin with one test, then expand
2. **Use IDs**: `id` selectors are fastest and most reliable
3. **Check Screenshots**: They help debug issues quickly
4. **Read Logs**: Console output shows exactly what's happening
5. **Test Incrementally**: Add one step at a time

## Getting Help

- Read the [Action Types Reference](action-types-reference.md)
- Check the [Hierarchical Testing Guide](hierarchical-testing-guide.md)
- Review example tests in the `tests/` directory
- Look at screenshots in `./screenshots/` after runs

## Ready to Go!

You now have everything you need to:

- ? Write automated tests
- ? Test forms with all input types
- ? Create complex test workflows
- ? Run tests fast and efficiently

Happy testing! ?
