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

ObjectId.prototype.toJSON = function() {
  return `ObjectId("${this.toHexString()}")`
}

// Default uri connection string
const uri = 'mongodb://localhost:27017/test';
// Default Executor used for the shell
// Contains the current prompt
let prompt = 'mongodb> ';

co(function*() {
  // Connect to mongodb
  const client = yield MongoClient.connect(uri);
  // Init context
  const initContext = Object.assign({}, global, {});
  // Create a context for execution
  var context = vm.createContext(initContext);
  // Default db
  context.db = Db.proxy(client.s.databaseName, client);
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
      yield executor.executeSync(file, context);
    }

    // Shutdown mongodb connection
    client.close();
    // Cut short as we are done;
    return;
  }

  // Create a repl
  const replServer = new REPL(client, context);
  // Start the repl
  replServer.start();
}).catch(err => {
  console.log(err);
  process.exit(0);
});
