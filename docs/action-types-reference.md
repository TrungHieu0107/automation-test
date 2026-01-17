# Action Types Reference Guide

## Overview

The test engine supports comprehensive form interactions including input fields, buttons, checkboxes, radio buttons, and dropdown selects.

## Supported Actions

### 1. Input Action

Fill text into input fields.

```json
{
  "type": "input",
  "selector": {
    "by": "id",
    "value": "username"
  },
  "value": "john.doe"
}
```

**Properties:**

- `type`: "input"
- `selector`: Element selector
- `value`: Text to enter

---

### 2. Click Action

Click buttons, links, or any clickable element.

```json
{
  "type": "click",
  "selector": {
    "by": "id",
    "value": "submitBtn"
  }
}
```

**With Navigation:**

```json
{
  "type": "click",
  "selector": {
    "by": "id",
    "value": "nextPageBtn"
  },
  "waitForNavigation": true,
  "postNavigationWait": 2000
}
```

**Properties:**

- `type`: "click"
- `selector`: Element selector
- `waitForNavigation` (optional): Wait for page reload/navigation
- `postNavigationWait` (optional): Wait time after navigation (ms)

---

### 3. Checkbox Action

Check or uncheck checkbox elements.

```json
{
  "type": "checkbox",
  "selector": {
    "by": "id",
    "value": "agreeTerms"
  },
  "value": true
}
```

**With Page Reload:**

```json
{
  "type": "checkbox",
  "selector": {
    "by": "id",
    "value": "enableNotifications"
  },
  "value": true,
  "waitForNavigation": true,
  "postNavigationWait": 1500
}
```

**Properties:**

- `type`: "checkbox" or "check"
- `selector`: Element selector
- `value`: true (check) or false (uncheck)
- `waitForNavigation` (optional): Wait for page reload
- `postNavigationWait` (optional): Wait time after reload (ms)

---

### 4. Radio Button Action

Select a radio button option.

```json
{
  "type": "radio",
  "selector": {
    "by": "id",
    "value": "genderMale"
  },
  "value": "male",
  "verifyValue": true
}
```

**With Page Reload:**

```json
{
  "type": "radio",
  "selector": {
    "by": "name",
    "value": "paymentMethod"
  },
  "value": "creditCard",
  "waitForNavigation": true,
  "postNavigationWait": 2000,
  "verifyValue": true
}
```

**Properties:**

- `type`: "radio"
- `selector`: Element selector
- `value`: Radio button value to select
- `verifyValue` (optional): Verify the selected value matches
- `waitForNavigation` (optional): Wait for page reload
- `postNavigationWait` (optional): Wait time after reload (ms)

**Behavior:**

- Only selects if not already selected
- Automatically skips if already selected
- Can verify the selected value matches expected value

---

### 5. Select/Dropdown Action

Select an option from a dropdown menu.

**Select by Value:**

```json
{
  "type": "select",
  "selector": {
    "by": "id",
    "value": "country"
  },
  "value": "US",
  "selectBy": "value",
  "verifyValue": true
}
```

**Select by Label:**

```json
{
  "type": "select",
  "selector": {
    "by": "id",
    "value": "ageRange"
  },
  "value": "25-34",
  "selectBy": "label"
}
```

**Select by Index:**

```json
{
  "type": "select",
  "selector": {
    "by": "id",
    "value": "state"
  },
  "value": "2",
  "selectBy": "index"
}
```

**With Page Reload:**

```json
{
  "type": "select",
  "selector": {
    "by": "id",
    "value": "category"
  },
  "value": "Electronics",
  "selectBy": "label",
  "waitForNavigation": true,
  "postNavigationWait": 1500
}
```

**Properties:**

- `type`: "select"
- `selector`: Element selector
- `value`: Option to select (value/label/index based on selectBy)
- `selectBy`: "value" (default), "label", or "index"
- `verifyValue` (optional): Verify the selected value
- `waitForNavigation` (optional): Wait for page reload
- `postNavigationWait` (optional): Wait time after reload (ms)

---

## Selector Types

All actions support multiple selector strategies:

### By ID

```json
{
  "selector": {
    "by": "id",
    "value": "username"
  }
}
```

Finds element with `id="username"`

### By Name

```json
{
  "selector": {
    "by": "name",
    "value": "email"
  }
}
```

Finds element with `name="email"`

### By CSS Selector

```json
{
  "selector": {
    "by": "css",
    "value": ".form-control.primary"
  }
}
```

Finds element matching CSS selector

### By XPath

```json
{
  "selector": {
    "by": "xpath",
    "value": "//button[@type='submit']"
  }
}
```

Finds element matching XPath expression

---

## Complete Form Example

```json
[
  {
    "name": "User Registration Form",
    "url": "http://localhost:3000/register",
    "steps": [
      {
        "type": "input",
        "selector": { "by": "id", "value": "firstName" },
        "value": "John"
      },
      {
        "type": "input",
        "selector": { "by": "id", "value": "lastName" },
        "value": "Doe"
      },
      {
        "type": "input",
        "selector": { "by": "id", "value": "email" },
        "value": "john.doe@example.com"
      },
      {
        "type": "radio",
        "selector": { "by": "id", "value": "genderMale" },
        "value": "male"
      },
      {
        "type": "select",
        "selector": { "by": "id", "value": "country" },
        "value": "United States",
        "selectBy": "label"
      },
      {
        "type": "select",
        "selector": { "by": "id", "value": "ageRange" },
        "value": "25-34",
        "selectBy": "value"
      },
      {
        "type": "checkbox",
        "selector": { "by": "id", "value": "newsletter" },
        "value": true
      },
      {
        "type": "checkbox",
        "selector": { "by": "id", "value": "agreeTerms" },
        "value": true
      }
    ],
    "submit": {
      "step": {
        "type": "click",
        "selector": { "by": "id", "value": "submitBtn" }
      },
      "waitForNavigation": true,
      "postSubmitWait": 2000
    },
    "assertion": {
      "selector": { "by": "id", "value": "successMessage" },
      "expectedText": "Registration successful"
    }
  }
]
```

---

## Dynamic Forms with Page Reload

Some forms reload the page when certain fields change (e.g., cascading dropdowns).

```json
[
  {
    "name": "Dynamic Category Selection",
    "url": "http://localhost:3000/products",
    "steps": [
      {
        "type": "select",
        "selector": { "by": "id", "value": "category" },
        "value": "Electronics",
        "selectBy": "label",
        "waitForNavigation": true,
        "postNavigationWait": 1000
      },
      {
        "type": "select",
        "selector": { "by": "id", "value": "subcategory" },
        "value": "laptops",
        "selectBy": "value"
      },
      {
        "type": "radio",
        "selector": { "by": "name", "value": "sortBy" },
        "value": "priceAsc",
        "waitForNavigation": true,
        "postNavigationWait": 1500
      }
    ],
    "submit": {
      "step": {
        "type": "click",
        "selector": { "by": "id", "value": "applyFilter" }
      },
      "waitForNavigation": true,
      "postSubmitWait": 1000
    },
    "assertion": {
      "selector": { "by": "id", "value": "resultsCount" },
      "expectedText": "15 products found"
    }
  }
]
```

---

## Value Verification

Use `verifyValue: true` to ensure the correct option is selected:

```json
{
  "type": "radio",
  "selector": { "by": "id", "value": "paymentCreditCard" },
  "value": "creditCard",
  "verifyValue": true
}
```

This will:

1. Select the radio button
2. Verify the input value matches "creditCard"
3. Throw an error if values don't match

Same for select boxes:

```json
{
  "type": "select",
  "selector": { "by": "id", "value": "country" },
  "value": "US",
  "selectBy": "value",
  "verifyValue": true
}
```

---

## Performance Tips

1. **Remove Unnecessary Delays**: Set `stepDelay: 0` in config for faster execution
2. **Optimize Navigation Waits**: Use minimal `postNavigationWait` values
3. **Skip Screenshots**: Disable screenshots for faster runs
4. **Parallel Execution**: Run independent test files in parallel (future enhancement)

## Best Practices

1. **Use Specific Selectors**: Prefer IDs over CSS/XPath when possible
2. **Verify Critical Selections**: Use `verifyValue` for important form fields
3. **Handle Page Reloads**: Always set `waitForNavigation: true` when selections cause reloads
4. **Test Radio Groups**: Test one radio per group (selecting one deselects others)
5. **Clear Error Messages**: Use descriptive test names and selectors

---

## 6. Window Dialog Action

Handle browser-level dialog windows such as **alert**, **confirm**, and **prompt**.
These dialogs are triggered by JavaScript (`window.alert`, `window.confirm`, `window.prompt`) and **are not DOM elements**, so they cannot be handled using selectors.

This action allows the test engine to **automatically click OK or Cancel**, and optionally **input a value for prompt dialogs**.

---

### 6.1 Alert Dialog ? Click OK

Used when the page displays a `window.alert()` dialog.

```json
{
  "type": "dialog",
  "dialogType": "alert",
  "action": "accept"
}
```

**Behavior:**

- Waits for the alert dialog to appear
- Clicks **OK**
- Continues test execution after the dialog is closed

---

### 6.2 Confirm Dialog ? Click OK or Cancel

Used for `window.confirm()` dialogs.

**Click OK:**

```json
{
  "type": "dialog",
  "dialogType": "confirm",
  "action": "accept"
}
```

**Click Cancel:**

```json
{
  "type": "dialog",
  "dialogType": "confirm",
  "action": "dismiss"
}
```

**Behavior:**

- Waits for the confirm dialog
- Performs the specified action (**OK** or **Cancel**)
- Continues execution after the dialog closes

---

### 6.3 Prompt Dialog ? Input Value and Click OK

Used for `window.prompt()` dialogs.

```json
{
  "type": "dialog",
  "dialogType": "prompt",
  "action": "accept",
  "value": "Admin"
}
```

**Behavior:**

- Waits for the prompt dialog
- Inputs the provided value
- Clicks **OK**
- Continues test execution

---

### Properties

| Property     | Required | Description                             |
| ------------ | -------- | --------------------------------------- |
| `type`       | ?        | Must be `"dialog"`                      |
| `dialogType` | ?        | `"alert"`, `"confirm"`, or `"prompt"`   |
| `action`     | ?        | `"accept"` (OK) or `"dismiss"` (Cancel) |
| `value`      | ?        | Text input for prompt dialogs           |

---

### Execution Rules

- The `dialog` action **must be placed immediately after** the step that triggers the dialog
- No `selector` is required or allowed
- Dialog actions **block browser execution** until handled
- `waitForNavigation` is **not needed** for dialog actions

---

### Example: Click Button �� Alert �� OK

```json
{
  "steps": [
    {
      "type": "click",
      "selector": { "by": "id", "value": "deleteBtn" }
    },
    {
      "type": "dialog",
      "dialogType": "alert",
      "action": "accept"
    }
  ]
}
```

---

### Example: Confirm Before Deletion

```json
{
  "steps": [
    {
      "type": "click",
      "selector": { "by": "id", "value": "deleteBtn" }
    },
    {
      "type": "dialog",
      "dialogType": "confirm",
      "action": "accept"
    }
  ]
}
```

---

### Example: Prompt Input and Confirm

```json
{
  "steps": [
    {
      "type": "click",
      "selector": { "by": "id", "value": "renameBtn" }
    },
    {
      "type": "dialog",
      "dialogType": "prompt",
      "action": "accept",
      "value": "New Name"
    }
  ]
}
```

---

### Best Practices

1. Do **not** use selectors for dialog actions
2. Always place the dialog step immediately after the triggering action
3. Specify `dialogType` to avoid handling the wrong dialog
4. Use prompt values only when `dialogType` is `"prompt"`

---

### Engine Mapping (Playwright Reference)

| Dialog Action            | Playwright API         |
| ------------------------ | ---------------------- |
| Accept dialog            | `dialog.accept()`      |
| Accept prompt with value | `dialog.accept(value)` |
| Dismiss dialog           | `dialog.dismiss()`     |

---
