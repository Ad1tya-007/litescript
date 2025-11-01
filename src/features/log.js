/**
 * Log feature - enhanced console.log with variable name display
 * Transforms log() calls to automatically show variable names
 * Examples:
 *   log(arr) -> console.log('arr =>', arr)
 *   log("label", arr) -> console.log('label =>', arr)
 *   log(arr1, arr2) -> console.log('arr1 =>', arr1, '\narr2 =>', arr2)
 */

/**
 * Parses arguments from a function call
 * Handles nested parentheses and strings
 * @param {string} argsStr - The arguments string (inside parentheses)
 * @returns {string[]} - Array of argument strings
 */
function parseArguments(argsStr) {
  if (!argsStr.trim()) return [];

  const args = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let i = 0;

  while (i < argsStr.length) {
    const char = argsStr[i];

    if (!inString) {
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
        current += char;
      } else if (char === '(' || char === '[' || char === '{') {
        depth++;
        current += char;
      } else if (char === ')' || char === ']' || char === '}') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    } else {
      current += char;
      if (char === stringChar && argsStr[i - 1] !== '\\') {
        inString = false;
      }
    }

    i++;
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args;
}

/**
 * Checks if a string is a string literal (quoted)
 * @param {string} str - The string to check
 * @returns {boolean} - True if it's a string literal
 */
function isStringLiteral(str) {
  const trimmed = str.trim();
  return (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('`') && trimmed.endsWith('`'))
  );
}

/**
 * Extracts the variable name from an expression
 * For simple identifiers like "arr", returns "arr"
 * For complex expressions, tries to extract a meaningful name
 * @param {string} expr - The expression
 * @returns {string} - The variable name or expression
 */
function extractVariableName(expr) {
  const trimmed = expr.trim();

  // If it's a simple identifier (variable name)
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(trimmed)) {
    return trimmed;
  }

  // If it's a property access like arr.property or arr.sort
  const propMatch = trimmed.match(
    /^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\.\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/
  );
  if (propMatch) {
    return trimmed; // Return full expression
  }

  // For other expressions, return as-is (will be displayed)
  return trimmed;
}

/**
 * Transforms log() calls to console.log() with formatting
 * @param {string} source - The source code to transform
 * @returns {string} - The transformed code
 */
function transformLog(source) {
  let output = source;

  // Pattern to match log( ... ) calls
  // Match log followed by parentheses with balanced content
  const logPattern = /\blog\s*\(/g;
  let match;

  // Process matches from right to left to maintain positions
  const matches = [];
  while ((match = logPattern.exec(source)) !== null) {
    matches.push(match);
  }

  // Process matches in reverse order
  for (let i = matches.length - 1; i >= 0; i--) {
    const logMatch = matches[i];
    const startPos = logMatch.index;

    // Find the matching closing parenthesis
    let pos = startPos + logMatch[0].length;
    let depth = 1;
    let inString = false;
    let stringChar = '';
    let endPos = pos;

    while (pos < source.length && depth > 0) {
      const char = source[pos];

      if (!inString) {
        if (char === '"' || char === "'" || char === '`') {
          inString = true;
          stringChar = char;
        } else if (char === '(' || char === '[' || char === '{') {
          depth++;
        } else if (char === ')' || char === ']' || char === '}') {
          depth--;
          if (depth === 0) {
            endPos = pos + 1;
            break;
          }
        }
      } else {
        if (char === stringChar && source[pos - 1] !== '\\') {
          inString = false;
        }
      }

      pos++;
    }

    if (depth === 0) {
      // Extract the arguments
      const argsStr = source.substring(
        startPos + logMatch[0].length,
        endPos - 1
      );
      const args = parseArguments(argsStr);

      if (args.length === 0) {
        // log() with no arguments -> console.log()
        output =
          output.substring(0, startPos) +
          'console.log()' +
          output.substring(endPos);
      } else if (args.length === 1) {
        // Single argument
        const arg = args[0];

        if (isStringLiteral(arg)) {
          // log("text") -> console.log("text")
          output =
            output.substring(0, startPos) +
            'console.log(' +
            arg +
            ')' +
            output.substring(endPos);
        } else {
          // log(arr) -> console.log('arr =>', arr)
          const varName = extractVariableName(arg);
          output =
            output.substring(0, startPos) +
            `console.log('${varName} =>', ${arg})` +
            output.substring(endPos);
        }
      } else {
        // Multiple arguments
        // Check if first arg is a string literal (label)
        const firstArg = args[0];
        const isFirstString = isStringLiteral(firstArg);

        // Check if ALL arguments are variables (not strings)
        const allAreVariables = args.every((arg) => !isStringLiteral(arg));

        if (isFirstString || !allAreVariables) {
          // If there's a label or mixed strings/variables - use normal console.log
          output =
            output.substring(0, startPos) +
            'console.log(' +
            args.join(', ') +
            ')' +
            output.substring(endPos);
        } else {
          // All arguments are variables - format each with => syntax
          const parts = [];
          for (let j = 0; j < args.length; j++) {
            const varName = extractVariableName(args[j]);
            if (j > 0) {
              parts.push(`'\\n${varName} =>'`);
            } else {
              parts.push(`'${varName} =>'`);
            }
            parts.push(args[j]);
          }
          output =
            output.substring(0, startPos) +
            `console.log(${parts.join(', ')})` +
            output.substring(endPos);
        }
      }
    }
  }

  return output;
}

module.exports = {
  transformLog,
};
