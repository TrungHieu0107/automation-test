# YAML Best Practices for Test Automation

This guide provides best practices for writing clean, maintainable, and reliable YAML test scenarios.

## 🎯 File Organization

### Naming Conventions

```yaml
# ✅ GOOD: Descriptive, lowercase with hyphens
# user-login-success.yaml
# product-search-filters.yaml
# checkout-flow-guest.yaml

# ❌ BAD: Unclear or inconsistent
# test1.yaml
# MyTest.yaml
# TestUserLogin.yaml
```

### Directory Structure

```bash
tests/
├── scenarios/          # Individual test scenarios
│   ├── login/
│   │   ├── login-success.yaml
│   │   ├── login-invalid-password.yaml
│   │   └── login-locked-account.yaml
│   └── checkout/
│       ├── checkout-guest.yaml
│       └── checkout-registered.yaml
└── test-lists/         # Hierarchical test groups
    ├── smoke-tests.yaml
    ├── regression.yaml
    └── nightly.yaml
```

## 📝 Writing Clear Test Scenarios

### 1. Use Descriptive Names

```yaml
# ✅ GOOD
test_name: "User Registration - Valid Email and Strong Password"

# ❌ BAD
test_name: "Test 1"
```

### 2. Add Comments for Complex Logic

```yaml
steps:
  # Fill in required fields
 - input: { field: email, value: "user@example.com" }
  
  # Check opt-in for marketing emails (required for promo code)
  - checkbox: { field: marketing, value: true }
  
  # Select country - triggers state dropdown population
  - select: { field: country, value: "US", select_by: value }
```

### 3. Group Related Actions

```yaml
# ✅ GOOD: Logical grouping
steps:
  # Personal Information
  - input: { field: firstName, value: "John" }
  - input: { field: lastName, value: "Doe" }
  
  # Contact Details
  - input: { field: email, value: "john@example.com" }
  - input: { field: phone, value: "555-0100" }
  
  # Account Security
  - input: { field: password, value: "SecurePass123!" }
  - input: { field: confirmPassword, value: "SecurePass123!" }
```

## 🎪 Selector Strategies

### Priority Order

1. **ID** (fastest, most stable)
2. **Name** (good for form elements)
3. **CSS** (flexible, readable)
4. **XPath** (last resort, fragile)

### Examples

```yaml
# 1. ✅ BEST: Use ID when available
- input:
    selector: { by: id, value: usernameInput }
    value: "admin"

# 2. ✅ GOOD: Use name for form elements
- input:
    field: username  # Automatically uses 'name' attribute
    value: "admin"

# 3. ✅ OK: CSS for complex selections
- click:
    selector: { by: css, value: "button[data-test='submit']" }

# 4. ⚠️ AVOID: XPath (brittle, hard to maintain)
- click:
    selector: { by: xpath, value: "//div[@class='container']/button[1]" }
```

### Smart Selector Detection

The parser auto-detects selector types:

```yaml
# These are all valid:
field: username           # Treated as name selector
field: "#user-id"         # Auto-detected as CSS
field: "//input[@id='x']" # Auto-detected as XPath
```

## ⏱️ Wait Strategies

### Use Appropriate Waits

```yaml
# ✅ GOOD: Wait after slow operations
submit:
  button: saveButton
  wait_after: 2000ms       # 2 seconds for server processing

# ✅ GOOD: Wait for navigation
submit:
  button: loginButton
  wait_for_navigation: true  # Wait for page reload

# ❌ BAD: Arbitrary long waits
submit:
  button: quickAction
  wait_after: 10000ms      # Unnecessarily long
```

### Wait Time Formats

```yaml
# Both formats supported:
wait_after: 2000         # Milliseconds (number)
wait_after: 2000ms       # Milliseconds (string)
wait_after: 2s           # Seconds (string)
```

## ✅ Verification Best Practices

### 1. Verify Critical Assertions Only

```yaml
# ✅ GOOD: Check key success indicators
verify:
  - message: "Order confirmed"
  - input_value: { field: orderNumber, equals: "ORD-12345" }

# ❌ BAD: Over-verification slows tests
verify:
  - message: "Order confirmed"
  - visible: logo
  - visible: header
  - visible: footer
  - has_class: { element: body, class: success }
  # ... too many checks
```

### 2. Use Appropriate Assertion Types

```yaml
verify:
  # Text content
  - message: "Welcome back!"
  
  # Input values
  - input_value: { field: displayName, equals: "John Doe" }
  
  # Visibility
  - visible: successBanner
  - hidden: errorMessage
  
  # Styles
  - style: { element: statusIcon, color: green }
  
  # Attributes
  - attribute: { element: submitBtn, name: disabled, value: "true" }
```

## 🏗️ Hierarchical Test Organization

### Pattern 1: Linear Flow

```yaml
# Good for: Multi-step workflows
tests:
  - tests/scenarios/login.yaml
  - tests/scenarios/add-to-cart.yaml
  - tests/scenarios/checkout.yaml
  - tests/scenarios/confirm-order.yaml
```

### Pattern 2: Parent-Child Dependencies

```yaml
# Good for: Tests that build on each other
tests:
  - tests/scenarios/login.yaml:
      - tests/scenarios/view-profile.yaml
      - tests/scenarios/edit-settings.yaml
      - tests/scenarios/logout.yaml
```

### Pattern 3: Test Suites

```yaml
# Good for: Organizing by feature
tests:
  # Authentication Tests
  - file: tests/scenarios/login.yaml
    name: "Login - Valid Credentials"
  
  - file: tests/scenarios/login-invalid.yaml
    name: "Login - Invalid Password"
  
  # Profile Tests
  - tests/scenarios/login.yaml:
      - file: tests/scenarios/edit-profile.yaml
        name: "Edit Profile Information"
```

## 🚀 Performance Tips

### 1. Minimize Waits

```yaml
# ✅ GOOD: Only wait when necessary
submit:
  button: fastAction
  # No wait_after - proceeds immediately

# ❌ BAD: Unnecessary waits slow tests
submit:
  button: fastAction
  wait_after: 3000ms
```

### 2. Reuse Test Scenarios

```yaml
# ✅ GOOD: Reuse common scenarios
tests:
  - tests/scenarios/login.yaml  # Login once
  - tests/scenarios/action-a.yaml:
      - tests/scenarios/action-b.yaml
      - tests/scenarios/action-c.yaml
```

### 3. Use stopOnFailure Wisely

```yaml
# config.yaml
execution:
  stopOnFailure: false          # Continue through test suite
  stopOnChildFailure: true      # Stop siblings if child fails
```

## 🎨 YAML Syntax Tips

### Compact vs Expanded Format

```yaml
# Both are valid - use what's most readable

# Compact (good for simple actions)
- input: { field: username, value: "admin" }

# Expanded (good for complex actions)
- input:
    field: username
    value: "admin"
    waitForNavigation: false

# Mixed (balance readability and brevity)
steps:
  - input: { field: email, value: "user@example.com" }
  - select:
      field: country
      value: "US"
      select_by: value
      verify: true
```

### String Quoting

```yaml
# Quote when necessary:
value: "123"           # Numbers as strings
value: "true"          # Booleans as strings
value: "user@example"  # Special characters
value: "Line 1\nLine 2"  # Escape sequences

# No quotes needed:
value: admin           # Simple strings
value: 123             # Numbers
value: true            # Boolean
```

## ⚠️ Common Mistakes to Avoid

### 1. Missing Required Fields

```yaml
# ❌ BAD: Missing 'value' for input
- input:
    field: username
    # Error: value is required!

# ✅ GOOD
- input:
    field: username
    value: "admin"
```

### 2. Empty Steps

```yaml
# ❌ BAD: Empty steps array
test_name: "My Test"
steps: []  # Validation error!
submit: { button: submit }

# ✅ GOOD: At least one step
steps:
  - input: { field: username, value: "admin" }
```

### 3. Incorrect Indentation

```yaml
# ❌ BAD: Incorrect YAML indentation
test_name: "Test"
steps:
- input:   # Should be indented 2 spaces
  field: username

# ✅ GOOD
test_name: "Test"
steps:
  - input:
      field: username
      value: "admin"
```

### 4. Multiple Action Types in One Step

```yaml
# ❌ BAD: Multiple actions per step
- input: { field: username, value: "admin" }
  click: { button: next }  # Error: only one action per step!

# ✅ GOOD: Separate steps
- input: { field: username, value: "admin" }
- click: { button: next }
```

## 📊 Testing the Test

### Validate Before Running

The engine automatically validates YAML before execution, but you can test:

```bash
# Run a simple test to check YAML syntax
node test-engine.js ./config.yaml ./my-test.yaml
```

Common validation errors:
- ❌ Missing required fields
- ❌ Invalid action types
- ❌ Wrong data types
- ❌ Malformed selectors
- ❌ Empty steps array

### Review Failure Screenshots

Always check `screenshots/failures/` to understand test failures visually.

## 🎓 Learning Path

1. **Start with examples**:
   - `examples/simple-login.yaml` - Basic structure
   - `examples/comprehensive-scenario.yaml` - All features
   - `examples/hierarchical-tests.yaml` - Organization

2. **Understand selectors**:
   - Practice with browser dev tools (F12)
   - Test selectors in console: `document.querySelector(...)`

3. **Master waits**:
   - Use shortest waits possible
   - Add only when necessary
   - Monitor execution speed

4. **Organize tests**:
   - Group by feature or workflow
   - Use hierarchical lists
   - Reuse common scenarios

5. **Optimize for maintainability**:
   - Clear names and comments
   - Consistent selector strategy
   - Logical directory structure

---

**Remember**: Good test automation is 80% organization and 20% execution. Focus on clarity and maintainability!
