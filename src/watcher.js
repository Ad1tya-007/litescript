const chokidar = require('chokidar');
const fs = require('fs');
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
      vm.runInThisContext(compiled, {
        filename: inputFile,
        displayErrors: true,
      });
    } catch (error) {
      console.error(`✗ Error executing ${inputFile}:`, error.message);
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
