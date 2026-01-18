// src/validators/yaml-validator.js

/**
 * ValidationError - Custom error for YAML validation failures
 */
class ValidationError extends Error {
  constructor(message, field = null, value = null) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.value = value;
  }
}

/**
 * YamlValidator - Validates YAML test scenarios before execution
 * Catches configuration errors early to prevent test failures
 */
class YamlValidator {
  constructor() {
    this.validActionTypes = [
      "input",
      "click",
      "checkbox",
      "radio",
      "select",
      "select_radio",
      "dropdown",
      "check",
      "dialog",
    ];
    this.validSelectorTypes = ["id", "name", "css", "xpath"];
    this.validSelectBy = ["value", "label", "index"];
  }

  /**
   * Validates a complete test scenario
   * @param {object} scenarioData - Parsed YAML scenario data
   * @throws {ValidationError} If validation fails
   */
  validateScenario(scenarioData) {
    if (!scenarioData || typeof scenarioData !== "object") {
      throw new ValidationError("Scenario must be a valid object");
    }

    // Validate required fields
    this.validateTestName(scenarioData);
    this.validateSteps(scenarioData.steps);
    this.validateSubmit(scenarioData.submit);

    // Validate optional fields
    if (scenarioData.url) {
      this.validateUrl(scenarioData.url);
    }

    if (scenarioData.verify || scenarioData.assertions) {
      this.validateVerifications(
        scenarioData.verify || scenarioData.assertions,
      );
    }

    return true;
  }

  /**
   * Validates test list structure
   * @param {object} listData - Parsed YAML test list data
   * @throws {ValidationError} If validation fails
   */
  validateTestList(listData) {
    if (!listData || typeof listData !== "object") {
      throw new ValidationError("Test list must be a valid object");
    }

    const testList = listData.test_list || listData.tests;

    if (!testList) {
      throw new ValidationError(
        'Test list must contain "test_list" or "tests" field',
      );
    }

    if (!Array.isArray(testList)) {
      throw new ValidationError(
        "Test list must be an array",
        "test_list",
        typeof testList,
      );
    }

    if (testList.length === 0) {
      throw new ValidationError("Test list cannot be empty");
    }

    // Validate each test reference
    testList.forEach((item, index) => {
      this.validateTestListItem(item, index);
    });

    return true;
  }

  /**
   * Validates a single test list item
   */
  validateTestListItem(item, index) {
    if (typeof item === "string") {
      // Simple file path - OK
      return;
    }

    if (typeof item === "object" && item !== null) {
      // Object format - validate structure
      if (item.file) {
        // Format: { file: "path", name: "...", children: [...] }
        if (typeof item.file !== "string") {
          throw new ValidationError(
            `Test list item ${index}: 'file' must be a string`,
            `tests[${index}].file`,
          );
        }
      } else {
        // Format: { "path": [...children] }
        const keys = Object.keys(item);
        if (keys.length !== 1) {
          throw new ValidationError(
            `Test list item ${index}: must have exactly one file path as key`,
            `tests[${index}]`,
          );
        }
      }
      return;
    }

    throw new ValidationError(
      `Test list item ${index}: must be a string or object`,
      `tests[${index}]`,
      typeof item,
    );
  }

  /**
   * Validates test name
   */
  validateTestName(scenarioData) {
    const name = scenarioData.test_name || scenarioData.name;

    if (!name) {
      throw new ValidationError(
        'Test scenario must have a "name" or "test_name" field',
      );
    }

    if (typeof name !== "string") {
      throw new ValidationError(
        "Test name must be a string",
        "name",
        typeof name,
      );
    }

    if (name.trim().length === 0) {
      throw new ValidationError("Test name cannot be empty");
    }
  }

  /**
   * Validates URL format
   */
  validateUrl(url) {
    if (typeof url !== "string") {
      throw new ValidationError("URL must be a string", "url", typeof url);
    }

    // Basic URL validation - must start with http:// or https://
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      throw new ValidationError(
        "URL must start with http:// or https://",
        "url",
        url,
      );
    }
  }

  /**
   * Validates steps array
   */
  validateSteps(steps) {
    if (!steps) {
      throw new ValidationError('Test scenario must have "steps" field');
    }

    if (!Array.isArray(steps)) {
      throw new ValidationError(
        "Steps must be an array",
        "steps",
        typeof steps,
      );
    }

    if (steps.length === 0) {
      throw new ValidationError(
        "Steps array cannot be empty - at least one action is required",
      );
    }

    steps.forEach((step, index) => {
      this.validateStep(step, index);
    });
  }

  /**
   * Validates a single step
   */
  validateStep(step, index) {
    if (!step || typeof step !== "object") {
      throw new ValidationError(
        `Step ${index + 1}: must be an object`,
        `steps[${index}]`,
        typeof step,
      );
    }

    const actionTypes = Object.keys(step);

    if (actionTypes.length === 0) {
      throw new ValidationError(
        `Step ${index + 1}: must have an action type (e.g., input, click, checkbox)`,
        `steps[${index}]`,
      );
    }

    if (actionTypes.length > 1) {
      throw new ValidationError(
        `Step ${index + 1}: must have exactly one action type, found: ${actionTypes.join(", ")}`,
        `steps[${index}]`,
      );
    }

    const actionType = actionTypes[0];
    const actionData = step[actionType];

    if (!this.validActionTypes.includes(actionType)) {
      throw new ValidationError(
        `Step ${index + 1}: unknown action type "${actionType}". Valid types: ${this.validActionTypes.join(", ")}`,
        `steps[${index}].${actionType}`,
      );
    }

    // Validate action data based on type
    this.validateActionData(actionType, actionData, index);
  }

  /**
   * Validates action data based on action type
   */
  validateActionData(actionType, data, stepIndex) {
    if (!data) {
      throw new ValidationError(
        `Step ${stepIndex + 1}: ${actionType} action requires data`,
        `steps[${stepIndex}].${actionType}`,
      );
    }

    switch (actionType) {
      case "input":
        this.validateInputAction(data, stepIndex);
        break;
      case "click":
        this.validateClickAction(data, stepIndex);
        break;
      case "checkbox":
      case "check":
        this.validateCheckboxAction(data, stepIndex);
        break;
      case "radio":
      case "select_radio":
        this.validateRadioAction(data, stepIndex);
        break;
      case "select":
      case "dropdown":
        this.validateSelectAction(data, stepIndex);
        break;
      case "dialog":
        this.validateDialogAction(data, stepIndex);
        break;
    }
  }

  /**
   * Validates input action
   */
  validateInputAction(data, stepIndex) {
    if (typeof data === "string") {
      return; // Simple string format is OK for click
    }

    if (typeof data !== "object") {
      throw new ValidationError(
        `Step ${stepIndex + 1}: input action data must be an object`,
        `steps[${stepIndex}].input`,
      );
    }

    // Must have a selector
    const hasSelector = data.field || data.name || data.id || data.selector;
    if (!hasSelector) {
      throw new ValidationError(
        `Step ${stepIndex + 1}: input action must have a selector (field, name, id, or selector)`,
        `steps[${stepIndex}].input`,
      );
    }

    // Must have a value
    if (data.value === undefined) {
      throw new ValidationError(
        `Step ${stepIndex + 1}: input action must have a "value" field`,
        `steps[${stepIndex}].input`,
      );
    }

    // Validate selector if it's an object
    if (data.selector && typeof data.selector === "object") {
      this.validateSelectorObject(data.selector, stepIndex, "input");
    }
  }

  /**
   * Validates click action
   */
  validateClickAction(data, stepIndex) {
    if (typeof data === "string") {
      return; // Simple string format is OK
    }

    if (typeof data !== "object") {
      throw new ValidationError(
        `Step ${stepIndex + 1}: click action data must be a string or object`,
        `steps[${stepIndex}].click`,
      );
    }

    const hasSelector =
      data.button || data.element || data.xpath || data.selector;
    if (!hasSelector) {
      throw new ValidationError(
        `Step ${stepIndex + 1}: click action must have a selector (button, element, xpath, or selector)`,
        `steps[${stepIndex}].click`,
      );
    }

    if (data.selector && typeof data.selector === "object") {
      this.validateSelectorObject(data.selector, stepIndex, "click");
    }
  }

  /**
   * Validates checkbox action
   */
  validateCheckboxAction(data, stepIndex) {
    if (typeof data !== "object") {
      throw new ValidationError(
        `Step ${stepIndex + 1}: checkbox action data must be an object`,
        `steps[${stepIndex}].checkbox`,
      );
    }

    const hasSelector = data.field || data.name || data.id || data.selector;
    if (!hasSelector) {
      throw new ValidationError(
        `Step ${stepIndex + 1}: checkbox action must have a selector`,
        `steps[${stepIndex}].checkbox`,
      );
    }

    if (
      data.value !== undefined &&
      typeof data.value !== "boolean" &&
      typeof data.value !== "string"
    ) {
      throw new ValidationError(
        `Step ${stepIndex + 1}: checkbox value must be a boolean or string`,
        `steps[${stepIndex}].checkbox.value`,
      );
    }
  }

  /**
   * Validates radio action
   */
  validateRadioAction(data, stepIndex) {
    if (typeof data !== "object") {
      throw new ValidationError(
        `Step ${stepIndex + 1}: radio action data must be an object`,
        `steps[${stepIndex}].radio`,
      );
    }

    const hasSelector = data.xpath || data.id || data.name || data.selector;
    if (!hasSelector) {
      throw new ValidationError(
        `Step ${stepIndex + 1}: radio action must have a selector`,
        `steps[${stepIndex}].radio`,
      );
    }
  }

  /**
   * Validates select/dropdown action
   */
  validateSelectAction(data, stepIndex) {
    if (typeof data !== "object") {
      throw new ValidationError(
        `Step ${stepIndex + 1}: select action data must be an object`,
        `steps[${stepIndex}].select`,
      );
    }

    const hasSelector = data.field || data.name || data.id || data.selector;
    if (!hasSelector) {
      throw new ValidationError(
        `Step ${stepIndex + 1}: select action must have a selector`,
        `steps[${stepIndex}].select`,
      );
    }

    if (data.value === undefined) {
      throw new ValidationError(
        `Step ${stepIndex + 1}: select action must have a "value" field`,
        `steps[${stepIndex}].select`,
      );
    }

    if (data.select_by && !this.validSelectBy.includes(data.select_by)) {
      throw new ValidationError(
        `Step ${stepIndex + 1}: select_by must be one of: ${this.validSelectBy.join(", ")}`,
        `steps[${stepIndex}].select.select_by`,
        data.select_by,
      );
    }
  }

  /**
   * Validates dialog action  */
  validateDialogAction(data, stepIndex) {
    if (typeof data !== "object") {
      throw new ValidationError(
        `Step ${stepIndex + 1}: dialog action data must be an object`,
        `steps[${stepIndex}].dialog`,
      );
    }

    const validActions = ["accept", "dismiss"];
    if (data.action && !validActions.includes(data.action)) {
      throw new ValidationError(
        `Step ${stepIndex + 1}: dialog action must be "accept" or "dismiss"`,
        `steps[${stepIndex}].dialog.action`,
        data.action,
      );
    }
  }

  /**
   * Validates selector object format
   */
  validateSelectorObject(selector, stepIndex, actionType) {
    if (!selector.by || !selector.value) {
      throw new ValidationError(
        `Step ${stepIndex + 1}: selector object must have "by" and "value" fields`,
        `steps[${stepIndex}].${actionType}.selector`,
      );
    }

    if (!this.validSelectorTypes.includes(selector.by)) {
      throw new ValidationError(
        `Step ${stepIndex + 1}: selector "by" must be one of: ${this.validSelectorTypes.join(", ")}`,
        `steps[${stepIndex}].${actionType}.selector.by`,
        selector.by,
      );
    }
  }

  /**
   * Validates submit section
   */
  validateSubmit(submit) {
    if (!submit) {
      throw new ValidationError('Test scenario must have a "submit" field');
    }

    if (typeof submit !== "object") {
      throw new ValidationError(
        "Submit must be an object",
        "submit",
        typeof submit,
      );
    }

    const hasAction = submit.button || submit.click || submit.selector;
    if (!hasAction) {
      throw new ValidationError(
        "Submit must have a button, click, or selector field",
        "submit",
      );
    }

    // Validate wait times if present
    if (submit.wait_after || submit.waitAfter || submit.postSubmitWait) {
      const waitValue =
        submit.wait_after || submit.waitAfter || submit.postSubmitWait;
      this.validateWaitTime(waitValue, "submit.wait_after");
    }
  }

  /**
   * Validates wait time format
   */
  validateWaitTime(value, fieldPath) {
    if (typeof value === "number") {
      if (value < 0) {
        throw new ValidationError(
          `Wait time must be positive`,
          fieldPath,
          value,
        );
      }
      return;
    }

    if (typeof value === "string") {
      const match = value.match(/^(\d+)(ms|s)?$/);
      if (!match) {
        throw new ValidationError(
          `Wait time must be a number or string like "2000ms" or "2s"`,
          fieldPath,
          value,
        );
      }
      return;
    }

    throw new ValidationError(
      `Wait time must be a number or string`,
      fieldPath,
      typeof value,
    );
  }

  /**
   * Validates verifications/assertions
   */
  validateVerifications(verifications) {
    if (!Array.isArray(verifications)) {
      throw new ValidationError(
        "Verifications must be an array",
        "verify",
        typeof verifications,
      );
    }

    verifications.forEach((verification, index) => {
      this.validateVerification(verification, index);
    });
  }

  /**
   * Validates a single verification
   */
  validateVerification(verification, index) {
    if (typeof verification === "string") {
      return; // Simple text assertion is OK
    }

    if (typeof verification !== "object") {
      throw new ValidationError(
        `Verification ${index + 1}: must be a string or object`,
        `verify[${index}]`,
      );
    }

    // Check for known verification types
    const hasType =
      verification.message ||
      verification.input_value ||
      verification.style ||
      verification.visible !== undefined ||
      verification.hidden !== undefined ||
      verification.has_class ||
      verification.attribute;

    if (!hasType) {
      throw new ValidationError(
        `Verification ${index + 1}: must specify a verification type (message, input_value, style, visible, hidden, has_class, attribute)`,
        `verify[${index}]`,
      );
    }
  }
}

module.exports = { YamlValidator, ValidationError };
