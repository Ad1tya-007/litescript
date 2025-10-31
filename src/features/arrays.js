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
 * Finds the rightmost occurrence of a keyword followed by parenthesis
 * This helps process inner expressions first in nested calls
 * Ensures the keyword is not part of a method call (e.g., not matching .reverse())
 */
function findRightmostPattern(str, keyword) {
  // Use negative lookbehind to ensure keyword is not preceded by a dot
  // This prevents matching method calls like .reverse()
  const pattern = new RegExp(`(?<!\\.)\\b${keyword}\\s*\\(`, 'g');

  let match;
  let lastMatch = null;
  let lastIndex = -1;

  // Reset regex
  pattern.lastIndex = 0;

  while ((match = pattern.exec(str)) !== null) {
    if (match.index > lastIndex) {
      lastIndex = match.index;
      lastMatch = match;
    }
  }

  return lastMatch ? lastMatch.index : -1;
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

  // Single-argument transformation rules
  const oneArgTransformations = [
    {
      keyword: 'sorted',
      replacement: (expr) => `[...${expr}].sort((a,b)=>a-b)`,
    },
    { keyword: 'reverse', replacement: (expr) => `[...${expr}].reverse()` },
    { keyword: 'unique', replacement: (expr) => `[...new Set(${expr})]` },
    {
      keyword: 'sum',
      replacement: (expr) => `${expr}.reduce((a,b) => a + b, 0)`,
    },
    { keyword: 'max', replacement: (expr) => `Math.max(...${expr})` },
    { keyword: 'min', replacement: (expr) => `Math.min(...${expr})` },
    { keyword: 'len', replacement: (expr) => `${expr}.length` },
    {
      keyword: 'mul',
      replacement: (expr) => `${expr}.reduce((a,b) => a * b, 1)`,
    },
  ];

  // Two-argument transformation rules
  // Note: filter! must come before filter since it contains "filter"
  const twoArgTransformations = [
    {
      keyword: 'filter!',
      replacement: (arr, n) => `[...${arr}].filter(v => v !== ${n})`,
    },
    {
      keyword: 'filter',
      replacement: (arr, n) => `[...${arr}].filter(v => v === ${n})`,
    },
    {
      keyword: 'count',
      replacement: (arr, n) => `[...${arr}].filter(v => v === ${n}).length`,
    },
    {
      keyword: 'count!',
      replacement: (arr, n) => `[...${arr}].filter(v => v !== ${n}).length`,
    },
  ];

  // Apply transformations in multiple passes to handle nesting
  while (changed && pass < maxPasses) {
    pass++;
    changed = false;

    // Try each transformation, processing from rightmost (inner-most) first
    for (const { keyword, replacement } of oneArgTransformations) {
      const index = findRightmostPattern(output, keyword);
      if (index !== -1) {
        const expr = extractBalancedExpr(output, index, keyword);
        if (expr) {
          const transformed = replacement(expr.content);
          output =
            output.substring(0, expr.start) +
            transformed +
            output.substring(expr.end);
          changed = true;
          break; // Process one transformation per pass
        }
      }
    }

    // Handle two-argument functions
    if (!changed) {
      let rightmostMatch = null;
      let rightmostIndex = -1;

      // Find the rightmost (innermost) two-argument transformation
      for (const { keyword, replacement } of twoArgTransformations) {
        const pattern = new RegExp(
          `(?<!\\.)\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(`,
          'g'
        );
        let match;

        pattern.lastIndex = 0;
        while ((match = pattern.exec(output)) !== null) {
          if (match.index > rightmostIndex) {
            const expr = extractBalancedExpr(output, match.index, keyword);
            if (expr) {
              // Parse two arguments (handling nested parentheses)
              const args = parseArguments(expr.content);
              if (args.length === 2) {
                rightmostIndex = match.index;
                rightmostMatch = {
                  start: expr.start,
                  end: expr.end,
                  replacement: replacement(args[0], args[1]),
                };
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
  }

  return output;
}

module.exports = {
  transformArrays,
};
