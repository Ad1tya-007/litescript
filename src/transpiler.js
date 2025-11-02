/**
 * Core transpiler logic for litescript
 * Converts .ls files to JavaScript using regex-based transformations
 */

const { transformArrays } = require('./features/arrays');
const { transformCodeBlocks } = require('./features/codeblocks');
const { transformVariables } = require('./features/variables');
const { transformLog } = require('./features/log');
const { transformFunctions } = require('./features/functions');

/**
 * Transpiles litescript source code to JavaScript
 * @param {string} source - The litescript source code
 * @returns {string} - The transpiled JavaScript code
 */
function transpile(source) {
  let output = source;

  // Apply variable transformations first (remove let/const, auto-declare)
  output = transformVariables(output);

  // Apply function transformations (functionName(): to function functionName() {)
  output = transformFunctions(output);

  // Apply code block transformations (adds braces based on indentation)
  output = transformCodeBlocks(output);

  // Apply array transformations
  output = transformArrays(output);

  // Apply log transformations (enhanced console.log)
  output = transformLog(output);

  return output;
}

module.exports = {
  transpile,
};
