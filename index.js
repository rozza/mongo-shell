"use strict"

const co = require('co');
const repl = require('repl');
const vm = require('vm');
const cliff = require('cliff');
const readline = require('readline');
const Executor = require('./lib/executor');
const {
  MongoClient
} = require('mongodb');
const Db = require('./lib/db');
const Collection = require('./lib/collection');

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
  var shellContext = vm.createContext(initContext);
  // Default db
  shellContext.db = Db.proxy(client.s.databaseName, client);

  // Save the _setPrompt function
  var _setPrompt = readline.Interface.prototype.setPrompt;
  // Override the default prompt
  readline.Interface.prototype.setPrompt = function() {
    if (arguments.length === 1) {
      return _setPrompt.call(this, `mongodb [${shellContext.db.name}]> `, `mongodb [${shellContext.db.name}]> `.length);
    } else {
      return _setPrompt.apply(this, arguments);
    }
  };

  // Promise based setTimeout
  function sleep(timeout) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, timeout);
    });
  }

  // We have access to the context
  function completer(line, callback) {
    co(function*() {
      // Do we have a db instance
      const parts = line.split('.');

      // DB level operations
      // Go the options for the db object
      if (parts[0] === 'db' && parts.length <= 2) {
        // Select a db
        const selectedDb = client.db(shellContext.db.name);
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
          .map(entry => `db.${entry}()`);

        // Now mix in the prototype methods
        hits = hits.concat(methods)
          .filter(entry => {
            return entry.match(new RegExp(`^db.${parts[1]}`)) != null
            return true;
          });

        // Return hints
        return callback(null, [hits, line]);
      } else if (parts[0] === 'db' && parts.length <= 3) {
        // Db object methods
        const hints = Object.getOwnPropertyNames(Collection.prototype)
          .filter(entry => entry !== 'constructor')
          .map(entry => `db.${parts[1]}.${entry}()`);
        // Return hints
        return callback(null, [hints, line]);
      }

      // No hits return nothing
      callback(null, [[], line]);
    }).catch(err => {
      console.log(err)
      callback(null, [[], line]);
    });
  }

  function bytesToGBString(bytes, precision = 4) {
    return Number(bytes/1024/1024/1024).toFixed(precision);
  }

  // Set up the repl
  const replServer = repl.start({
    prompt: prompt, ignoreUndefined: true,
    writer: function(line) {
      if(typeof line == 'string') return line;
      if(Array.isArray(line)) return JSON.stringify(line, null, 0);
      if(line != null && typeof line == 'object') return JSON.stringify(line, null, 2);
      return line;
    },
    eval: function(cmd, context, filename, callback) {
      co(function*() {
        cmd = cmd.trim();

        // Exit the process on users request
        if (cmd === 'exit' || cmd === 'quit') {
          process.exit(0);
        } else if (cmd === 'use') {
          return callback(null, "use command requires format 'use <dbname:string>'")
        } else if (cmd.indexOf('use ') == 0) {
          let db = cmd.split(' ')[1].trim();
          // Set the context db
          shellContext.db = Db.proxy(db, client);
          // Print that db changed
          return callback(null, `switched to db: ${db}`);
        } else if (cmd === 'show dbs') {
          let result = yield client.db('admin').command({ listDatabases: true });
          let databases = [['Name', 'Size (GB)', 'Is Empty']].concat(result.databases.map(database => {
            return [database.name, `${bytesToGBString(database.sizeOnDisk)}GB`, database.empty]
          }));

          return callback(null, cliff.stringifyRows(databases, ['green', 'green', 'green']));
        } else if (cmd === 'show collections') {
          let collectionNames = yield shellContext.db.getCollectionNames();
          return callback(null, collectionNames.join('\n'));
        }

        // Process the cmd (if using ; to do multi statement lines, execute them one by one
        // and return last element
        const cmds = cmd.split(';');

        // Add result assignment to last string
        if (cmds.length > 0) {
          cmds[cmds.length - 1] = `__result = ${cmds[cmds.length - 1]}`
        }

        // Processed command execution
        const finalCommand = cmds.join(';');

        // console.log('=========================== execute command')
        // console.log(finalCommand)

        // Execute all commands
        executor.execute(finalCommand, shellContext);

        // Wait for execution to finish
        while (shellContext.__executing) {
          yield sleep(10);
        }

        // console.log("========================== cmd")
        // console.log(shellContext.__executing)
        // console.log(shellContext.__result)
        // console.dir(shellContext)
        // executor.execute(cmd, shellContext)

        callback(null, shellContext.__result);
      }).catch(err => {
        callback(err);
      });
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
