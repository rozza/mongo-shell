const repl = require('repl');
const co = require('co');
const cliff = require('cliff');
const vm = require('vm');
const readline = require('readline');
const EventEmitter = require('events');
const Db = require('./db');
const Collection = require('./collection');
const Cursor = require('./cursor');
const Executor = require('./executor');
const {
  ObjectId
} = require('mongodb');

ObjectId.prototype.toJSON = function() {
  return `ObjectId("${this.toHexString()}")`
}

const {
  sleep,
  bytesToGBString,
  fixBSONTypeOutput
} = require('./helpers');

class CursorResult {
  constructor(documents) {
    this.documents = documents;
  }

  render(options = {}) {
    let results = this.documents.map(doc => {
      let line = JSON.stringify(doc);
      // Do some post processing for specal BSON values
      line = fixBSONTypeOutput(line, /\"ObjectId\(\\\"[0-9|a-f|A-F]*\\\"\)\"/);
      return line;
    });
    results.push('Type "it" for more');
    return results.join('\n');
  }
}

class REPL extends EventEmitter {
  constructor(client, context, options = {}) {
    super();

    // Default Executor used for the shell
    this.executor = new Executor();
    // Apply default values
    this.options = Object.assign({
      prompt: "mongodb []> ",
      renderView: 'repl'
    }, options);
    // MongoDB Client instance
    this.client = client;
    // The REPL context
    this.context = context;
    // node.js Repl instance
    this.repl = null;
  }

  // We have access to the context
  __completer(line, callback) {
    var self = this;

    co(function*() {
      // Do we have a db instance
      const parts = line.split('.');

      // DB level operations
      // Go the options for the db object
      if (parts[0] === 'db' && parts.length <= 2) {
        // Select a db
        const selectedDb = self.client.db(self.context.db.name);
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
          .map(entry => `db.${entry}(`);

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
          .map(entry => `db.${parts[1]}.${entry}(`)
          .filter(entry => entry.indexOf(line) != -1);
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

  __writer(line) {
    if(Array.isArray(line)) return JSON.stringify(line, null, 0);
    // Serialize the object to JSON
    if(line != null && typeof line == 'object') {
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
      console.log(line)

      if(typeof line.render == 'function') {
        line = JSON.stringify(line.render(this.options.renderView), null, 2);
      } else {
        line = JSON.stringify(line, null, 2);
      }
    }

    // Do some post processing for specal BSON values
    line = fixBSONTypeOutput(line, /\"ObjectId\(\\\"[0-9|a-f|A-F]*\\\"\)\"/);

    // Return formated string
    return line;
  }

  __eval(cmd, context, filename, callback) {
    var self = this;

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
        self.context.db = Db.proxy(db, self.client, self.context);
        // Print that db changed
        return callback(null, `switched to db: ${db}`);
      } else if (cmd === 'show dbs') {
        let result = yield self.client.db('admin').command({ listDatabases: true });
        let databases = [['Name', 'Size (GB)', 'Is Empty']].concat(result.databases.map(database => {
          return [database.name, `${bytesToGBString(database.sizeOnDisk)}GB`, database.empty]
        }));

        return callback(null, cliff.stringifyRows(databases, ['green', 'green', 'green']));
      } else if (cmd === 'show collections') {
        let collectionNames = yield self.context.db.getCollectionNames();
        return callback(null, collectionNames.join('\n'));
      } else if (cmd === 'it') {
        if(self.context.__currentCursor instanceof Cursor
          && !self.context.__currentCursor.cursor.isClosed()) {
            const documents = [];

            // Read the first 20 entries or until empty
            while(true) {
              let doc = yield self.context.__currentCursor.next();
              // No more entries
              if (!doc) break;
              documents.push(doc);
              // Check if we reached the cutoff
              if (documents.length == 20) break;
            }

            // Return a cursor Result
            return callback(null, new CursorResult(documents).render());
        } else {
          return callback(null, 'no active cursor');
        }
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

      // Execute all commands
      self.executor.executeAsync(finalCommand, self.context);

      // Wait for execution to finish
      while (self.context.__executing) {
        yield sleep(10);
      }


      // console.log("===================== finalResult 0")
      // Set the default result
      let finalResult = self.context.__result;

      // Check if the __result is Cursor instance (handle specially)
      if (self.context.__result instanceof Cursor
        && cmd !== 'it' && self.context.__result.cursor.s.state == 0) {
          // console.log("===================== finalResult 1")
          const documents = [];

          // Set the current context cursor
          self.context.__currentCursor = self.context.__result;

          // Read the first 20 entries or until empty
          while(true) {
            let doc = yield self.context.__result.next();
            // No more entries
            if (!doc) break;
            documents.push(doc);
            // Check if we reached the cutoff
            if (documents.length == 20) break;
          }

          // Return a cursor Result
          finalResult = new CursorResult(documents).render();
      } else if(finalResult instanceof Db) {
        finalResult = finalResult.name;
      } else if(finalResult instanceof Collection) {
        finalResult = `${finalResult.databaseName}.${finalResult.name}`;
      } else if(typeof finalResult == 'function') {
        finalResult = `${self.context.__namespace}.${finalResult.name}`;
      } else if(finalResult === undefined) {
        finalResult = 'illegal cli expression';
      }

      // console.log("===================== finalResult 2")
      // console.dir(finalResult)
      // Callback with the result
      callback(null, finalResult ? finalResult : '');
    }).catch(err => {
      callback(err);
    });
  }

  start() {
    var self = this;

    // Save the _setPrompt function
    var _setPrompt = readline.Interface.prototype.setPrompt;
    // Override the default prompt
    readline.Interface.prototype.setPrompt = function() {
      if (arguments.length === 1) {
        return _setPrompt.call(this, `mongodb [${self.context.db.name}]> `, `mongodb [${self.context.db.name}]> `.length);
      } else {
        return _setPrompt.apply(this, arguments);
      }
    };

    this.repl = repl.start(Object.assign({
      prompt: self.options.prompt, ignoreUndefined: true,
      writer: this.__writer.bind(this),
      eval: this.__eval.bind(this),
      completer: this.__completer.bind(this),
    }, self.options));

    // Add replServer exit
    this.repl.on('exit', function() {
      self.emit('exit');
    });

    return this.repl;
  }
}

module.exports = REPL;
