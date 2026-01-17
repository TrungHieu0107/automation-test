// lib/action-handler.js
/**
 * ActionHandler class handles all browser interactions and actions
 * including clicks, inputs, selections, dialogs, and form submissions.
 */
class ActionHandler {
  /**
   * Creates an instance of ActionHandler.
   * @param {object} page - Playwright Page object for browser interactions
   * @param {object} config - Configuration object containing execution settings
   * @param {Logger} logger - Logger instance for outputting logs
   */
  constructor(page, config, logger) {
    this.page = page;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Executes a single test step based on its type.
   * Routes to appropriate handler for input, click, checkbox, radio, select, or dialog actions.
   * @param {object} step - The test step object containing type, selector, and other properties
   * @param {string} indent - Indentation string for logging output
   * @returns {Promise<void>}
   * @throws {Error} If step type is unknown or element cannot be found
   */
  async executeStep(step, indent = "") {
    if (step.type === "dialog") {
      await this.handleDialog(step, indent);
      return;
    }

    const element = await this.findElement(step.selector);

    switch (step.type) {
      case "input":
        await this.handleInput(element, step, indent);
        break;

      case "click":
        await this.handleClick(element, step, indent);
        break;

      case "check":
      case "checkbox":
        await this.handleCheckbox(element, step, indent);
        break;

      case "radio":
        await this.handleRadio(element, step, indent);
        break;

      case "select":
        await this.handleSelect(element, step, indent);
        break;

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Executes a click action that triggers a dialog, handling the dialog automatically.
   * Sets up dialog listener before clicking to ensure proper dialog interception.
   * @param {object} clickStep - The click step that will trigger the dialog
   * @param {object} dialogStep - The dialog step containing dialog type and action (accept/dismiss)
   * @param {string} indent - Indentation string for logging output
   * @returns {Promise<void>}
   * @throws {Error} If dialog type mismatch or unknown dialog action
   */
  async executeStepWithDialog(clickStep, dialogStep, indent = "") {
    // Set up dialog listener BEFORE clicking - this is critical!
    // When a dialog appears synchronously on click, it blocks JavaScript execution
    // We must have the handler ready before clicking
    this.logger.log(
      `${indent}  🔔 Setting up dialog listener for ${dialogStep.dialogType} dialog...`,
    );

    const dialogPromise = this.page.waitForEvent("dialog", {
      timeout: this.config.execution.actionTimeout,
    });

    // Find the element
    const element = await this.findElement(clickStep.selector);

    // Check if we need to wait for navigation - either from clickStep or dialogStep
    const shouldWaitForNavigation =
      clickStep.waitForNavigation || dialogStep.waitForNavigation;

    // Click and immediately wait for dialog
    // When dialog appears synchronously, it may block the click, but dialogPromise will catch it
    // Start click action but don't block on it
    const clickPromise = element.click({
      timeout: this.config.execution.actionTimeout,
    });

    // Wait for dialog - if it appears, it will interrupt/block the click (expected behavior)
    // The dialog promise should resolve even if click is blocked
    let dialog;
    try {
      dialog = await dialogPromise;
    } catch (err) {
      // Dialog didn't appear - wait for click to complete
      try {
        await clickPromise;
        throw new Error(
          `Expected ${dialogStep.dialogType} dialog did not appear after clicking`,
        );
      } catch (clickErr) {
        // Click also failed
        throw new Error(
          `Click failed and dialog did not appear: ${clickErr.message}`,
        );
      }
    }

    // Log click completion (it may have been blocked by dialog, which is OK)
    this.logger.log(`${indent}  👆 Clicked`);

    // Log that we clicked (or attempted to)
    this.logger.log(`${indent}  👆 Clicked`);

    // Validate dialog type
    if (dialogStep.dialogType && dialog.type() !== dialogStep.dialogType) {
      throw new Error(
        `Dialog type mismatch: expected "${dialogStep.dialogType}" but got "${dialog.type()}"`,
      );
    }

    // Handle dialog action
    if (dialogStep.action === "accept") {
      if (dialog.type() === "prompt") {
        await dialog.accept(dialogStep.value ?? "");
        this.logger.log(
          `${indent}  ✅ Prompt accepted with value "${dialogStep.value ?? ""}"`,
        );
      } else {
        // Accept the dialog (clicks OK/Confirm button)
        await dialog.accept();
        this.logger.log(`${indent}  ✅ Dialog accepted (OK)`);
      }
    } else if (dialogStep.action === "dismiss") {
      await dialog.dismiss();
      this.logger.log(`${indent}  ❌ Dialog dismissed (Cancel)`);
    } else {
      throw new Error(`Unknown dialog action: ${dialogStep.action}`);
    }

    // Small delay to ensure dialog is fully closed
    await this.wait(100);

    // Handle navigation if needed
    if (shouldWaitForNavigation) {
      await this.page.waitForNavigation({
        timeout: this.config.execution.navigationTimeout,
        waitUntil: "domcontentloaded",
      });
      this.logger.log(`${indent}  🧭 Navigation completed`);

      // Use postNavigationWait from clickStep or dialogStep
      const postNavigationWait =
        clickStep.postNavigationWait || dialogStep.postNavigationWait;
      if (postNavigationWait) {
        await this.wait(postNavigationWait);
      }
    }
  }

  /**
   * Handles input action by filling a text field with the specified value.
   * @param {object} element - Playwright Locator object for the input element
   * @param {object} step - Step object containing the value to input
   * @param {string} indent - Indentation string for logging output
   * @returns {Promise<void>}
   */
  async handleInput(element, step, indent) {
    await element.fill(step.value);
    this.logger.log(`${indent}  �� Entered "${step.value}"`);
  }

  /**
   * Handles click action on an element, optionally waiting for navigation.
   * @param {object} element - Playwright Locator object for the element to click
   * @param {object} step - Step object containing waitForNavigation and postNavigationWait options
   * @param {string} indent - Indentation string for logging output
   * @returns {Promise<void>}
   */
  async handleClick(element, step, indent) {
    if (step.waitForNavigation) {
      // click first ? do NOT wait for navigation yet
      await element.click();
      this.logger.log(`${indent}  �� Clicked`);

      // navigation happens AFTER dialog is handled
      await this.page.waitForNavigation({
        timeout: this.config.execution.navigationTimeout,
        waitUntil: "domcontentloaded",
      });

      this.logger.log(`${indent}  �� Navigation completed`);

      if (step.postNavigationWait) {
        await this.wait(step.postNavigationWait);
      }
    } else {
      await element.click();
      this.logger.log(`${indent}  �� Clicked`);
    }
  }

  /**
   * Handles checkbox action - checks or unchecks based on current state and desired value.
   * Only toggles if the checkbox is not already in the desired state.
   * @param {object} element - Playwright Locator object for the checkbox element
   * @param {object} step - Step object containing value (true/false/undefined) and navigation options
   * @param {string} indent - Indentation string for logging output
   * @returns {Promise<void>}
   */
  async handleCheckbox(element, step, indent) {
    const isChecked = await element.isChecked();

    if (step.value !== undefined) {
      if (step.value && !isChecked) {
        await this.checkWithNavigation(element, step, indent);
        this.logger.log(`${indent}  �� Checked`);
      } else if (!step.value && isChecked) {
        await this.checkWithNavigation(element, step, indent);
        this.logger.log(`${indent}  �� Unchecked`);
      } else {
        this.logger.log(
          `${indent}  �� Already ${step.value ? "checked" : "unchecked"}`,
        );
      }
    } else {
      await this.checkWithNavigation(element, step, indent);
      this.logger.log(`${indent}  �� ${isChecked ? "Unchecked" : "Checked"}`);
    }
  }

  /**
   * Handles radio button selection. Only selects if not already selected.
   * Optionally verifies the selected value matches expected value.
   * @param {object} element - Playwright Locator object for the radio button element
   * @param {object} step - Step object containing value, waitForNavigation, and verifyValue options
   * @param {string} indent - Indentation string for logging output
   * @returns {Promise<void>}
   * @throws {Error} If verifyValue is true and selected value doesn't match expected value
   */
  async handleRadio(element, step, indent) {
    const isChecked = await element.isChecked();

    if (!isChecked) {
      if (step.waitForNavigation) {
        await Promise.all([
          this.page.waitForNavigation({
            timeout: this.config.execution.navigationTimeout,
            waitUntil: "domcontentloaded",
          }),
          element.check(),
        ]);
        this.logger.log(`${indent}  �� Radio selected (navigation completed)`);

        if (step.postNavigationWait) {
          await this.wait(step.postNavigationWait);
        }
      } else {
        await element.check();
        this.logger.log(`${indent}  �� Radio selected`);
      }
    } else {
      this.logger.log(`${indent}  �� Radio already selected`);
    }

    // Verify the selection
    if (step.verifyValue) {
      const value = await element.inputValue();
      if (value !== step.value) {
        throw new Error(
          `Radio value mismatch: expected "${step.value}" but got "${value}"`,
        );
      }
    }
  }

  /**
   * Handles select dropdown/combobox selection by value, label, or index.
   * Optionally verifies the selected value matches expected value.
   * @param {object} element - Playwright Locator object for the select element
   * @param {object} step - Step object containing value, selectBy (value/label/index), waitForNavigation, and verifyValue options
   * @param {string} indent - Indentation string for logging output
   * @returns {Promise<void>}
   * @throws {Error} If verifyValue is true and selected value doesn't match expected value
   */
  async handleSelect(element, step, indent) {
    const selectBy = step.selectBy || "value"; // value, label, or index

    if (step.waitForNavigation) {
      await Promise.all([
        this.page.waitForNavigation({
          timeout: this.config.execution.navigationTimeout,
          waitUntil: "domcontentloaded",
        }),
        this.performSelect(element, step.value, selectBy),
      ]);
      this.logger.log(
        `${indent}  �� Selected "${step.value}" (navigation completed)`,
      );

      if (step.postNavigationWait) {
        await this.wait(step.postNavigationWait);
      }
    } else {
      await this.performSelect(element, step.value, selectBy);
      this.logger.log(`${indent}  �� Selected "${step.value}"`);
    }

    // Verify the selection
    if (step.verifyValue) {
      const selectedValue = await element.inputValue();
      if (selectBy === "value" && selectedValue !== step.value) {
        throw new Error(
          `Select value mismatch: expected "${step.value}" but got "${selectedValue}"`,
        );
      }
    }
  }

  /**
   * Performs the actual selection on a select element based on selectBy method.
   * @param {object} element - Playwright Locator object for the select element
   * @param {string|number} value - The value, label, or index to select
   * @param {string} selectBy - Selection method: 'value', 'label', or 'index'
   * @returns {Promise<void>}
   */
  async performSelect(element, value, selectBy) {
    switch (selectBy) {
      case "value":
        await element.selectOption({ value: value });
        break;
      case "label":
        await element.selectOption({ label: value });
        break;
      case "index":
        await element.selectOption({ index: parseInt(value) });
        break;
      default:
        await element.selectOption(value);
    }
  }

  /**
   * Checks or unchecks a checkbox element, optionally waiting for navigation after the action.
   * Used internally by handleCheckbox for navigation-aware checkbox operations.
   * @param {object} element - Playwright Locator object for the checkbox element
   * @param {object} step - Step object containing waitForNavigation and postNavigationWait options
   * @param {string} indent - Indentation string for logging output
   * @returns {Promise<void>}
   */
  async checkWithNavigation(element, step, indent) {
    if (step.waitForNavigation) {
      await Promise.all([
        this.page.waitForNavigation({
          timeout: this.config.execution.navigationTimeout,
          waitUntil: "domcontentloaded",
        }),
        element.check(),
      ]);
      this.logger.log(`${indent}  �� Page reloaded after checkbox action`);

      if (step.postNavigationWait) {
        this.logger.log(
          `${indent}  �� Waiting ${step.postNavigationWait}ms after reload...`,
        );
        await this.wait(step.postNavigationWait);
      }
    } else {
      await element.check();
    }
  }

  async executeSubmit(submitAction, indent = "") {
    const step = submitAction.step;

    // Handle dialog-only submit
    if (step.type === "dialog") {
      await this.handleDialog(step, indent);

      if (submitAction.waitForNavigation || step.waitForNavigation) {
        await this.page.waitForNavigation({
          timeout: this.config.execution.navigationTimeout,
          waitUntil: "domcontentloaded",
        });
        this.logger.log(`${indent}  🧭 Navigation completed`);
      }
      return;
    }

    // Check if there are multiple dialogs configured for submit
    if (submitAction.dialogs && Array.isArray(submitAction.dialogs)) {
      await this.executeStepWithMultipleDialogs(
        step,
        submitAction.dialogs,
        indent,
      );

      if (submitAction.postSubmitWait) {
        this.logger.log(
          `${indent}  ⏳ Waiting ${submitAction.postSubmitWait}ms after submit...`,
        );
        await this.wait(submitAction.postSubmitWait);
      }
      return;
    }

    // Check if there's a single dialog configured for submit
    if (submitAction.dialog) {
      await this.executeStepWithDialog(step, submitAction.dialog, indent);

      if (submitAction.postSubmitWait) {
        this.logger.log(
          `${indent}  ⏳ Waiting ${submitAction.postSubmitWait}ms after submit...`,
        );
        await this.wait(submitAction.postSubmitWait);
      }
      return;
    }

    // Regular submit without dialogs
    const element = await this.findElement(step.selector);

    if (submitAction.waitForNavigation) {
      await Promise.all([
        this.page.waitForNavigation({
          timeout: this.config.execution.navigationTimeout,
          waitUntil: "domcontentloaded",
        }),
        step.type === "click" ? element.click() : element.press("Enter"),
      ]);
      this.logger.log(`${indent}  🧭 Navigation completed`);
    } else {
      if (step.type === "click") {
        await element.click();
      } else if (step.type === "input") {
        await element.fill(step.value);
      }
    }
  }

  /**
   * Executes an assertion by comparing expected values with actual values from an element.
   * Supports text content, input values, styles, and HTML attributes.
   * @param {object} assertion - Assertion object containing selector, type, and expected values
   * @param {string} indent - Indentation string for logging output
   * @returns {Promise<void>}
   * @throws {Error} If actual value doesn't match expected value
   */
  async executeAssertion(assertion, indent = "") {
    const element = await this.findElement(assertion.selector);
    let actualValue = "";
    let expectedValue = "";
    let assertionDescription = "";

    switch (assertion.type) {
      case "input":
        // Check input field value
        actualValue = await element.inputValue();
        expectedValue = assertion.expectedText || assertion.expectedValue;
        assertionDescription = `input value`;
        break;

      case "style":
        // Check CSS style property
        actualValue = await element.evaluate((el, styleProp) => {
          return window.getComputedStyle(el).getPropertyValue(styleProp);
        }, assertion.styleProperty);
        expectedValue = assertion.expectedValue;
        assertionDescription = `style "${assertion.styleProperty}"`;
        break;

      case "attribute":
        // Check HTML attribute
        actualValue = await element.getAttribute(assertion.attributeName);
        expectedValue = assertion.expectedValue;
        assertionDescription = `attribute "${assertion.attributeName}"`;
        break;

      case "class":
        // Check if element has a specific class
        const classList = await element.evaluate((el) => el.className);
        actualValue = classList;
        expectedValue = assertion.expectedValue;
        assertionDescription = `class`;

        // Special handling for class checking
        if (assertion.hasClass) {
          const hasClass = classList.split(" ").includes(assertion.hasClass);
          if (!hasClass) {
            throw new Error(
              `Element does not have class "${assertion.hasClass}". Actual classes: "${classList}"`,
            );
          }
          this.logger.log(
            `${indent}  ✓ Element has class "${assertion.hasClass}"`,
          );
          return;
        }
        break;

      case "visible":
        // Check if element is visible
        const isVisible = await element.isVisible();
        expectedValue = assertion.expectedValue ?? true;
        actualValue = isVisible;
        assertionDescription = `visibility`;

        if (isVisible !== expectedValue) {
          throw new Error(
            `Element visibility mismatch: expected ${expectedValue} but got ${actualValue}`,
          );
        }
        this.logger.log(
          `${indent}  ✓ Element is ${isVisible ? "visible" : "hidden"} as expected`,
        );
        return;

      case "enabled":
        // Check if element is enabled/disabled
        const isEnabled = await element.isEnabled();
        expectedValue = assertion.expectedValue ?? true;
        actualValue = isEnabled;
        assertionDescription = `enabled state`;

        if (isEnabled !== expectedValue) {
          throw new Error(
            `Element enabled state mismatch: expected ${expectedValue} but got ${actualValue}`,
          );
        }
        this.logger.log(
          `${indent}  ✓ Element is ${isEnabled ? "enabled" : "disabled"} as expected`,
        );
        return;

      case "text":
      default:
        // Check text content (default)
        actualValue = await element.innerText();
        expectedValue = assertion.expectedText || assertion.expectedValue;
        assertionDescription = `text content`;
        break;
    }

    this.logger.log(
      `${indent}  Asserting ${assertionDescription}: expected="${expectedValue}", actual="${actualValue}"`,
    );

    // Trim values for comparison
    const actualTrimmed =
      typeof actualValue === "string"
        ? actualValue.trim()
        : String(actualValue);
    const expectedTrimmed =
      typeof expectedValue === "string"
        ? expectedValue.trim()
        : String(expectedValue);

    if (actualTrimmed !== expectedTrimmed) {
      throw new Error(
        `Assertion failed for ${assertionDescription}: expected "${expectedTrimmed}" but got "${actualTrimmed}"`,
      );
    }

    this.logger.log(`${indent}  ✓ Assertion passed`);
  }

  /**
   * Finds and waits for an element to be visible based on the selector.
   * Supports id, name, css, and xpath selector types.
   * @param {object} selector - Selector object with 'by' (id/name/css/xpath) and 'value' properties
   * @returns {Promise<object>} Playwright Locator object for the found element
   * @throws {Error} If selector type is unknown or element doesn't become visible within timeout
   */
  async findElement(selector) {
    let locator;

    switch (selector.by) {
      case "id":
        locator = this.page.locator(`#${selector.value}`);
        break;
      case "name":
        locator = this.page.locator(`[name="${selector.value}"]`);
        break;
      case "css":
        locator = this.page.locator(selector.value);
        break;
      case "xpath":
        locator = this.page.locator(`xpath=${selector.value}`);
        break;
      default:
        throw new Error(`Unknown selector type: ${selector.by}`);
    }

    await locator.waitFor({
      state: "visible",
      timeout: this.config.execution.actionTimeout,
    });

    return locator;
  }

  /**
   * Waits for a specified number of milliseconds.
   * @param {number} ms - Number of milliseconds to wait
   * @returns {Promise<void>} Promise that resolves after the specified delay
   */
  async wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handles browser dialogs (alert, confirm, prompt).
   * Waits for the dialog, validates its type, and accepts or dismisses it based on action.
   * For prompt dialogs, optionally provides an input value.
   * @param {object} step - Dialog step object containing dialogType, action (accept/dismiss), and optional value
   * @param {string} indent - Indentation string for logging output
   * @returns {Promise<void>}
   * @throws {Error} If dialog type mismatch or unknown dialog action
   */
  async handleDialog(step, indent) {
    this.logger.log(`${indent}  �� Waiting for ${step.dialogType} dialog...`);

    const dialog = await this.page.waitForEvent("dialog", {
      timeout: this.config.execution.actionTimeout,
    });

    // Validate dialog type
    if (step.dialogType && dialog.type() !== step.dialogType) {
      throw new Error(
        `Dialog type mismatch: expected "${step.dialogType}" but got "${dialog.type()}"`,
      );
    }

    // Accept / Dismiss
    if (step.action === "accept") {
      if (dialog.type() === "prompt") {
        await dialog.accept(step.value ?? "");
        this.logger.log(
          `${indent}  �� Prompt accepted with value "${step.value ?? ""}"`,
        );
      } else {
        await dialog.accept();
        this.logger.log(`${indent}  �� Dialog accepted (OK)`);
      }
    } else if (step.action === "dismiss") {
      await dialog.dismiss();
      this.logger.log(`${indent}  �� Dialog dismissed (Cancel)`);
    } else {
      throw new Error(`Unknown dialog action: ${step.action}`);
    }
  }

  /**
   * Executes multiple assertions sequentially.
   * @param {Array<object>} assertions - Array of assertion objects
   * @param {string} indent - Indentation string for logging output
   * @returns {Promise<void>}
   * @throws {Error} If any assertion fails
   */
  async executeAssertions(assertions, indent = "") {
    this.logger.log(`${indent}Executing ${assertions.length} assertion(s)...`);

    for (let i = 0; i < assertions.length; i++) {
      this.logger.log(`${indent}  Assertion ${i + 1}/${assertions.length}:`);
      await this.executeAssertion(assertions[i], indent + "  ");
    }

    this.logger.log(`${indent}✅ All ${assertions.length} assertion(s) passed`);
  }

  /**
   * Executes a click action that triggers multiple sequential dialogs.
   * Handles dialogs one at a time in the order they appear.
   * @param {object} clickStep - The click step that will trigger the dialogs
   * @param {Array<object>} dialogSteps - Array of dialog steps to handle in sequence
   * @param {string} indent - Indentation string for logging output
   * @returns {Promise<void>}
   */
  async executeStepWithMultipleDialogs(clickStep, dialogSteps, indent = "") {
    this.logger.log(
      `${indent}  🔔 Will handle ${dialogSteps.length} sequential dialogs...`,
    );

    let dialogCount = 0;
    const totalDialogs = dialogSteps.length;

    // Set up a single dialog handler that tracks which dialog we're on
    const dialogHandler = async (dialog) => {
      if (dialogCount >= totalDialogs) {
        this.logger.log(
          `${indent}  ⚠️ Unexpected dialog appeared after all expected dialogs handled`,
        );
        await dialog.accept(); // Accept any unexpected dialogs
        return;
      }

      const dialogStep = dialogSteps[dialogCount];
      dialogCount++;

      this.logger.log(
        `${indent}  🔔 Dialog ${dialogCount}/${totalDialogs} appeared: ${dialog.type()}`,
      );

      // Validate dialog type
      if (dialogStep.dialogType && dialog.type() !== dialogStep.dialogType) {
        throw new Error(
          `Dialog ${dialogCount} type mismatch: expected "${dialogStep.dialogType}" but got "${dialog.type()}"`,
        );
      }

      // Handle dialog action
      if (dialogStep.action === "accept") {
        if (dialog.type() === "prompt") {
          await dialog.accept(dialogStep.value ?? "");
          this.logger.log(
            `${indent}  ✅ Dialog ${dialogCount} (prompt) accepted with value "${dialogStep.value ?? ""}"`,
          );
        } else {
          await dialog.accept();
          this.logger.log(`${indent}  ✅ Dialog ${dialogCount} accepted (OK)`);
        }
      } else if (dialogStep.action === "dismiss") {
        await dialog.dismiss();
        this.logger.log(
          `${indent}  ❌ Dialog ${dialogCount} dismissed (Cancel)`,
        );
      } else {
        throw new Error(`Unknown dialog action: ${dialogStep.action}`);
      }
    };

    // Register the dialog handler
    this.page.on("dialog", dialogHandler);

    try {
      // Find the element
      const element = await this.findElement(clickStep.selector);

      // Check if we need to wait for navigation
      const shouldWaitForNavigation =
        clickStep.waitForNavigation ||
        dialogSteps.some((d) => d.waitForNavigation);

      // Click the button
      this.logger.log(`${indent}  👆 Clicking button...`);

      if (shouldWaitForNavigation) {
        // Click and wait for navigation
        await Promise.all([
          element.click({ timeout: this.config.execution.actionTimeout }),
          this.page
            .waitForNavigation({
              timeout: this.config.execution.navigationTimeout,
              waitUntil: "domcontentloaded",
            })
            .catch(() => {}), // Ignore navigation timeout if dialogs block it
        ]);
      } else {
        await element.click({ timeout: this.config.execution.actionTimeout });
      }

      // Wait for all dialogs to be handled
      const maxWaitTime = this.config.execution.actionTimeout;
      const startTime = Date.now();

      while (
        dialogCount < totalDialogs &&
        Date.now() - startTime < maxWaitTime
      ) {
        await this.wait(100);
      }

      if (dialogCount < totalDialogs) {
        throw new Error(
          `Only ${dialogCount}/${totalDialogs} dialogs were handled`,
        );
      }

      this.logger.log(`${indent}  ✅ All ${totalDialogs} dialogs handled`);

      // Small delay to ensure dialogs are fully closed
      await this.wait(200);

      // Handle navigation if needed and not already done
      if (shouldWaitForNavigation) {
        try {
          await this.page.waitForNavigation({
            timeout: 2000, // Short timeout since navigation might have already happened
            waitUntil: "domcontentloaded",
          });
          this.logger.log(`${indent}  🧭 Navigation completed`);
        } catch (err) {
          // Navigation might have already completed, that's OK
          this.logger.log(
            `${indent}  🧭 Navigation already completed or not required`,
          );
        }

        // Use postNavigationWait from any dialog step that has it
        const postNavigationWait = dialogSteps.find(
          (d) => d.postNavigationWait,
        )?.postNavigationWait;
        if (postNavigationWait) {
          await this.wait(postNavigationWait);
        }
      }
    } finally {
      // Always remove the dialog handler
      this.page.off("dialog", dialogHandler);
    }
  }
}

module.exports = ActionHandler;
