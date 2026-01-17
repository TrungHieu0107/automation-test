// lib/yaml-list-parser.js
const yaml = require('js-yaml')
const fs = require('fs').promises
const path = require('path')

class YamlListParser {
	constructor(projectRoot) {
		this.yamlTestParser = null
		this.projectRoot = projectRoot || process.cwd() // Default to current working directory
	}

	/**
	 * Parse a YAML test list file that references other scenario files
	 */
	async parseListFile(listFilePath) {
		const YamlTestParser = require('./yaml-test-parser')
		this.yamlTestParser = new YamlTestParser()

		const content = await fs.readFile(listFilePath, 'utf8')
		const listData = yaml.load(content)

		// Support both formats: test_list and tests
		const testList = listData.test_list || listData.tests

		if (!testList || !Array.isArray(testList)) {
			throw new Error('YAML list file must contain "test_list" or "tests" array')
		}

		// Parse each test node in the list
		const testNodes = []
		for (const item of testList) {
			const node = await this.parseListItem(item)
			testNodes.push(node)
		}

		return testNodes
	}

	/**
	 * Parse a single item from the test list
	 */
	async parseListItem(item) {
		// Format 1: Simple file path string
		if (typeof item === 'string') {
			return await this.loadScenarioFile(item)
		}

		// Format 2: Object with file property
		if (item.file) {
			const node = await this.loadScenarioFile(item.file)

			// Override name if provided
			if (item.name) {
				node.name = item.name
				node.scenario.name = item.name
			}

			// Parse children
			if (item.children && Array.isArray(item.children)) {
				node.children = []
				for (const child of item.children) {
					const childNode = await this.parseListItem(child)
					node.children.push(childNode)
				}
			}

			return node
		}

		// Format 3: Simple format - file path as key, children as value
		const keys = Object.keys(item)
		if (keys.length === 1) {
			const filePath = keys[0]
			const children = item[filePath]

			const node = await this.loadScenarioFile(filePath)

			if (children && Array.isArray(children)) {
				node.children = []
				for (const child of children) {
					const childNode = await this.parseListItem(child)
					node.children.push(childNode)
				}
			}

			return node
		}

		throw new Error(`Invalid test list item format: ${JSON.stringify(item)}`)
	}

	/**
	 * Load a scenario file and return as test node
	 * Supports both project-relative and list-relative paths
	 */
	async loadScenarioFile(relativePath, listFileDir) {
		let fullPath

		// Try absolute path first
		if (path.isAbsolute(relativePath)) {
			fullPath = relativePath
		}
		// Try project-relative path
		else {
			fullPath = path.join(this.projectRoot, relativePath)

			// If file doesn't exist and we have listFileDir, try list-relative
			try {
				await fs.access(fullPath)
			} catch (error) {
				if (listFileDir) {
					const listRelativePath = path.join(listFileDir, relativePath)
					try {
						await fs.access(listRelativePath)
						fullPath = listRelativePath
					} catch (e) {
						// Use original project-relative path for error message
					}
				}
			}
		}

		try {
			const content = await fs.readFile(fullPath, 'utf8')
			const scenarioData = yaml.load(content)

			return this.yamlTestParser.parseTestNode(scenarioData)
		} catch (error) {
			throw new Error(`Failed to load scenario file "${relativePath}": ${error.message}`)
		}
	}
}

module.exports = YamlListParser
