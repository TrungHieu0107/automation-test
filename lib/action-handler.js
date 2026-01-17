// lib/action-handler.js
class ActionHandler {
    constructor(page, config, logger) {
      this.page = page;
      this.config = config;
      this.logger = logger;
    }
  
    async executeStep(step, indent = '') {
      if (step.type === 'dialog') {
        await this.handleDialog(step, indent);
        return;
      }

      const element = await this.findElement(step.selector);
  
      switch (step.type) {
        case 'input':
          await this.handleInput(element, step, indent);
          break;
  
        case 'click':
          await this.handleClick(element, step, indent);
          break;
  
        case 'check':
        case 'checkbox':
          await this.handleCheckbox(element, step, indent);
          break;
  
        case 'radio':
          await this.handleRadio(element, step, indent);
          break;
  
        case 'select':
          await this.handleSelect(element, step, indent);
          break;
  
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }
    }
  
    async handleInput(element, step, indent) {
      await element.fill(step.value);
      this.logger.log(`${indent}  Å® Entered "${step.value}"`);
    }
  
    async handleClick(element, step, indent) {
      if (step.waitForNavigation) {
        // click first ? do NOT wait for navigation yet
        await element.click();
        this.logger.log(`${indent}  Å® Clicked`);
    
        // navigation happens AFTER dialog is handled
        await this.page.waitForNavigation({
          timeout: this.config.execution.navigationTimeout,
          waitUntil: 'domcontentloaded'
        });
    
        this.logger.log(`${indent}  Å® Navigation completed`);
    
        if (step.postNavigationWait) {
          await this.wait(step.postNavigationWait);
        }
      } else {
        await element.click();
        this.logger.log(`${indent}  Å® Clicked`);
      }
    }
    
  
    async handleCheckbox(element, step, indent) {
      const isChecked = await element.isChecked();
      
      if (step.value !== undefined) {
        if (step.value && !isChecked) {
          await this.checkWithNavigation(element, step, indent);
          this.logger.log(`${indent}  Å® Checked`);
        } else if (!step.value && isChecked) {
          await this.checkWithNavigation(element, step, indent);
          this.logger.log(`${indent}  Å® Unchecked`);
        } else {
          this.logger.log(`${indent}  Å® Already ${step.value ? 'checked' : 'unchecked'}`);
        }
      } else {
        await this.checkWithNavigation(element, step, indent);
        this.logger.log(`${indent}  Å® ${isChecked ? 'Unchecked' : 'Checked'}`);
      }
    }
  
    async handleRadio(element, step, indent) {
      const isChecked = await element.isChecked();
      
      if (!isChecked) {
        if (step.waitForNavigation) {
          await Promise.all([
            this.page.waitForNavigation({ 
              timeout: this.config.execution.navigationTimeout,
              waitUntil: 'domcontentloaded'
            }),
            element.check()
          ]);
          this.logger.log(`${indent}  Å® Radio selected (navigation completed)`);
          
          if (step.postNavigationWait) {
            await this.wait(step.postNavigationWait);
          }
        } else {
          await element.check();
          this.logger.log(`${indent}  Å® Radio selected`);
        }
      } else {
        this.logger.log(`${indent}  Å® Radio already selected`);
      }
  
      // Verify the selection
      if (step.verifyValue) {
        const value = await element.inputValue();
        if (value !== step.value) {
          throw new Error(`Radio value mismatch: expected "${step.value}" but got "${value}"`);
        }
      }
    }
  
    async handleSelect(element, step, indent) {
      const selectBy = step.selectBy || 'value'; // value, label, or index
      
      if (step.waitForNavigation) {
        await Promise.all([
          this.page.waitForNavigation({ 
            timeout: this.config.execution.navigationTimeout,
            waitUntil: 'domcontentloaded'
          }),
          this.performSelect(element, step.value, selectBy)
        ]);
        this.logger.log(`${indent}  Å® Selected "${step.value}" (navigation completed)`);
        
        if (step.postNavigationWait) {
          await this.wait(step.postNavigationWait);
        }
      } else {
        await this.performSelect(element, step.value, selectBy);
        this.logger.log(`${indent}  Å® Selected "${step.value}"`);
      }
  
      // Verify the selection
      if (step.verifyValue) {
        const selectedValue = await element.inputValue();
        if (selectBy === 'value' && selectedValue !== step.value) {
          throw new Error(`Select value mismatch: expected "${step.value}" but got "${selectedValue}"`);
        }
      }
    }
  
    async performSelect(element, value, selectBy) {
      switch (selectBy) {
        case 'value':
          await element.selectOption({ value: value });
          break;
        case 'label':
          await element.selectOption({ label: value });
          break;
        case 'index':
          await element.selectOption({ index: parseInt(value) });
          break;
        default:
          await element.selectOption(value);
      }
    }
  
    async checkWithNavigation(element, step, indent) {
      if (step.waitForNavigation) {
        await Promise.all([
          this.page.waitForNavigation({ 
            timeout: this.config.execution.navigationTimeout,
            waitUntil: 'domcontentloaded'
          }),
          element.check()
        ]);
        this.logger.log(`${indent}  Å® Page reloaded after checkbox action`);
        
        if (step.postNavigationWait) {
          this.logger.log(`${indent}  Å® Waiting ${step.postNavigationWait}ms after reload...`);
          await this.wait(step.postNavigationWait);
        }
      } else {
        await element.check();
      }
    }
  
    async executeSubmit(submitAction, indent = '') {
      const step = submitAction.step;
      const element = await this.findElement(step.selector);
  
      if (submitAction.waitForNavigation) {
        await Promise.all([
          this.page.waitForNavigation({ 
            timeout: this.config.execution.navigationTimeout,
            waitUntil: 'domcontentloaded'
          }),
          step.type === 'click' ? element.click() : element.press('Enter')
        ]);
        this.logger.log(`${indent}  Å® Navigation completed`);
      } else {
        if (step.type === 'click') {
          await element.click();
        } else if (step.type === 'input') {
          await element.fill(step.value);
        }
      }
    }
  
    async executeAssertion(assertion, indent = '') {
      const element = await this.findElement(assertion.selector);
      let actualText = "";
      if(assertion.type === "input") {
        actualText = await element.inputValue();
      } else {
        actualText = await element.innerText();
      }
      const expectedText = assertion.expectedText;
  
      this.logger.log(`${indent}  Asserting: expected="${expectedText}", actual="${actualText}"`);
  
      if (actualText.trim() !== expectedText.trim()) {
        throw new Error(`Assertion failed: expected "${expectedText}" but got "${actualText}"`);
      }
  
      this.logger.log(`${indent}  ? Assertion passed`);
    }
  
    async findElement(selector) {
      let locator;
  
      switch (selector.by) {
        case 'id':
          locator = this.page.locator(`#${selector.value}`);
          break;
        case 'name':
          locator = this.page.locator(`[name="${selector.value}"]`);
          break;
        case 'css':
          locator = this.page.locator(selector.value);
          break;
        case 'xpath':
          locator = this.page.locator(`xpath=${selector.value}`);
          break;
        default:
          throw new Error(`Unknown selector type: ${selector.by}`);
      }
  
      await locator.waitFor({ 
        state: 'visible', 
        timeout: this.config.execution.actionTimeout 
      });
      
      return locator;
    }
  
    async wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    async handleDialog(step, indent) {
      this.logger.log(`${indent}  Å® Waiting for ${step.dialogType} dialog...`);
    
      const dialog = await this.page.waitForEvent('dialog', {
        timeout: this.config.execution.actionTimeout
      });
    
      // Validate dialog type
      if (step.dialogType && dialog.type() !== step.dialogType) {
        throw new Error(
          `Dialog type mismatch: expected "${step.dialogType}" but got "${dialog.type()}"`
        );
      }
    
      // Accept / Dismiss
      if (step.action === 'accept') {
        if (dialog.type() === 'prompt') {
          await dialog.accept(step.value ?? '');
          this.logger.log(`${indent}  Å® Prompt accepted with value "${step.value ?? ''}"`);
        } else {
          await dialog.accept();
          this.logger.log(`${indent}  Å® Dialog accepted (OK)`);
        }
      } else if (step.action === 'dismiss') {
        await dialog.dismiss();
        this.logger.log(`${indent}  Å® Dialog dismissed (Cancel)`);
      } else {
        throw new Error(`Unknown dialog action: ${step.action}`);
      }
    }
    
  }
  
  module.exports = ActionHandler;