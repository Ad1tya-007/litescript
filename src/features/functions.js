/**
 * Functions feature - transforms Python-style function definitions
 * Converts functionName(): to function functionName() {
 * Uses indentation to determine function body and add closing braces
 */

/**
 * Transforms function definitions from Python-style to JavaScript
 * @param {string} source - The source code to transform
 * @returns {string} - The transformed code with function declarations
 */
function transformFunctions(source) {
  const lines = source.split('\n');
  const result = [];
  
  /**
   * Checks if a line is a function definition (identifier():)
   */
  function isFunctionDefinition(trimmed) {
    // Match identifier followed by optional parameters and ending with ():
    // Examples: help():, greet(name):, calculate(a, b):
    const functionMatch = trimmed.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*:\s*$/);
    return functionMatch !== null;
  }
  
  // Stack to track function indentations
  const functionStack = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Calculate indentation (spaces or tabs)
    const indentMatch = line.match(/^(\s*)/);
    const currentIndent = indentMatch ? indentMatch[1].length : 0;
    
    // Close functions for any levels we've exited
    while (functionStack.length > 0 && functionStack[functionStack.length - 1].indent >= currentIndent) {
      const { indent } = functionStack.pop();
      result.push(' '.repeat(indent) + '}');
    }
    
    // Check if this line is a function definition
    if (isFunctionDefinition(trimmed)) {
      const functionMatch = trimmed.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*:\s*$/);
      if (functionMatch) {
        const functionName = functionMatch[1];
        const params = functionMatch[2].trim();
        
        // Transform to function declaration
        const indent = indentMatch ? indentMatch[1] : '';
        const transformedLine = `${indent}function ${functionName}(${params}) {`;
        result.push(transformedLine);
        
        // Check if there's a body (next line has more indentation)
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const nextTrimmed = nextLine.trim();
          if (nextTrimmed !== '') {
            const nextIndentMatch = nextLine.match(/^(\s*)/);
            const nextIndent = nextIndentMatch ? nextIndentMatch[1].length : 0;
            
            // If next line is more indented, it's part of the function body
            if (nextIndent > currentIndent) {
              functionStack.push({ indent: currentIndent });
              continue;
            }
          }
        }
        
        // No body or empty body - add closing brace immediately
        result.push(' '.repeat(currentIndent) + '}');
        continue;
      }
    }
    
    // Regular line - just add it
    result.push(line);
  }
  
  // Close any remaining open functions
  while (functionStack.length > 0) {
    const { indent } = functionStack.pop();
    result.push(' '.repeat(indent) + '}');
  }
  
  return result.join('\n');
}

module.exports = {
  transformFunctions,
};

