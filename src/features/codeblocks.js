/**
 * Code blocks feature - adds braces based on indentation
 * Allows writing code without explicit braces, similar to Python
 */

/**
 * Transforms code by adding braces based on indentation
 * @param {string} source - The source code to transform
 * @returns {string} - The transformed code with braces
 */
function transformCodeBlocks(source) {
  const lines = source.split('\n');
  const result = [];
  
  /**
   * Checks if a line is a control structure (for, while, if, else)
   */
  function isControlStructure(trimmed) {
    // Check for else (standalone)
    if (/^\s*else\s*$/.test(trimmed)) return true;
    
    // Check for for/while/if with parentheses - need to match balanced parens
    const controlMatch = trimmed.match(/^\s*(for|while|if|else\s+if)\s*\(/);
    if (controlMatch) {
      // Find matching closing parenthesis
      let depth = 0;
      let foundOpen = false;
      for (let i = 0; i < trimmed.length; i++) {
        if (trimmed[i] === '(') {
          depth++;
          foundOpen = true;
        } else if (trimmed[i] === ')') {
          depth--;
          if (foundOpen && depth === 0) {
            // Found matching closing paren, check if this is the end (or has only whitespace)
            const rest = trimmed.substring(i + 1).trim();
            return rest === '' || rest === '{' || rest === '}';
          }
        }
      }
    }
    
    // Check for if statements without parentheses (after loops transformation)
    // Pattern: if condition (where condition doesn't start with '(')
    const ifMatch = trimmed.match(/^\s*if\s+(.+)$/);
    if (ifMatch && !trimmed.includes('(')) {
      // Make sure it's not already a complete statement (ends with semicolon or brace)
      const condition = ifMatch[1].trim();
      if (!condition.endsWith(';') && !condition.endsWith('{') && !condition.endsWith('}')) {
        return true;
      }
    }
    
    return false;
  }
  
  // Stack to track indentation levels and whether we need closing braces
  const indentStack = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines
    if (trimmed === '') {
      result.push(line);
      continue;
    }
    
    // Calculate indentation (spaces or tabs)
    const indentMatch = line.match(/^(\s*)/);
    const currentIndent = indentMatch ? indentMatch[1].length : 0;
    
    // Close braces for any levels we've exited
    while (indentStack.length > 0 && indentStack[indentStack.length - 1].indent >= currentIndent) {
      const { indent } = indentStack.pop();
      result.push(' '.repeat(indent) + '}');
    }
    
    // Check if this line is a control structure without a brace
    const needsBrace = isControlStructure(trimmed) && !trimmed.endsWith('{') && !trimmed.endsWith('}');
    if (needsBrace) {
      // Check if next line has more indentation (indicating a block)
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextTrimmed = nextLine.trim();
        if (nextTrimmed !== '') {
          const nextIndentMatch = nextLine.match(/^(\s*)/);
          const nextIndent = nextIndentMatch ? nextIndentMatch[1].length : 0;
          
          // If next line is more indented, add opening brace
          if (nextIndent > currentIndent) {
            result.push(line + ' {');
            indentStack.push({ indent: currentIndent });
            continue;
          }
        }
      }
    }
    
    // Regular line - just add it
    result.push(line);
  }
  
  // Close any remaining open blocks
  while (indentStack.length > 0) {
    const { indent } = indentStack.pop();
    result.push(' '.repeat(indent) + '}');
  }
  
  return result.join('\n');
}

module.exports = {
  transformCodeBlocks,
};
