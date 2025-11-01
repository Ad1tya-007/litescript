const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { transpile } = require('./transpiler');

/**
 * Watches a litescript file and automatically executes it on changes
 * @param {string} inputFile - Path to the .ls file to watch
 */
function watch(inputFile) {
  console.log(`Watching ${inputFile} for changes...`);

  const watcher = chokidar.watch(inputFile, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
  });

  const execute = () => {
    try {
      const source = fs.readFileSync(inputFile, 'utf8');
      const compiled = transpile(source);

      console.log(`\n--- Executing ${inputFile} ---`);

      // Create a fresh context for each execution to avoid variable pollution
      const inputDir = path.dirname(path.resolve(inputFile));
      const context = vm.createContext({
        console: console,
        require: require,
        module: module,
        exports: exports,
        __dirname: inputDir,
        __filename: path.resolve(inputFile),
        process: process,
        Buffer: Buffer,
        global: global,
        setTimeout: setTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        clearTimeout: clearTimeout,
        setImmediate: setImmediate,
        clearImmediate: clearImmediate,
        // Add common globals
        Math: Math,
        Date: Date,
        JSON: JSON,
        Array: Array,
        Object: Object,
        String: String,
        Number: Number,
        Boolean: Boolean,
        RegExp: RegExp,
        Error: Error,
        TypeError: TypeError,
        RangeError: RangeError,
        ReferenceError: ReferenceError,
        SyntaxError: SyntaxError,
      });

      vm.runInContext(compiled, context, {
        filename: inputFile,
        displayErrors: true,
      });
    } catch (error) {
      console.error(`✗ Error executing ${inputFile}:`, error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }
  };

  // Initial execution
  execute();

  // Watch for changes
  watcher.on('change', (path) => {
    execute();
  });

  watcher.on('error', (error) => {
    console.error(`Watcher error:`, error);
  });

  return watcher;
}

module.exports = {
  watch,
};
