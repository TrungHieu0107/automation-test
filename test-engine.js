// test-engine.js
const { chromium } = require('playwright')
const fs = require('fs').promises
const path = require('path')
const yaml = require('js-yaml')

const Logger = require('./lib/logger')
const ActionHandler = require('./lib/action-handler')
const XmlParser = require('./lib/xml-parser')
const ReportGenerator = require('./lib/report-generator')

/**
 * TestEngine class is the main orchestrator for test execution.
 * Handles browser initialization, test execution (sequential or hierarchical),
 * screenshot capture, and test result management.
 */
class TestEngine {
	/**
	 * Creates an instance of TestEngine.
	 * @param {string} configPath - Path to the YAML configuration file
	 */
	constructor(configPath) {
		this.configPath = configPath
		this.config = null
		this.browser = null
		this.context = null
		this.page = null
		this.testResults = []

		// Modules
		this.logger = null
		this.actionHandler = null
		this.xmlParser = null
		this.reportGenerator = null
	}

	/**
	 * Initializes the test engine by loading configuration, setting up directories,
	 * launching the browser, and initializing all required modules.
	 * @returns {Promise<void>}
	 */
	async initialize() {
		// Load configuration
		const configFile = await fs.readFile(this.configPath, 'utf8')
		this.config = yaml.load(configFile)

		// Initialize modules
		this.logger = new Logger(this.config)
		this.xmlParser = new XmlParser()

		this.logger.log('=================================================')
		this.logger.log('  WEB AUTOMATION TEST ENGINE - INITIALIZATION')
		this.logger.log('=================================================')

		// Setup directories
		await this.ensureDirectories()

		// Launch browser
		this.logger.log('Launching Microsoft Edge browser...')
		this.browser = await chromium.launch({
			headless: this.config.browser.headless || false,
			channel: 'msedge',
			args: this.config.browser.args || [],
		})

		// Create context
		this.context = await this.browser.newContext({
			viewport: this.config.browser.viewport || { width: 1280, height: 720 },
			ignoreHTTPSErrors: true,
		})

		this.page = await this.context.newPage()
		this.page.setDefaultTimeout(this.config.execution.actionTimeout || 30000)

		// Initialize action handler after page is ready
		this.actionHandler = new ActionHandler(this.page, this.config, this.logger)
		this.reportGenerator = new ReportGenerator(this.config, this.logger)

		this.logger.logSuccess('Test engine initialized successfully')
		this.logger.log('=================================================\n')
	}

	/**
	 * Ensures required directories exist for screenshots and reports.
	 * Optionally cleans up directories before creating them based on configuration.
	 * @returns {Promise<void>}
	 */
	async ensureDirectories() {
		const dirs = [this.config.screenshots.outputPath, this.config.screenshots.failurePath]

		for (const dir of dirs) {
			if (this.config.screenshots.cleanupBeforeRun) {
				try {
					await fs.rm(dir, { recursive: true, force: true })
					this.logger.log(`Cleaned up directory: ${dir}`)
				} catch (error) {
					if (error.code !== 'ENOENT') {
						this.logger.logError(`Failed to cleanup directory ${dir}`, error)
					}
				}
			}

			await fs.mkdir(dir, { recursive: true })
			this.logger.log(`Ensured directory exists: ${dir}`)
		}
	}

	/**
	 * Main entry point for running tests. Determines test type (XML hierarchical or JSON sequential)
	 * and routes to appropriate execution method. Generates reports after completion.
	 * @param {string} testScenarioPath - Path to test scenario file (.json or .xml)
	 * @returns {Promise<void>}
	 * @throws {Error} If test execution fails
	 */
	async runTests(testScenarioPath) {
		try {
			if (testScenarioPath.endsWith('.xml')) {
				await this.runHierarchicalTests(testScenarioPath)
			} else {
				await this.runSequentialTests(testScenarioPath)
			}

			await this.reportGenerator.generate(this.testResults)
			this.logger.log('All tests completed')
		} catch (error) {
			this.logger.logError('Test execution failed', error)
			throw error
		}
	}

	async runTests(testScenarioPath) {
		try {
			if (testScenarioPath.endsWith('.xml')) {
				await this.runHierarchicalTests(testScenarioPath)
			} else if (testScenarioPath.endsWith('.yaml') || testScenarioPath.endsWith('.yml')) {
				await this.runYamlTests(testScenarioPath)
			} else {
				await this.runSequentialTests(testScenarioPath)
			}

			await this.reportGenerator.generate(this.testResults)
			this.logger.log('All tests completed')
		} catch (error) {
			this.logger.logError('Test execution failed', error)
			throw error
		}
	}

	/**
	 * Runs tests from YAML configuration - auto-detects list vs scenario file
	 * @param {string} yamlPath - Path to YAML file (list or scenario)
	 * @returns {Promise<void>}
	 */
	async runYamlTests(yamlPath) {
		const content = await fs.readFile(yamlPath, 'utf8')
		const yamlData = yaml.load(content)

		// Detect if this is a test list or a scenario file
		const isListFile = yamlData.test_list || yamlData.tests

		if (isListFile) {
			await this.runYamlListTests(yamlPath)
		} else {
			await this.runYamlScenarioTests(yamlPath)
		}
	}
	
	/**
	 * Runs tests from a YAML test list file
	 * @param {string} listFilePath - Path to YAML test list file
	 * @returns {Promise<void>}
	 */
	async runYamlListTests(listFilePath) {
		const YamlListParser = require('./lib/yaml-list-parser')

		// Pass project root to parser
		const projectRoot = process.cwd()
		const parser = new YamlListParser(projectRoot)

		this.logger.log('Loading YAML test list configuration...')
		this.logger.log(`Project root: ${projectRoot}`)

		const testNodes = await parser.parseListFile(listFilePath)

		this.logger.log(`Found ${testNodes.length} root test(s) in test list`)

		for (const testNode of testNodes) {
			await this.executeYamlTestNode(testNode, 0)
		}
	}

	/**
	 * Runs tests from a YAML scenario file (single test or with inline children)
	 * @param {string} yamlPath - Path to YAML scenario file
	 * @returns {Promise<void>}
	 */
	async runYamlScenarioTests(yamlPath) {
		const YamlTestParser = require('./lib/yaml-test-parser')
		const parser = new YamlTestParser()

		this.logger.log('Loading YAML test scenario...')
		const testNodes = await parser.parseFile(yamlPath)

		this.logger.log(`Found ${testNodes.length} root test(s) in scenario`)

		for (const testNode of testNodes) {
			await this.executeYamlTestNode(testNode, 0)
		}
	}

	/**
	 * Runs tests sequentially from a JSON test scenario file.
	 * Executes each test case one after another in the order they appear in the file.
	 * @param {string} jsonPath - Path to the JSON test scenario file
	 * @returns {Promise<void>}
	 */
	async runSequentialTests(jsonPath) {
		const scenarioFile = await fs.readFile(jsonPath, 'utf8')
		const testScenarios = JSON.parse(scenarioFile)

		this.logger.log(`Loaded ${testScenarios.length} test scenarios`)

		for (const testCase of testScenarios) {
			await this.executeTestCase(testCase)
		}
	}

	/**
	 * Runs hierarchical tests from an XML test configuration file.
	 * Loads and parses XML structure to execute tests in a parent-child hierarchy.
	 * @param {string} xmlPath - Path to the XML test configuration file
	 * @returns {Promise<void>}
	 */
	async runHierarchicalTests(xmlPath) {
		this.logger.log('Loading hierarchical test configuration from XML...')

		const xmlContent = await fs.readFile(xmlPath, 'utf8')
		const testStructure = await this.xmlParser.parse(xmlContent)
		const tests = this.xmlParser.extractTests(testStructure)
		const baseDir = path.dirname(xmlPath)

		this.logger.log(`Found ${tests.length} root test(s) in hierarchy`)

		for (const test of tests) {
			await this.executeTestHierarchy(test, baseDir, 0)
		}
	}

	/**
	 * Executes a test node in the hierarchical test structure.
	 * Recursively executes child tests if the parent test passes.
	 * @param {object} testNode - Test node object containing name, file, and optional child tests
	 * @param {string} baseDir - Base directory path for resolving test file paths
	 * @param {number} level - Hierarchy level for indentation and logging
	 * @param {boolean} [skipNavigation=false] - Whether to skip navigation for child tests
	 * @returns {Promise<boolean>} True if all tests passed, false otherwise
	 */
	async executeTestHierarchy(testNode, baseDir, level, skipNavigation = false) {
		const testName = testNode.name
		const testFile = testNode.file
		const indent = '  '.repeat(level)

		this.logger.log(`${indent}📋 Executing: ${testName} (${testFile})`)

		const testFilePath = path.join(baseDir, testFile)
		let testPassed = false

		try {
			const scenarioFile = await fs.readFile(testFilePath, 'utf8')
			const testScenarios = JSON.parse(scenarioFile)

			for (const testCase of testScenarios) {
				const result = await this.executeTestCase(testCase, level, skipNavigation)

				if (result.status !== 'passed') {
					testPassed = false
					this.logger.log(`${indent}  ✗ Test node "${testName}" failed - skipping child tests`)
					return false
				}
			}

			testPassed = true
			this.logger.log(`${indent}  ✓ Test node "${testName}" passed`)
		} catch (error) {
			this.logger.logError(`${indent}  Failed to load test file: ${testFile}`, error)
			return false
		}

		// Execute child tests
		if (testPassed && testNode.test) {
			const childTests = Array.isArray(testNode.test) ? testNode.test : [testNode.test]
			this.logger.log(`${indent}  → Executing ${childTests.length} child test(s)...`)

			for (const childTest of childTests) {
				const childPassed = await this.executeTestHierarchy(childTest, baseDir, level + 1, true)

				if (!childPassed && this.config.execution.stopOnChildFailure) {
					this.logger.log(`${indent}  ⚠ Child test failed - stopping sibling execution`)
					break
				}
			}
		}

		return testPassed
	}

	/**
	 * Executes a single test case including navigation, steps, submit action, and assertion.
	 * Captures screenshots at configured stages and handles test failures.
	 * @param {object} testCase - Test case object containing name, url, steps, submit, and assertion
	 * @param {number} [hierarchyLevel=0] - Hierarchy level for indentation
	 * @param {boolean} [skipNavigation=false] - Whether to skip navigation (for child tests)
	 * @returns {Promise<object>} Test result object with status, steps, error, and screenshots
	 */
	async executeTestCase(testCase, hierarchyLevel = 0, skipNavigation = false) {
		const testName = testCase.name
		const indent = '  '.repeat(hierarchyLevel)

		this.logger.log(`\n${indent}========================================`)
		this.logger.log(`${indent}Executing test: ${testName}`)
		this.logger.log(`${indent}========================================`)

		const testResult = {
			name: testName,
			status: 'pending',
			steps: [],
			error: null,
			screenshots: [],
			hierarchyLevel: hierarchyLevel,
			skippedNavigation: skipNavigation,
		}

		try {
			// Navigate or continue on same page
			if (!skipNavigation) {
				await this.navigateToTestUrl(testCase, indent)
			} else {
				await this.prepareChildTest(indent)
			}

			// Execute steps
			await this.executeSteps(testCase.steps, testResult, indent)

			// Screenshot before submit
			if (this.config.screenshots.captureBeforeSubmit) {
				testResult.screenshots.push(await this.captureScreenshot(testName, 'before-submit'))
			}

			// Submit
			this.logger.log(`${indent}Executing submit action...`)
			await this.actionHandler.executeSubmit(testCase.submit, indent)

			if (testCase.submit.postSubmitWait) {
				this.logger.log(`${indent}Waiting ${testCase.submit.postSubmitWait}ms after submit...`)
				await this.wait(testCase.submit.postSubmitWait)
			}

			// Screenshot after submit
			if (this.config.screenshots.captureAfterSubmit) {
				testResult.screenshots.push(await this.captureScreenshot(testName, 'after-submit'))
			}

			// Assertion - support both single and multiple
			if (testCase.assertions && Array.isArray(testCase.assertions)) {
				this.logger.log(`${indent}Executing ${testCase.assertions.length} assertions...`)
				await this.actionHandler.executeAssertions(testCase.assertions, indent)
			} else if (testCase.assertion) {
				this.logger.log(`${indent}Executing assertion...`)
				await this.actionHandler.executeAssertion(testCase.assertion, indent)
			} else {
				this.logger.log(`${indent}⚠ No assertions defined for this test`)
			}

			testResult.status = 'passed'
			this.logger.logSuccess(`${indent}Test "${testName}" PASSED`)
		} catch (error) {
			testResult.status = 'failed'
			testResult.error = error.message
			this.logger.logFailure(`${indent}Test "${testName}" FAILED: ${error.message}`)

			if (this.config.screenshots.captureOnFailure) {
				testResult.screenshots.push(await this.captureScreenshot(testName, 'failure', true))
			}

			if (this.config.execution.stopOnFailure) {
				throw error
			}
		} finally {
			this.testResults.push(testResult)
		}

		return testResult
	}

	/**
	 * Navigates to the test URL specified in the test case or configuration.
	 * Optionally waits for additional time after page load.
	 * @param {object} testCase - Test case object containing optional url property
	 * @param {string} indent - Indentation string for logging output
	 * @returns {Promise<void>}
	 */
	async navigateToTestUrl(testCase, indent) {
		const targetUrl = testCase.url || this.config.browser.baseUrl
		if (targetUrl) {
			this.logger.log(`${indent}Navigating to: ${targetUrl}`)
			await this.page.goto(targetUrl, {
				waitUntil: 'domcontentloaded',
				timeout: this.config.execution.navigationTimeout || 30000,
			})
			this.logger.log(`${indent}  → Page loaded successfully`)

			if (this.config.execution.pageLoadWait) {
				await this.wait(this.config.execution.pageLoadWait)
			}
		}
	}

	/**
	 * Prepares for a child test execution by waiting on the current page.
	 * Used when child tests continue on the same page without navigation.
	 * @param {string} indent - Indentation string for logging output
	 * @returns {Promise<void>}
	 */
	async prepareChildTest(indent) {
		this.logger.log(`${indent}Continuing on current page (child test - no navigation)`)

		if (this.config.execution.childTestDelay) {
			this.logger.log(
				`${indent}  → Waiting ${this.config.execution.childTestDelay}ms before child test...`,
			)
			await this.wait(this.config.execution.childTestDelay)
		}
	}

	/**
	 * Executes a sequence of test steps. Detects click-dialog patterns and handles them together.
	 * Tracks step execution status in the test result.
	 * @param {Array<object>} steps - Array of test step objects
	 * @param {object} testResult - Test result object to update with step statuses
	 * @param {string} indent - Indentation string for logging output
	 * @returns {Promise<void>}
	 */
	async executeSteps(steps, testResult, indent) {
		for (let i = 0; i < steps.length; i++) {
			const step = steps[i]
			const nextStep = i + 1 < steps.length ? steps[i + 1] : null

			// Check if this is a click followed by a dialog
			if (step.type === 'click' && nextStep && nextStep.type === 'dialog') {
				this.logger.log(
					`${indent}Step ${i + 1}/${steps.length}: ${step.type} - ${step.selector.by}="${step.selector.value}" (will trigger dialog)`,
				)

				// Handle click with dialog - set up dialog listener before clicking
				await this.actionHandler.executeStepWithDialog(step, nextStep, indent)
				testResult.steps.push({ step: i + 1, status: 'passed' })
				testResult.steps.push({ step: i + 2, status: 'passed' })

				// Skip the next step since we already handled it
				i++
			} else {
				this.logger.log(
					`${indent}Step ${i + 1}/${steps.length}: ${step.type}${step.selector ? ` - ${step.selector.by}="${step.selector.value}"` : ''}`,
				)

				await this.actionHandler.executeStep(step, indent)
				testResult.steps.push({ step: i + 1, status: 'passed' })
			}

			if (this.config.execution.stepDelay) {
				await this.wait(this.config.execution.stepDelay)
			}
		}
	}

	/**
	 * Captures a screenshot of the current page and saves it to the appropriate directory.
	 * @param {string} testName - Name of the test for filename generation
	 * @param {string} stage - Stage of test (e.g., 'before-submit', 'after-submit', 'failure')
	 * @param {boolean} [isFailure=false] - Whether this is a failure screenshot
	 * @returns {Promise<string>} Full path to the saved screenshot file
	 */
	async captureScreenshot(testName, stage, isFailure = false) {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
		const filename = `${testName.replace(/\s+/g, '_')}_${stage}_${timestamp}.png`

		const outputPath = isFailure
			? this.config.screenshots.failurePath
			: this.config.screenshots.outputPath

		const fullPath = path.join(outputPath, filename)

		await this.page.screenshot({
			path: fullPath,
			fullPage: this.config.screenshots.fullPage || false,
		})

		this.logger.log(`  📸 Screenshot saved: ${fullPath}`)
		return fullPath
	}

	/**
	 * Waits for a specified number of milliseconds.
	 * @param {number} ms - Number of milliseconds to wait
	 * @returns {Promise<void>} Promise that resolves after the specified delay
	 */
	async wait(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}

	/**
	 * Cleans up browser resources by closing the page, context, and browser.
	 * Should be called after all tests are completed.
	 * @returns {Promise<void>}
	 */
	async cleanup() {
		try {
			if (this.page) await this.page.close()
			if (this.context) await this.context.close()
			if (this.browser) await this.browser.close()
			this.logger.log('Cleanup completed')
		} catch (error) {
			this.logger.logError('Cleanup failed', error)
		}
	}
}

/**
 * Main execution function for command-line usage.
 * Parses command-line arguments for config and test scenario paths,
 * initializes the test engine, runs tests, and handles cleanup.
 * @returns {Promise<void>}
 */
async function main() {
	const configPath = process.argv[2] || './config.yaml'
	const testScenarioPath = process.argv[3] || './test-scenarios.json'

	const engine = new TestEngine(configPath)

	try {
		await engine.initialize()
		await engine.runTests(testScenarioPath)
	} catch (error) {
		console.error('Fatal error:', error)
		process.exit(1)
	} finally {
		await engine.cleanup()
	}
}

if (require.main === module) {
	main()
}

module.exports = TestEngine
