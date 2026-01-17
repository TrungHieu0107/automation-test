// lib/xml-parser.js
const { parseString } = require('xml2js');

class XmlParser {
  async parse(xmlContent) {
    return new Promise((resolve, reject) => {
      parseString(xmlContent, { 
        explicitArray: false,
        mergeAttrs: true 
      }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  extractTests(parsedXml) {
    if (!parsedXml.testList || !parsedXml.testList.test) {
      throw new Error('Invalid XML structure: missing testList or test elements');
    }

    const tests = Array.isArray(parsedXml.testList.test) 
      ? parsedXml.testList.test 
      : [parsedXml.testList.test];

    return tests;
  }
}

module.exports = XmlParser;