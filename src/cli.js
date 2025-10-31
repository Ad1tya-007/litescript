const fs = require('fs');
const vm = require('vm');
const { transpile } = require('./transpiler');
const { watch } = require('./watcher');

/**
 * Parses command line arguments and executes the transpiler
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    inputFile: null,
    watch: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-w' || arg === '--watch') {
      result.watch = true;
    } else if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      result.inputFile = arg;
    }
  }

  return result;
}

/**
 * Prints usage help
 */
function printHelp() {
  console.log(`
Usage: lite <input.ls> [options]

Options:
  -w, --watch    Watch for file changes and re-execute
  -h, --help     Show this help message

Examples:
  lite main.ls
  lite main.ls --watch
`);
}

/**
 * Executes a transpiled file
 */
function executeFile(inputFile) {
  try {
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: File ${inputFile} does not exist`);
      process.exit(1);
    }

    const source = fs.readFileSync(inputFile, 'utf8');
    const compiled = transpile(source);

    // Execute the transpiled code
    vm.runInThisContext(compiled, {
      filename: inputFile,
      displayErrors: true,
    });
  } catch (error) {
    console.error(`✗ Error executing ${inputFile}:`, error.message);
    process.exit(1);
  }
}

/**
 * Main CLI entry point
 */
function main() {
  const { inputFile, watch: watchMode } = parseArgs();

  if (!inputFile) {
    console.error('Error: No input file specified');
    printHelp();
    process.exit(1);
  }

  if (watchMode) {
    watch(inputFile);
  } else {
    executeFile(inputFile);
  }
}

module.exports = {
  main,
};
