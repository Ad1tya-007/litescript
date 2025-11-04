/**
 * Array feature transformations
 * Handles simplified array operations for competitive programming
 */

/**
 * Parses comma-separated arguments, handling nested parentheses correctly
 */
function parseArguments(content) {
  const args = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args;
}

/**
 * Finds the rightmost occurrence of array property access (arr.method)
 * This helps process inner expressions first in nested calls
 */
function findRightmostProperty(str, property) {
  // Find the rightmost occurrence of .property
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `\\.\\s*${escapedProperty}(?=\\s*(?:\\(|;|,|\\]|\\)|$|\\s))`,
    'g'
  );

  let match;
  let lastMatch = null;
  let lastIndex = -1;

  pattern.lastIndex = 0;
  while ((match = pattern.exec(str)) !== null) {
    if (match.index > lastIndex) {
      lastIndex = match.index;
      lastMatch = match;
    }
  }

  if (lastMatch) {
    // Extract the expression immediately before this .property
    // Walk backwards from the dot to find the expression
    const dotPos = lastMatch.index;
    let pos = dotPos - 1;

    // Skip whitespace before the dot
    while (pos >= 0 && /\s/.test(str[pos])) {
      pos--;
    }

    // Now walk backwards to find where the expression starts
    // We want to capture: identifier, or expression ending with ] or )
    let exprEnd = pos + 1;
    let exprStart = exprEnd;

    if (pos >= 0 && (str[pos] === ']' || str[pos] === ')')) {
      // Expression ends with bracket/paren - find matching opening
      const closing = str[pos];
      let depth = 1;
      exprStart = pos;
      pos--;
      while (pos >= 0 && depth > 0) {
        if (str[pos] === (closing === ']' ? '[' : '(')) {
          depth--;
          if (depth === 0) {
            exprStart = pos;
            // Check if there's more before this (like [...expr])
            if (pos > 2 && str.substring(pos - 3, pos) === '[...') {
              exprStart = pos - 3;
            }
            break;
          }
        } else if (str[pos] === closing) {
          depth++;
        }
        pos--;
      }
    } else {
      // Regular identifier - walk backwards to find its start
      // Stop at operators, assignment, or other non-identifier characters
      while (pos >= 0 && /[\w$]/.test(str[pos])) {
        pos--;
      }
      exprStart = pos + 1;
    }

    // Skip any whitespace before the expression, but stop at operators/assignment
    // Important: exprStart currently points to the first char of identifier
    // We want to include whitespace before it, but stop at operators
    let finalStart = exprStart;
    while (finalStart > 0 && /\s/.test(str[finalStart - 1])) {
      finalStart--;
    }
    // If there's an operator before the whitespace, don't skip it
    if (
      finalStart > 0 &&
      /[=+\-*\/<>!&|?:,;\[\{\(]/.test(str[finalStart - 1])
    ) {
      // Operator found - expression starts after it (don't include whitespace after operator)
      finalStart = exprStart; // Keep original start
    }
    exprStart = finalStart;

    const arrExpr = str.substring(exprStart, exprEnd).trim();
    return { index: exprStart, arrExpr };
  }
  return null;
}

/**
 * Transforms array operations in the source code
 * Handles nested function calls by applying transformations from inside-out
 * @param {string} source - The source code to transform
 * @returns {string} - The transformed code
 */
function transformArrays(source) {
  let output = source;
  let changed = true;
  const maxPasses = 100; // Prevent infinite loops
  let pass = 0;

  // Unified array of all transformations
  // type: 'property' for arr.property, 'standalone' for function calls
  // argCount: number of arguments (or array for multiple valid counts)
  // replacement: function that takes appropriate arguments
  const transformations = [
    // Zero-argument property transformations (arr.property)
    {
      name: 'sort',
      type: 'property',
      argCount: 0,
      replacement: (arrExpr) => `${arrExpr}.sort((a,b)=>a-b)`,
    },
    {
      name: 'reverse',
      type: 'property',
      argCount: 0,
      replacement: (arrExpr) => `${arrExpr}.reverse()`,
    },
    {
      name: 'unique',
      type: 'property',
      argCount: 0,
      replacement: (arrExpr) => `[...new Set(${arrExpr})]`,
    },
    {
      name: 'sum',
      type: 'property',
      argCount: 0,
      replacement: (arrExpr) => `${arrExpr}.reduce((a,b) => a + b, 0)`,
    },
    {
      name: 'max',
      type: 'property',
      argCount: 0,
      replacement: (arrExpr) => `Math.max(...${arrExpr})`,
    },
    {
      name: 'min',
      type: 'property',
      argCount: 0,
      replacement: (arrExpr) => `Math.min(...${arrExpr})`,
    },
    {
      name: 'len',
      type: 'property',
      argCount: 0,
      replacement: (arrExpr) => `${arrExpr}.length`,
    },
    {
      name: 'mul',
      type: 'property',
      argCount: 0,
      replacement: (arrExpr) => `${arrExpr}.reduce((a,b) => a * b, 1)`,
    },
    // One-argument property transformations (arr.property(value))
    {
      name: 'filter!',
      type: 'property',
      argCount: 1,
      replacement: (arrExpr, value) => `${arrExpr}.filter(v => v !== ${value})`,
    },
    {
      name: 'filter',
      type: 'property',
      argCount: 1,
      replacement: (arrExpr, value) => `${arrExpr}.filter(v => v === ${value})`,
    },
    {
      name: 'count!',
      type: 'property',
      argCount: 1,
      replacement: (arrExpr, value) =>
        `${arrExpr}.filter(v => v !== ${value}).length`,
    },
    {
      name: 'count',
      type: 'property',
      argCount: 1,
      replacement: (arrExpr, value) =>
        `${arrExpr}.filter(v => v === ${value}).length`,
    },
    // Standalone function transformations (range(x, y) or range(x, y, increment))
    {
      name: 'range',
      type: 'standalone',
      argCount: [2, 3], // Can accept 2 or 3 arguments
      replacement: (args) => {
        if (args.length === 3) {
          // range(x, y, increment)
          const absIncrement = `Math.abs(${args[2]})`;
          return `((${args[0]}) < (${args[1]}) ? Array.from({ length: Math.ceil((((${args[1]}) - (${args[0]})) / ${absIncrement})) }, (_, i) => (+${args[0]}) + i * ${absIncrement}) : Array.from({ length: Math.ceil((((${args[0]}) - (${args[1]})) / ${absIncrement})) }, (_, i) => (+${args[0]}) - i * ${absIncrement}))`;
        } else if (args.length === 2) {
          // range(x, y) - backward compatibility
          return `((${args[0]}) < (${args[1]}) ? Array.from({ length: (${args[1]}) - (${args[0]}) }, (_, i) => (+${args[0]}) + i) : Array.from({ length: (${args[0]}) - (${args[1]}) }, (_, i) => (+${args[0]}) - i))`;
        }
        return null; // Explicit return for invalid arg counts
      },
    },
  ];

  // Helper function to check if argument count matches
  function matchesArgCount(actualCount, expectedCount) {
    if (Array.isArray(expectedCount)) {
      return expectedCount.includes(actualCount);
    }
    return actualCount === expectedCount;
  }

  // Helper function to check if arguments are simple (not functions)
  function areSimpleArgs(args) {
    // For standalone functions with 0 args, we still want to allow them
    // (though range requires at least 2 args, this is more general)
    if (args.length === 0) return false;
    return args.every(
      (arg) => !arg.includes('=>') && !arg.includes('function')
    );
  }

  // Apply transformations in multiple passes to handle nesting
  while (changed && pass < maxPasses) {
    pass++;
    changed = false;

    // Collect all matches from all transformations
    const allMatches = [];

    // Process all transformations in a single loop
    for (const transform of transformations) {
      if (transform.type === 'standalone') {
        // Handle standalone function calls (e.g., range(x, y, increment))
        // Create a new pattern each time to avoid state issues
        const pattern = new RegExp(
          `\\b${transform.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(`,
          'g'
        );
        const matches = [];
        // Reset lastIndex and find all matches
        pattern.lastIndex = 0;
        let m;
        while ((m = pattern.exec(output)) !== null) {
          matches.push(m);
          // Prevent infinite loop on zero-length matches
          if (m[0].length === 0) {
            pattern.lastIndex++;
          }
        }

        // Process from right to left (rightmost first)
        for (let i = matches.length - 1; i >= 0; i--) {
          const funcMatch = matches[i];
          const funcStartPos = funcMatch.index;

          // Find matching closing parenthesis
          let pos = funcStartPos + funcMatch[0].length;
          let depth = 1;
          let inString = false;
          let stringChar = '';
          let funcEndPos = pos;

          while (pos < output.length && depth > 0) {
            const char = output[pos];
            if (!inString) {
              if (char === '"' || char === "'" || char === '`') {
                inString = true;
                stringChar = char;
              } else if (char === '(' || char === '[' || char === '{') {
                depth++;
              } else if (char === ')' || char === ']' || char === '}') {
                depth--;
                if (depth === 0) {
                  funcEndPos = pos + 1;
                  break;
                }
              }
            } else {
              if (char === stringChar) {
                inString = false;
              }
            }
            pos++;
          }

          if (depth === 0) {
            const argsStr = output.substring(
              funcStartPos + funcMatch[0].length,
              funcEndPos - 1
            );
            const args = parseArguments(argsStr);

            if (
              matchesArgCount(args.length, transform.argCount) &&
              areSimpleArgs(args)
            ) {
              const replacement = transform.replacement(args);
              if (replacement) {
                allMatches.push({
                  start: funcStartPos,
                  end: funcEndPos,
                  replacement,
                });
                break; // Only process rightmost match for this transform
              }
            }
          }
        }
      } else {
        // Handle property transformations (arr.property)
        const propMatch = findRightmostProperty(output, transform.name);
        if (propMatch) {
          // Skip if arrExpr is already a transformed expression (starts with [...)
          if (propMatch.arrExpr.trim().startsWith('[...')) {
            continue;
          }

          const patternToMatch = `${propMatch.arrExpr.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          )}\\s*\\.\\s*${transform.name.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          )}`;
          const fullMatch = output
            .substring(propMatch.index)
            .match(new RegExp(`^${patternToMatch}`));

          if (fullMatch) {
            const afterProperty = output.substring(
              propMatch.index + fullMatch[0].length
            );

            if (transform.argCount === 0) {
              // Zero-argument property (arr.property or arr.property())
              let shouldTransform = false;
              if (!afterProperty || /^\s/.test(afterProperty)) {
                const parenMatch = afterProperty.match(/^\s*\(([^)]*)\)/);
                if (parenMatch && !parenMatch[1].trim()) {
                  shouldTransform = true;
                } else if (!parenMatch || !parenMatch[0]) {
                  shouldTransform = true;
                }
              } else {
                const firstChar = afterProperty[0];
                if (firstChar === '(') {
                  const parenMatch = afterProperty.match(/^\s*\(([^)]*)\)/);
                  if (parenMatch && !parenMatch[1].trim()) {
                    shouldTransform = true;
                  }
                } else if (
                  firstChar === ';' ||
                  firstChar === ',' ||
                  firstChar === ']' ||
                  firstChar === ')'
                ) {
                  shouldTransform = true;
                }
              }

              if (shouldTransform) {
                const dotPos = output.indexOf('.', propMatch.index);
                const endPos =
                  dotPos !== -1
                    ? dotPos + 1 + transform.name.length
                    : propMatch.index + fullMatch[0].length;
                const hasEmptyParens = afterProperty.match(/^\s*\(\)/);
                const finalEndPos = hasEmptyParens
                  ? endPos + hasEmptyParens[0].length
                  : endPos;

                const replacement = transform.replacement(propMatch.arrExpr);
                allMatches.push({
                  start: propMatch.index,
                  end: finalEndPos,
                  replacement,
                });
              }
            } else {
              // One-argument property (arr.property(value))
              const parenMatch = afterProperty.match(/^\s*\(([^)]+)\)/);
              if (parenMatch) {
                const args = parseArguments(parenMatch[1]);
                if (
                  matchesArgCount(args.length, transform.argCount) &&
                  areSimpleArgs(args)
                ) {
                  const replacement = transform.replacement(
                    propMatch.arrExpr,
                    args[0]
                  );
                  allMatches.push({
                    start: propMatch.index,
                    end:
                      propMatch.index +
                      fullMatch[0].length +
                      parenMatch[0].length,
                    replacement,
                  });
                }
              }
            }
          }
        }
      }
    }

    // Find the absolute rightmost match across all transformations
    if (allMatches.length > 0) {
      // Sort by start index descending to get rightmost
      allMatches.sort((a, b) => b.start - a.start);
      const rightmostMatch = allMatches[0];

      if (rightmostMatch && rightmostMatch.replacement) {
        output =
          output.substring(0, rightmostMatch.start) +
          rightmostMatch.replacement +
          output.substring(rightmostMatch.end);
        changed = true;
      }
    }
  }

  return output;
}

module.exports = {
  transformArrays,
};
