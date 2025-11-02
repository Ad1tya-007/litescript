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
    test: false,
    testFeature: null,
    testName: null,
  };

  // Check if first argument is "test"
  if (args.length > 0 && args[0] === 'test') {
    result.test = true;
    if (args.length >= 2) {
      result.testFeature = args[1];
      if (args.length >= 3) {
        result.testName = args[2];
      }
    }
    return result;
  }

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
       lite test <feature> <test_name>

Options:
  -w, --watch    Watch for file changes and re-execute
  -h, --help     Show this help message

Examples:
  lite main.ls
  lite main.ls --watch
  lite test arrays range
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
 * Runs a test file
 */
function runTest(testFeature, testName) {
  if (!testFeature || !testName) {
    console.error('Error: Usage: lite test <feature> <test_name>');
    console.error('Example: lite test arrays range');
    process.exit(1);
  }

  const testPath = `tests/${testFeature}/${testName}.ls`;
  
  if (!fs.existsSync(testPath)) {
    console.error(`Error: Test file ${testPath} does not exist`);
    process.exit(1);
  }

  console.log(`Running test: ${testPath}\n`);
  executeFile(testPath);
}

/**
 * Main CLI entry point
 */
function main() {
  const { inputFile, watch: watchMode, test, testFeature, testName } = parseArgs();

  if (test) {
    runTest(testFeature, testName);
    return;
  }

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
