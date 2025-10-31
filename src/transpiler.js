/**
 * Core transpiler logic for litescript
 * Converts .ls files to JavaScript using regex-based transformations
 */

const { transformArrays } = require('./features/arrays');

/**
 * Transpiles litescript source code to JavaScript
 * @param {string} source - The litescript source code
 * @returns {string} - The transpiled JavaScript code
 */
function transpile(source) {
  let output = source;

  // Apply array transformations
  output = transformArrays(output);

  return output;
}

module.exports = {
  transpile,
};
