// lib/yaml-test-parser.js
const yaml = require('js-yaml');
const fs = require('fs').promises;

class YamlTestParser {
  constructor() {
    this.defaultTimeout = 30000;
  }

  async parseFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const yamlData = yaml.load(content);
    return this.convertToTestScenario(yamlData);
  }

  convertToTestScenario(yamlData) {
    return [{
      name: yamlData.test_name || yamlData.name,
      url: yamlData.url,
      steps: this.parseSteps(yamlData.steps),
      submit: this.parseSubmit(yamlData.submit),
      assertions: this.parseVerify(yamlData.verify)
    }];
  }

  parseSteps(steps) {
    return steps.map(step => {
      const stepType = Object.keys(step)[0];
      const stepData = step[stepType];

      switch (stepType) {
        case 'input':
          return this.parseInputStep(stepData);
        
        case 'click':
          return this.parseClickStep(stepData);
        
        case 'select_radio':
        case 'radio':
          return this.parseRadioStep(stepData);
        
        case 'select':
        case 'dropdown':
          return this.parseSelectStep(stepData);
        
        case 'checkbox':
        case 'check':
          return this.parseCheckboxStep(stepData);
        
        default:
          throw new Error(`Unknown step type: ${stepType}`);
      }
    });
  }

  parseInputStep(data) {
    // Smart selector detection
    const selector = this.detectSelector(data.field || data.name || data.id || data.selector);
    
    return {
      type: 'input',
      selector: selector,
      value: data.value,
      waitForNavigation: data.wait_for_reload || data.waitForReload || false
    };
  }

  parseClickStep(data) {
    const target = data.button || data.element || data.selector || data;
    const selector = this.detectSelector(target);
    
    return {
      type: 'click',
      selector: selector,
      waitForNavigation: data.wait_for_navigation || data.waitForNavigation || false,
      postNavigationWait: this.parseTime(data.wait_after)
    };
  }

  parseRadioStep(data) {
    const selector = this.detectSelector(data.xpath || data.id || data.name || data.selector);
    
    return {
      type: 'radio',
      selector: selector,
      value: data.value,
      verifyValue: data.verify || true,
      waitForNavigation: data.wait_for_reload || false
    };
  }

  parseSelectStep(data) {
    const selector = this.detectSelector(data.field || data.name || data.id);
    
    return {
      type: 'select',
      selector: selector,
      value: data.value,
      selectBy: data.select_by || data.by || 'value',
      verifyValue: data.verify || true
    };
  }

  parseCheckboxStep(data) {
    const selector = this.detectSelector(data.field || data.name || data.id);
    
    return {
      type: 'checkbox',
      selector: selector,
      value: data.value ?? data.checked ?? true,
      waitForNavigation: data.wait_for_reload || false
    };
  }

  parseSubmit(submit) {
    if (!submit) return null;

    const clickStep = {
      type: 'click',
      selector: this.detectSelector(submit.button || submit.click || submit.selector)
    };

    const result = {
      step: clickStep,
      waitForNavigation: submit.wait_for_navigation || submit.waitForNavigation || false,
      postSubmitWait: this.parseTime(submit.wait_after || submit.waitAfter)
    };

    // Handle dialogs
    if (submit.dialogs && Array.isArray(submit.dialogs)) {
      result.dialogs = submit.dialogs.map(dialog => {
        if (typeof dialog === 'string') {
          // Simple format: "confirm: accept"
          const parts = dialog.split(':').map(s => s.trim());
          return {
            type: 'dialog',
            dialogType: parts[0],
            action: parts[1] || 'accept'
          };
        } else if (typeof dialog === 'object') {
          // Object format
          const dialogType = Object.keys(dialog)[0];
          return {
            type: 'dialog',
            dialogType: dialogType,
            action: dialog[dialogType]
          };
        }
      });
    } else if (submit.dialog) {
      result.dialog = {
        type: 'dialog',
        dialogType: submit.dialog.type || 'confirm',
        action: submit.dialog.action || 'accept'
      };
    }

    return result;
  }

  parseVerify(verify) {
    if (!verify) return [];

    return verify.map(assertion => {
      if (typeof assertion === 'string') {
        // Simple text assertion: "Expected message"
        return {
          selector: { by: 'id', value: 'message' },
          type: 'text',
          expectedText: assertion
        };
      }

      if (assertion.message) {
        // Message assertion
        return {
          selector: { by: 'id', value: 'message' },
          type: 'text',
          expectedText: assertion.message
        };
      }

      if (assertion.input_value) {
        // Input value assertion
        return {
          selector: this.detectSelector(assertion.input_value.field),
          type: 'input',
          expectedText: assertion.input_value.equals || assertion.input_value.value
        };
      }

      if (assertion.style) {
        // Style assertion
        const element = assertion.style.element || assertion.style.selector;
        const selector = this.detectSelector(element);
        
        // Support multiple style properties
        const styleProps = Object.keys(assertion.style).filter(k => 
          k !== 'element' && k !== 'selector'
        );
        
        return styleProps.map(prop => ({
          selector: selector,
          type: 'style',
          styleProperty: this.camelToKebab(prop),
          expectedValue: this.normalizeStyleValue(prop, assertion.style[prop])
        }));
      }

      if (assertion.visible !== undefined) {
        // Visibility assertion
        return {
          selector: this.detectSelector(assertion.visible),
          type: 'visible',
          expectedValue: true
        };
      }

      if (assertion.hidden !== undefined) {
        // Hidden assertion
        return {
          selector: this.detectSelector(assertion.hidden),
          type: 'visible',
          expectedValue: false
        };
      }

      if (assertion.has_class) {
        // Class assertion
        return {
          selector: this.detectSelector(assertion.has_class.element),
          type: 'class',
          hasClass: assertion.has_class.class
        };
      }

      if (assertion.attribute) {
        // Attribute assertion
        return {
          selector: this.detectSelector(assertion.attribute.element),
          type: 'attribute',
          attributeName: assertion.attribute.name,
          expectedValue: assertion.attribute.value
        };
      }

      return assertion;
    }).flat();
  }

  /**
   * Smart selector detection - automatically determines selector type
   */
  detectSelector(value) {
    if (typeof value === 'object' && value.by && value.value) {
      // Already a selector object
      return value;
    }

    if (typeof value !== 'string') {
      throw new Error(`Invalid selector: ${value}`);
    }

    // XPath
    if (value.startsWith('/') || value.startsWith('(')) {
      return { by: 'xpath', value: value };
    }

    // CSS selector (starts with # . [ or contains space/>,+,~)
    if (value.match(/^[#.\[]/) || value.match(/[\s>+~]/)) {
      return { by: 'css', value: value };
    }

    // Default to name attribute
    return { by: 'name', value: value };
  }

  /**
   * Parse time strings like "2000ms", "2s" to milliseconds
   */
  parseTime(value) {
    if (!value) return undefined;
    if (typeof value === 'number') return value;
    
    const match = value.match(/^(\d+)(ms|s)?$/);
    if (!match) return undefined;
    
    const num = parseInt(match[1]);
    const unit = match[2] || 'ms';
    
    return unit === 's' ? num * 1000 : num;
  }

  /**
   * Convert camelCase to kebab-case for CSS properties
   */
  camelToKebab(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Normalize style values (e.g., "green" -> "rgb(0, 128, 0)")
   */
  normalizeStyleValue(property, value) {
    const colorNames = {
      'red': 'rgb(255, 0, 0)',
      'green': 'rgb(0, 128, 0)',
      'blue': 'rgb(0, 0, 255)',
      'white': 'rgb(255, 255, 255)',
      'black': 'rgb(0, 0, 0)',
      'gray': 'rgb(128, 128, 128)',
      'yellow': 'rgb(255, 255, 0)'
    };

    if (property === 'color' || property === 'background-color') {
      return colorNames[value.toLowerCase()] || value;
    }

    if (property === 'font-weight' || property === 'fontWeight') {
      if (value === 'bold') return 'bold';
      if (value === 'normal') return 'normal';
    }

    return value;
  }
}

module.exports = YamlTestParser;