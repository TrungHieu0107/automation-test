// lib/xml-parser.js
const { parseString } = require("xml2js");

/**
 * XmlParser class handles parsing of XML test configuration files
 * for hierarchical test execution.
 */
class XmlParser {
  /**
   * Parses XML content string into a JavaScript object.
   * @param {string} xmlContent - The XML content as a string
   * @returns {Promise<object>} Parsed XML as a JavaScript object
   * @throws {Error} If XML parsing fails
   */
  async parse(xmlContent) {
    return new Promise((resolve, reject) => {
      parseString(
        xmlContent,
        {
          explicitArray: false,
          mergeAttrs: true,
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        },
      );
    });
  }

  /**
   * Extracts test nodes from parsed XML structure.
   * Handles both single test and array of tests.
   * @param {object} parsedXml - Parsed XML object with testList structure
   * @returns {Array<object>} Array of test objects extracted from XML
   * @throws {Error} If XML structure is invalid (missing testList or test elements)
   */
  extractTests(parsedXml) {
    if (!parsedXml.testList || !parsedXml.testList.test) {
      throw new Error(
        "Invalid XML structure: missing testList or test elements",
      );
    }

    const tests = Array.isArray(parsedXml.testList.test)
      ? parsedXml.testList.test
      : [parsedXml.testList.test];

    return tests;
  }
}

module.exports = XmlParser;
