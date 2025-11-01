/**
 * Variables feature - automatic variable declarations
 * Removes let/const keywords and automatically declares variables on assignment
 * Similar to Python: variable = value automatically declares the variable
 */

/**
 * Transforms variable declarations in the source code
 * @param {string} source - The source code to transform
 * @returns {string} - The transformed code with automatic declarations
 */
function transformVariables(source) {
  // Step 1: Replace const with let
  let output = source.replace(/\bconst\b/g, 'let');

  // Step 2: Process line by line
  // - Remove let/const/var from explicit declarations and track them
  // - Add let to standalone assignments that weren't explicitly declared
  const lines = output.split('\n');
  const result = [];
  const declaredVars = new Set(); // Track variables that were explicitly declared

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      result.push(line);
      continue;
    }

    // Check if this is an explicit declaration: let/const/var identifier = ...
    const declarationMatch = trimmed.match(/^(let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/);
    
    if (declarationMatch) {
      // Remove the let/const/var keyword, then process as a regular assignment
      const varName = declarationMatch[2];
      const indent = line.match(/^(\s*)/)[1];
      const afterKeyword = trimmed.substring(trimmed.indexOf(varName));
      // Remove the keyword and process the assignment below
      line = indent + afterKeyword;
      trimmed = line.trim();
    }
    
    // Check for variable assignment: identifier = value
    // (either from explicit declaration we just processed, or standalone)
    const assignmentMatch = trimmed.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/);
    
    if (assignmentMatch) {
      const varName = assignmentMatch[1];
      const beforeVar = trimmed.substring(0, trimmed.indexOf(varName));
      
      // Check if it's a property access (obj.prop or arr[index])
      const isPropertyAccess = /[\.\[\]$]/.test(beforeVar);
      
      // Add let if it's not a property access and variable hasn't been declared yet
      if (!isPropertyAccess && !declaredVars.has(varName)) {
        const indent = line.match(/^(\s*)/)[1];
        const afterVar = trimmed.substring(trimmed.indexOf(varName));
        line = indent + 'let ' + afterVar;
        declaredVars.add(varName);
      }
    }

    result.push(line);
  }

  return result.join('\n');
}

module.exports = {
  transformVariables,
};
