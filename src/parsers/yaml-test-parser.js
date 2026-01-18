// src/parsers/yaml-test-parser.js
const yaml = require("js-yaml");
const fs = require("fs").promises;

class YamlTestParser {
  constructor() {
    this.defaultTimeout = 30000;
  }

  async parseFile(filePath) {
    const content = await fs.readFile(filePath, "utf8");
    const yamlData = yaml.load(content);
    return this.convertToTestScenario(yamlData);
  }

  convertToTestScenario(yamlData) {
    return [
      {
        name: yamlData.test_name || yamlData.name,
        url: yamlData.url,
        steps: this.parseSteps(yamlData.steps),
        submit: this.parseSubmit(yamlData.submit),
        assertions: this.parseVerify(yamlData.verify),
      },
    ];
  }

  parseSteps(steps) {
    return steps.map((step) => {
      const stepType = Object.keys(step)[0];
      const stepData = step[stepType];

      switch (stepType) {
        case "input":
          return this.parseInputStep(stepData);

        case "click":
          return this.parseClickStep(stepData);

        case "select_radio":
        case "radio":
          return this.parseRadioStep(stepData);

        case "select":
        case "dropdown":
          return this.parseSelectStep(stepData);

        case "checkbox":
        case "check":
          return this.parseCheckboxStep(stepData);

        default:
          throw new Error(`Unknown step type: ${stepType}`);
      }
    });
  }

  parseInputStep(data) {
    const selector = this.detectSelector(
      data.field || data.name || data.id || data.selector,
    );

    return {
      type: "input",
      selector: selector,
      value: data.value,
      waitForNavigation: data.wait_for_reload || data.waitForReload || false,
    };
  }

  parseClickStep(data) {
    let target;
    if (typeof data === "string") {
      target = data;
    } else if (data.button) {
      target = data.button;
    } else if (data.element) {
      target = data.element;
    } else if (data.xpath) {
      target = data.xpath;
    } else if (data.selector) {
      target = data.selector;
    } else {
      target = data;
    }

    const selector = this.detectSelector(target);

    return {
      type: "click",
      selector: selector,
      waitForNavigation:
        data.wait_for_navigation || data.waitForNavigation || false,
      postNavigationWait: this.parseTime(data.wait_after),
    };
  }

  parseRadioStep(data) {
    const selector = this.detectSelector(
      data.xpath || data.id || data.name || data.selector,
    );

    return {
      type: "radio",
      selector: selector,
      value: data.value,
      verifyValue: data.verify || true,
      waitForNavigation: data.wait_for_reload || false,
    };
  }

  parseSelectStep(data) {
    const selector = this.detectSelector(data.field || data.name || data.id);

    return {
      type: "select",
      selector: selector,
      value: data.value,
      selectBy: data.select_by || data.by || "value",
      verifyValue: data.verify || true,
    };
  }

  parseCheckboxStep(data) {
    const selector = this.detectSelector(data.field || data.name || data.id);

    return {
      type: "checkbox",
      selector: selector,
      value: data.value ?? data.checked ?? true,
      waitForNavigation: data.wait_for_reload || false,
    };
  }

  /**
   * Parse submit section - supports both new step-based and legacy formats
   */
  parseSubmit(submit) {
    if (!submit) return null;

    // NEW FORMAT: submit.steps array
    if (submit.steps && Array.isArray(submit.steps)) {
      return {
        steps: submit.steps.map((step, index) => this.parseSubmitStep(step, index)),
        postSubmitWait: this.parseTime(submit.wait_after || submit.waitAfter),
      };
    }

    // LEGACY FORMAT: Convert to new format for backward compatibility
    return this.convertLegacySubmit(submit);
  }

  /**
   * Parse a single submit step (new format)
   */
  parseSubmitStep(step, index) {
    const stepName = step.name || `Submit Step ${index + 1}`;

    // Handle different step actions
    switch (step.action) {
      case 'click':
        return {
          name: stepName,
          action: 'click',
          selector: this.detectSelector(step.selector || step.button || step.element),
          capture: step.capture ?? false,
          wait_after: this.parseTime(step.wait_after)
        };

      case 'dialog':
        return {
          name: stepName,
          action: 'dialog',
          dialogType: step.dialogType || 'confirm',
          dialogAction: step.dialogAction || step.accept === false ? 'dismiss' : 'accept',
          capture: step.capture ?? false,
          wait_after: this.parseTime(step.wait_after)
        };

      case 'input':
        return {
          name: stepName,
          action: 'input',
          selector: this.detectSelector(step.selector || step.field),
          value: step.value,
          capture: step.capture ?? false,
          wait_after: this.parseTime(step.wait_after)
        };

      default:
        throw new Error(`Unknown submit step action: ${step.action}`);
    }
  }

  /**
   * Convert legacy submit format to new step-based format
   */
  convertLegacySubmit(submit) {
    const steps = [];

    // Step 1: Click submit button
    const clickStep = {
      name: "Click Submit Button",
      action: "click",
      selector: this.detectSelector(
        submit.button || submit.click || submit.selector
      ),
      capture: true, // Always capture for backward compatibility
    };
    steps.push(clickStep);

    // Step 2+: Handle dialogs if present
    if (submit.dialogs && Array.isArray(submit.dialogs)) {
      submit.dialogs.forEach((dialog, idx) => {
        let dialogType, dialogAction;

        if (typeof dialog === "string") {
          // Format: "confirm: accept"
          const parts = dialog.split(":").map((s) => s.trim());
          dialogType = parts[0];
          dialogAction = parts[1] || "accept";
        } else if (typeof dialog === "object") {
          if (dialog.dialogType || dialog.action) {
            // New format: { dialogType: "confirm", action: "accept" }
            dialogType = dialog.dialogType || "confirm";
            dialogAction = dialog.action || "accept";
          } else {
            // Old format: { confirm: "accept" }
            dialogType = Object.keys(dialog)[0];
            dialogAction = dialog[dialogType];
          }
        }

        steps.push({
          name: `Handle ${dialogType} Dialog ${idx + 1}`,
          action: "dialog",
          dialogType: dialogType,
          dialogAction: dialogAction,
          capture: true, // Always capture dialogs
          wait_after: dialog.wait_after || dialog.waitAfter,
        });
      });
    } else if (submit.dialog) {
      // Single dialog
      steps.push({
        name: "Handle Dialog",
        action: "dialog",
        dialogType: submit.dialog.type || "confirm",
        dialogAction: submit.dialog.action || "accept",
        capture: true,
      });
    }

    return {
      steps: steps,
      waitForNavigation:
        submit.wait_for_navigation || submit.waitForNavigation || false,
      postSubmitWait: this.parseTime(submit.wait_after || submit.waitAfter),
    };
  }

  parseVerify(verify) {
    if (!verify) return [];

    return verify
      .map((assertion) => {
        if (typeof assertion === "string") {
          return {
            selector: { by: "id", value: "message" },
            type: "text",
            expectedText: assertion,
          };
        }

        if (assertion.message) {
          return {
            selector: { by: "id", value: "message" },
            type: "text",
            expectedText: assertion.message,
          };
        }

        if (assertion.input_value) {
          return {
            selector: this.detectSelector(assertion.input_value.field),
            type: "input",
            expectedText:
              assertion.input_value.equals || assertion.input_value.value,
          };
        }

        if (assertion.style) {
          const element = assertion.style.element || assertion.style.selector;
          const selector = this.detectSelector(element);

          const styleProps = Object.keys(assertion.style).filter(
            (k) => k !== "element" && k !== "selector",
          );

          return styleProps.map((prop) => ({
            selector: selector,
            type: "style",
            styleProperty: this.camelToKebab(prop),
            expectedValue: this.normalizeStyleValue(
              prop,
              assertion.style[prop],
            ),
          }));
        }

        if (assertion.visible !== undefined) {
          return {
            selector: this.detectSelector(assertion.visible),
            type: "visible",
            expectedValue: true,
          };
        }

        if (assertion.hidden !== undefined) {
          return {
            selector: this.detectSelector(assertion.hidden),
            type: "visible",
            expectedValue: false,
          };
        }

        if (assertion.has_class) {
          return {
            selector: this.detectSelector(assertion.has_class.element),
            type: "class",
            hasClass: assertion.has_class.class,
          };
        }

        if (assertion.attribute) {
          return {
            selector: this.detectSelector(assertion.attribute.element),
            type: "attribute",
            attributeName: assertion.attribute.name,
            expectedValue: assertion.attribute.value,
          };
        }

        return assertion;
      })
      .flat();
  }

  /**
   * Smart selector detection - automatically determines selector type
   */
  detectSelector(value) {
    if (typeof value === "object" && value.by && value.value) {
      return value;
    }

    if (typeof value !== "string") {
      throw new Error(`Invalid selector: ${value}`);
    }

    if (value.startsWith("/") || value.startsWith("(")) {
      return { by: "xpath", value: value };
    }

    if (value.match(/^[#.\[]/) || value.match(/[\s>+~]/)) {
      return { by: "css", value: value };
    }

    return { by: "name", value: value };
  }

  /**
   * Parse time strings like "2000ms", "2s" to milliseconds
   */
  parseTime(value) {
    if (!value) return undefined;
    if (typeof value === "number") return value;

    const match = value.match(/^(\d+)(ms|s)?$/);
    if (!match) return undefined;

    const num = parseInt(match[1]);
    const unit = match[2] || "ms";

    return unit === "s" ? num * 1000 : num;
  }

  /**
   * Convert camelCase to kebab-case for CSS properties
   */
  camelToKebab(str) {
    return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }

  /**
   * Normalize style values (e.g., "green" -> "rgb(0, 128, 0)")
   */
  normalizeStyleValue(property, value) {
    const colorNames = {
      red: "rgb(255, 0, 0)",
      green: "rgb(0, 128, 0)",
      blue: "rgb(0, 0, 255)",
      white: "rgb(255, 255, 255)",
      black: "rgb(0, 0, 0)",
      gray: "rgb(128, 128, 128)",
      yellow: "rgb(255, 255, 0)",
    };

    if (property === "color" || property === "background-color") {
      return colorNames[value.toLowerCase()] || value;
    }

    if (property === "font-weight" || property === "fontWeight") {
      if (value === "bold") return "bold";
      if (value === "normal") return "normal";
    }

    return value;
  }
}

module.exports = YamlTestParser;