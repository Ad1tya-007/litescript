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
 * Extracts a balanced expression from parentheses starting at a keyword position
 * Handles nested parentheses correctly
 */
function extractBalancedExpr(str, keywordPos, keyword) {
  let i = keywordPos;

  // Skip past the keyword
  if (keyword) {
    // Escape special regex characters in keyword, but handle special cases
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // For keywords ending with !, we need to match without word boundary after !
    const keywordPattern = keyword.endsWith('!')
      ? new RegExp(`^\\b${escapedKeyword.slice(0, -1)}\\b!`)
      : new RegExp(`^\\b${escapedKeyword}\\b`);
    const keywordMatch = str.substring(i).match(keywordPattern);
    if (!keywordMatch) return null;
    i += keywordMatch[0].length;
  }

  // Skip whitespace to find opening parenthesis
  while (i < str.length && /\s/.test(str[i])) {
    i++;
  }

  if (i >= str.length || str[i] !== '(') return null;

  const start = i;
  let depth = 1;
  i++;

  // Find matching closing parenthesis
  while (i < str.length && depth > 0) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') depth--;
    i++;
  }

  if (depth === 0) {
    return {
      content: str.substring(start + 1, i - 1).trim(),
      start: keywordPos, // Return start of keyword for replacement
      end: i,
    };
  }
  return null;
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

  // Array property transformations (arr.property)
  const propertyTransformations = [
    {
      property: 'sort',
      replacement: (arrExpr) => `[...${arrExpr}].sort((a,b)=>a-b)`,
    },
    {
      property: 'reverse',
      replacement: (arrExpr) => `[...${arrExpr}].reverse()`,
    },
    {
      property: 'unique',
      replacement: (arrExpr) => `[...new Set(${arrExpr})]`,
    },
    {
      property: 'sum',
      replacement: (arrExpr) => `${arrExpr}.reduce((a,b) => a + b, 0)`,
    },
    {
      property: 'max',
      replacement: (arrExpr) => `Math.max(...${arrExpr})`,
    },
    {
      property: 'min',
      replacement: (arrExpr) => `Math.min(...${arrExpr})`,
    },
    {
      property: 'len',
      replacement: (arrExpr) => `${arrExpr}.length`,
    },
    {
      property: 'mul',
      replacement: (arrExpr) => `${arrExpr}.reduce((a,b) => a * b, 1)`,
    },
  ];

  // Two-argument property transformations (arr.property(value))
  // Only handle simple value comparisons, let normal JS handle functions
  const twoArgPropertyTransformations = [
    {
      property: 'filter!',
      replacement: (arrExpr, value) =>
        `[...${arrExpr}].filter(v => v !== ${value})`,
    },
    {
      property: 'filter',
      replacement: (arrExpr, value) =>
        `[...${arrExpr}].filter(v => v === ${value})`,
    },
    {
      property: 'count!',
      replacement: (arrExpr, value) =>
        `[...${arrExpr}].filter(v => v !== ${value}).length`,
    },
    {
      property: 'count',
      replacement: (arrExpr, value) =>
        `[...${arrExpr}].filter(v => v === ${value}).length`,
    },
  ];

  // Apply transformations in multiple passes to handle nesting
  while (changed && pass < maxPasses) {
    pass++;
    changed = false;

    // Process property transformations (arr.property), rightmost first
    // First, find all matches across all properties to get the absolute rightmost
    let allMatches = [];
    for (const { property, replacement } of propertyTransformations) {
      const match = findRightmostProperty(output, property);
      if (match) {
        // Skip if arrExpr is already a transformed expression (starts with [...)
        // This prevents infinite loops where we keep wrapping already-wrapped expressions
        if (match.arrExpr.trim().startsWith('[...')) {
          continue;
        }

        const patternToMatch = `${match.arrExpr.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        )}\\s*\\.\\s*${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;
        const fullMatch = output
          .substring(match.index)
          .match(new RegExp(`^${patternToMatch}`));
        if (fullMatch) {
          const afterProperty = output.substring(
            match.index + fullMatch[0].length
          );

          // Check if it should be transformed
          let shouldTransform = false;
          // If afterProperty is empty or starts with whitespace/newline, it's end of expression
          if (!afterProperty || /^\s/.test(afterProperty)) {
            // Check if it's followed by parentheses with no args
            const parenMatch = afterProperty.match(/^\s*\(([^)]*)\)/);
            if (parenMatch && !parenMatch[1].trim()) {
              shouldTransform = true;
            } else if (!parenMatch || !parenMatch[0]) {
              // No parentheses, or just whitespace - transform
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
            // Calculate the end position (where the property ends)
            const dotPos = output.indexOf('.', match.index);
            const endPos =
              dotPos !== -1
                ? dotPos + 1 + property.length
                : match.index + fullMatch[0].length;
            // Check if there are empty parentheses
            const hasEmptyParens = afterProperty.match(/^\s*\(\)/);
            allMatches.push({
              index: match.index,
              endIndex: endPos,
              endIndexWithParens: hasEmptyParens
                ? endPos + hasEmptyParens[0].length
                : endPos,
              arrExpr: match.arrExpr,
              property,
              replacement,
            });
          }
        }
      }
    }

    // Find the absolute rightmost match
    let rightmostMatch = null;
    if (allMatches.length > 0) {
      // Sort by index descending to get rightmost
      allMatches.sort((a, b) => b.index - a.index);
      const match = allMatches[0];
      rightmostMatch = {
        start: match.index,
        end: match.endIndexWithParens,
        replacement: match.replacement(match.arrExpr),
      };
    }

    if (rightmostMatch) {
      output =
        output.substring(0, rightmostMatch.start) +
        rightmostMatch.replacement +
        output.substring(rightmostMatch.end);
      changed = true;
      continue;
    }

    // Handle two-argument property calls (arr.property(value))
    for (const { property, replacement } of twoArgPropertyTransformations) {
      const match = findRightmostProperty(output, property);
      if (match && match.index > rightmostIndex) {
        const fullMatch = output
          .substring(match.index)
          .match(
            new RegExp(
              `^${match.arrExpr.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&'
              )}\\s*\\.\\s*${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
            )
          );
        if (fullMatch) {
          const afterProperty = output.substring(
            match.index + fullMatch[0].length
          );
          const parenMatch = afterProperty.match(/^\s*\(([^)]+)\)/);

          if (parenMatch) {
            const args = parseArguments(parenMatch[1]);
            // Only transform if single simple argument (not a function)
            if (
              args.length === 1 &&
              !args[0].includes('=>') &&
              !args[0].includes('function')
            ) {
              rightmostIndex = match.index;
              rightmostMatch = {
                start: match.index,
                end: match.index + fullMatch[0].length + parenMatch[0].length,
                replacement: replacement(match.arrExpr, args[0]),
              };
              break;
            }
          }
        }
      }
    }

    if (rightmostMatch) {
      output =
        output.substring(0, rightmostMatch.start) +
        rightmostMatch.replacement +
        output.substring(rightmostMatch.end);
      changed = true;
    }
  }

  return output;
}

module.exports = {
  transformArrays,
};
