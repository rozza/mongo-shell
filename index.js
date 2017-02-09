"use strict"

const co = require('co');
const repl = require('repl');
const vm = require('vm');
const fs = require('fs');
const cliff = require('cliff');
const readline = require('readline');
const program = require('commander');
const Executor = require('./lib/executor');
const REPL = require('./lib/repl');
const {
  MongoClient, ObjectId
} = require('mongodb');
const Db = require('./lib/db');
const Collection = require('./lib/collection');
const HelpDocs = require('./lib/help_docs');
const plugins = require('./lib/plugins');

program
  .version('0.0.1')
  .description('This shell allows for mixing legacy mongo shell javascript code with the modern node.js world of libraries.')
  .usage('[db address] [file names (ending in .js)]')
  // .option('-p, --peppers', 'Add peppers')
  // .option('-P, --pineapple', 'Add pineapple')
  // .option('-b, --bbq-sauce', 'Add bbq sauce')
  // .option('-c, --cheese [type]', 'Add the specified type of cheese [marble]', 'marble');
  .parse(process.argv);
// program
//   .command('help')
//   .description('display verbose help')
//   .action(function() {
//     return "show something"
//   });
// program.on('--help', function(){
//   console.log('  Examples:');
//   console.log('');
//   console.log('    $ custom-help --help');
//   console.log('    $ custom-help -h');
//   console.log('');
// });

// Find any files in there
const files = program.rawArgs.filter(x => {
  return x.indexOf('.js') != -1 && x !== __filename;
})


// Default uri connection string
let uri = 'mongodb://localhost:27017/test';
// Default Executor used for the shell
// Contains the current prompt
let prompt = 'mongodb> ';

// Get the connection string if any specified
for(let i = 0; i < program.rawArgs.length; i++) {
  if(program.rawArgs[i] == __filename) {
    if (!program.rawArgs[i+1]) break;
    let arg = program.rawArgs[i+1].trim();
    // console.dir(arg)
    // Test if this is a valid uri string
    if(typeof arg === 'string'
      && arg.indexOf('.js') == -1
      && arg.indexOf('mongodb://') == -1) {
        uri = `mongodb://${arg}`;
    }
  }
}

co(function*() {
  // Connect to mongodb
  const client = yield MongoClient.connect(uri);

  // Attempt to instantiate all the plugins
  const pluginInstances = [];
  // Go over all the plugins
  for (var name in plugins) {
    pluginInstances.push(new plugins[name](client))
  }

  // Init context
  const initContext = Object.assign({}, global, {});

  // Let plugin's decorate the context
  for (let i = 0; i < pluginInstances.length; i++) {
    yield pluginInstances[i].decorateContext(initContext);
  }

  // Create a context for execution
  var context = vm.createContext(initContext);
  // Default db
  context.db = Db.proxy(client.s.databaseName, client, context);
  // Add global special methods
  context.require = require

  // Do we have files to execute
  if (files.length > 0) {
    // Execute each file
    const executor = new Executor();

    for(var i = 0; i < files.length; i++) {
      // Read the file
      const file = fs.readFileSync(files[i], 'utf8');
      // Let's execute the file
      yield executor.executeSync(file, context, {
        detectCallbacks: true,
      });
    }

    // Shutdown mongodb connection
    client.close();
    // Cut short as we are done;
    return;
  }

  // Create a repl
  const replServer = new REPL(client, context, {
    plugins: pluginInstances,
  });
  // Start the repl
  replServer.start();
}).catch(err => {
  // console.log(err);
  process.exit(0);
});
