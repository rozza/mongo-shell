"use strict"

const co = require('co');
const repl = require('repl');
const vm = require('vm');
const readline = require('readline');
const Executor = require('./lib/executor');
const {
  MongoClient
} = require('mongodb');
const Db = require('./lib/db');

// Default uri connection string
const uri = 'mongodb://localhost:27017/test';
// Default Executor used for the shell
const executor = new Executor();
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
  context.db = new Db(client.s.databaseName, client);

  // Save the _setPrompt function
  var _setPrompt = readline.Interface.prototype.setPrompt;
  // Override the default prompt
  readline.Interface.prototype.setPrompt = function() {
    if (arguments.length === 1) {
      return _setPrompt.call(this, `mongodb [${context.db.name}]> `, `mongodb [${context.db.name}]> `.length);
    } else {
      return _setPrompt.apply(this, arguments);
    }
  };

  // We have access to the context
  function completer(line, callback) {
    co(function*() {
      // Do we have a db instance
      const parts = line.split('.');

      // DB level operations
      // Go the options for the db object
      if (parts[0] === 'db' && parts.length <= 2) {
        // Select a db
        const selectedDb = client.db(context.db.name);
        // Get the cursor
        const cursor = parts.length == 1
          ? selectedDb.listCollections()
          : selectedDb.listCollections({ name: new RegExp(`^${parts[1]}`) });

        // Get all the collection objects
        const collections = yield cursor.toArray();
        let hits = collections.map(entry => `db.${entry.name}`);

        // Db object methods
        const methods = Object.getOwnPropertyNames(Db.prototype)
          .filter(entry => entry !== 'constructor')
          .map(entry => `db.${entry}`);

        // Now mix in the prototype methods
        hits = hits.concat(methods)
          .filter(entry => {
            return entry.match(new RegExp(`^db.${parts[1]}`)) != null
            return true;
          });

        // Return hints
        return callback(null, [hits, line]);
      }

      // No hits return nothing
      callback(null, [[], line]);
    }).catch(err => {
      console.log(err)
      callback(null, [[], line]);
    });
  }

  // Set up the repl
  const replServer = repl.start({
    prompt: prompt, ignoreUndefined: true,
    eval: function(cmd, context, filename, callback) {
      cmd = cmd.trim();

      // Exit the process on users request
      if(cmd === 'exit' || cmd === 'quit') {
        process.exit(0);
      }

      // console.log("========================== cmd")
      // console.log(cmd)
      callback(null, 'executed');
    },
    completer: completer,
    // completer: function(line) {
    //   return [['.option', '.help']];
    // }
  });

  // Add replServer exit
  replServer.on('exit', function() {
    process.exit(0);
  });
}).catch(err => {
  console.log(err);
  process.exit(0);
});
