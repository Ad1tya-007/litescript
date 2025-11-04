/**
 * Loops feature - simplified for loop syntax
 * Supports range loops, array/object iteration, and repeat loops
 */

/**
 * Transforms simplified loop syntax to standard JavaScript for loops
 * @param {string} source - The source code to transform
 * @returns {string} - The transformed code with standard for loops
 */
function transformLoops(source) {
  let output = source;

  // 1. Transform repeat loops: repeat 10 => for (let _ = 0; _ < 10; _++)
  // Pattern: repeat followed by a number (can be a variable or expression)
  const repeatPattern = /\brepeat\s+(\S+)/g;
  output = output.replace(repeatPattern, (match, count) => {
    return `for (let _ = 0; _ < ${count}; _++)`;
  });

  // 2. Transform range loops: for i in 0...5 => for (let i = 0; i < 5; i++)
  // Also handles: for i in 0..5..2 => for (let i = 0; i < 5; i += 2)
  // Pattern: for VAR in START...END or for VAR in START..END..STEP
  const rangePattern =
    /\bfor\s+(\w+)\s+in\s+(\d+(?:\.\d+)?)\s*\.\.\s*(\d+(?:\.\d+)?)(?:\s*\.\.\s*(\d+(?:\.\d+)?))?/g;
  output = output.replace(rangePattern, (match, varName, start, end, step) => {
    if (step) {
      // Has step: for i in 0..5..2
      return `for (let ${varName} = ${start}; ${varName} < ${end}; ${varName} += ${step})`;
    } else {
      // No step: for i in 0..5
      return `for (let ${varName} = ${start}; ${varName} < ${end}; ${varName}++)`;
    }
  });

  // Also handle two-dot syntax: for i in 0..5..2
  const rangePattern2 =
    /\bfor\s+(\w+)\s+in\s+(\d+(?:\.\d+)?)\s*\.\.\s*(\d+(?:\.\d+)?)(?:\s*\.\.\s*(\d+(?:\.\d+)?))?/g;
  output = output.replace(rangePattern2, (match, varName, start, end, step) => {
    if (step) {
      // Has step: for i in 0..5..2
      return `for (let ${varName} = ${start}; ${varName} < ${end}; ${varName} += ${step})`;
    } else {
      // No step: for i in 0..5 (treat as for i in 0...5)
      return `for (let ${varName} = ${start}; ${varName} < ${end}; ${varName}++)`;
    }
  });

  // 3. Transform array iteration: for a of arr => for (let a of arr)
  // Also handles destructuring: for [a, b] of arr => for (let [a, b] of arr)
  // Also handles function calls: for a of range(0,5) => for (let a of range(0,5))
  // Pattern: for DESTRUCTURE of EXPRESSION
  // Note: We need to be careful not to match "for a in arr" (object iteration)
  // Process matches manually to handle balanced parentheses in expressions
  const arrayOfPattern = /\bfor\s+(\[[^\]]+\]|\w+)\s+of\s+/g;
  const matches = [];
  let match;
  arrayOfPattern.lastIndex = 0;
  while ((match = arrayOfPattern.exec(output)) !== null) {
    matches.push(match);
  }

  // Process matches from right to left to maintain positions
  for (let i = matches.length - 1; i >= 0; i--) {
    const forMatch = matches[i];
    const startPos = forMatch.index;
    const afterOfPos = startPos + forMatch[0].length;

    // Extract the expression after "of" - need to handle function calls with balanced parens
    let pos = afterOfPos;
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let exprEnd = pos;

    // Find the end of the expression
    // Expression ends at: newline, semicolon, or when we hit another keyword
    while (pos < output.length) {
      const char = output[pos];

      if (!inString) {
        if (char === '"' || char === "'" || char === '`') {
          inString = true;
          stringChar = char;
        } else if (char === '(' || char === '[' || char === '{') {
          depth++;
        } else if (char === ')' || char === ']' || char === '}') {
          depth--;
        } else if (
          depth === 0 &&
          (char === '\n' ||
            char === ';' ||
            (char === ' ' &&
              /^\s*(in|of|for|while|if|else)\b/.test(output.substring(pos))))
        ) {
          // End of expression
          exprEnd = pos;
          break;
        }
      } else {
        if (char === stringChar) {
          inString = false;
        }
      }

      pos++;
    }

    if (pos >= output.length) {
      exprEnd = output.length;
    }

    const destructure = forMatch[1];
    const expression = output.substring(afterOfPos, exprEnd).trim();

    // Replace the match
    output =
      output.substring(0, startPos) +
      `for (let ${destructure} of ${expression})` +
      output.substring(exprEnd);
  }

  // 4. Transform object iteration: for a in arr => for (let a in arr)
  // Pattern: for VAR in OBJ (but not for VAR in NUMBER...NUMBER which is range)
  // We need to avoid matching range loops, so check that it's not a number pattern
  const objectInPattern = /\bfor\s+(\w+)\s+in\s+(\w+)/g;
  output = output.replace(objectInPattern, (match, varName, objName) => {
    // Skip if this was already transformed as a range loop
    // We can check if the pattern matches a number by checking if objName starts with a digit
    // But more importantly, we need to avoid re-transforming range loops
    // Since range loops use "in" with numbers, and we've already transformed those,
    // we can safely transform remaining "for VAR in OBJ" patterns
    // However, we need to be careful - let's check if it's already a for loop with parentheses
    // Actually, if we process range loops first, then this should only match object iteration

    // Check if this looks like a variable name (not a number pattern)
    // If objName matches a number pattern, skip (shouldn't happen after range transform, but be safe)
    if (/^\d+(\.\d+)?$/.test(objName)) {
      return match; // Don't transform, might be a range that wasn't caught
    }

    return `for (let ${varName} in ${objName})`;
  });

  // 5. Transform while loops: while condition => while (condition)
  // Also handles: while (condition) => while (condition) (already has brackets, keep as is)
  // Pattern: while CONDITION
  const whilePattern = /\bwhile\s+/g;
  const whileMatches = [];
  whilePattern.lastIndex = 0;
  while ((match = whilePattern.exec(output)) !== null) {
    whileMatches.push(match);
  }

  // Process matches from right to left to maintain positions
  for (let i = whileMatches.length - 1; i >= 0; i--) {
    const whileMatch = whileMatches[i];
    const startPos = whileMatch.index;
    const afterWhilePos = startPos + whileMatch[0].length;

    // Check if condition already starts with (
    const afterWhile = output.substring(afterWhilePos);
    if (afterWhile.trim().startsWith('(')) {
      // Already has parentheses, skip transformation
      continue;
    }

    // Extract the condition - need to handle balanced parentheses for complex conditions
    let pos = afterWhilePos;
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let conditionEnd = pos;

    // Find the end of the condition
    // Condition ends at: newline, semicolon, or when we hit another keyword
    while (pos < output.length) {
      const char = output[pos];

      if (!inString) {
        if (char === '"' || char === "'" || char === '`') {
          inString = true;
          stringChar = char;
        } else if (char === '(' || char === '[' || char === '{') {
          depth++;
        } else if (char === ')' || char === ']' || char === '}') {
          depth--;
        } else if (
          depth === 0 &&
          (char === '\n' ||
            char === ';' ||
            (char === ' ' &&
              /^\s*(for|while|if|else|return|break|continue)\b/.test(
                output.substring(pos)
              )))
        ) {
          // End of condition
          conditionEnd = pos;
          break;
        }
      } else {
        if (char === stringChar) {
          inString = false;
        }
      }

      pos++;
    }

    if (pos >= output.length) {
      conditionEnd = output.length;
    }

    const condition = output.substring(afterWhilePos, conditionEnd).trim();

    // Replace the match with parentheses around condition
    output =
      output.substring(0, startPos) +
      `while (${condition})` +
      output.substring(conditionEnd);
  }

  return output;
}

module.exports = {
  transformLoops,
};
