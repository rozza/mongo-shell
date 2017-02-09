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
const Recoverable = repl.Recoverable;

const {
  ObjectId
} = require('mongodb');

ObjectId.prototype.toJSON = function() {
  return `ObjectId("${this.toHexString()}")`
}

function isRecoverableError(e, self) {
  if (e && e.name === 'SyntaxError') {
    var message = e.message;
    if (message.match(/^Unexpected token/))
      return true;
  }

  return false;
}

function preprocess(code) {
  let cmd = code;
  if (/^\s*\{/.test(cmd) && /\}\s*$/.test(cmd)) {
    // It's confusing for `{ a : 1 }` to be interpreted as a block
    // statement rather than an object literal.  So, we first try
    // to wrap it in parentheses, so that it will be interpreted as
    // an expression.
    cmd = `(${cmd})`;
    self.wrappedCmd = true;
  } else {
    // Mitigate https://github.com/nodejs/node/issues/548
    cmd = cmd.replace(
      /^\s*function(?:\s*(\*)\s*|\s+)([^(]+)/,
      (_, genStar, name) => `var ${name} = function ${genStar || ''}${name}`
    );
  }
  // Append a \n so that it will be either
  // terminated, or continued onto the next expression if it's an
  // unexpected end of input.
  return `${cmd}\n`;
}


function displayHelp(context, hints) {
  if (hints.length != 1) return;

  let hint = hints[0].trim()
  let functionName = hint.split('.').slice(-1)[0];
  functionName = functionName.endsWith('(') ? functionName.substring(0, functionName.length - 1) : functionName;

  let namespace = context.startsWith('db') ? Db : Collection;
  let func = namespace.prototype[functionName]
  if (typeof func === "undefined") return;

  let help = func['help']
  if (typeof help !== "undefined") {
    console.log('');
    help(false, hint);
    console.log('');
  }
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
    // Unwrap any plugins
    this.plugins = options.plugins || [];
    // node.js Repl instance
    this.repl = null;
  }

  // We have access to the context
  __completer(line, callback) {
    var self = this;

    co(function*() {
      // Do we have a db instance
      let parts = line.split('.');

      // DB level operations
      // Go the options for the db object
      if (parts[0] === 'db' && parts.length <= 2) {
        // Select a db
        const selectedDb = self.client.db(self.context.db.name);
        // Get the cursor
        const cursor = parts.length == 1
          ? selectedDb.listCollections()
          : selectedDb.listCollections({ name: new RegExp(`^${parts[1]}`) });
        let collections = [];

        // Get all the collection objects, if failure just ignore (due to auth)
        try {
          collections = yield cursor.toArray();
        } catch(err) {}
        let hints = collections.map(entry => `db.${entry.name}`);

        // Db object methods
        const methods = Object.getOwnPropertyNames(Db.prototype)
          .filter(entry => entry !== 'constructor')
          .map(entry => `db.${entry}(`);

        // Now mix in the prototype methods
        hints = hints.concat(methods)
          .filter(entry => {
            return entry.match(new RegExp(`^db.${parts[1]}`)) != null
            return true;
          });

        // console.log("============================")
        // console.dir(hints)

        // Return hints
        displayHelp('db', hints);
        return callback(null, [hints, line]);
      } else if (parts[0] === 'db' && parts.length <= 3) {
        // Db object methods
        const hints = Object.getOwnPropertyNames(Collection.prototype)
          .filter(entry => entry !== 'constructor')
          .map(entry => `db.${parts[1]}.${entry}(`)
          .filter(entry => entry.startsWith(line));
        // Return hints
        displayHelp('collection', hints);
        return callback(null, [hints, line]);
      } else if (parts[0] !== 'db' && parts.length == 1) {
        const namespaces = self.plugins.map(plugin => {
          return plugin.namespace();
        });

        const hints = namespaces
          .filter(entry => entry.startsWith(line));
        // Return hints
        return callback(null, [hints, line]);
      } else if(parts[0] !== 'db' && parts.length > 1 && self.context[parts[0]]) {
        // console.dir(parts)
        let object = self.context;
        let validPath = [];
        // Attempt to introspect the path
        for (let i = 0; i < parts.length; i++) {
          if (object[parts[i]] != null && typeof object[parts[i]] == 'object') {
            object = object[parts[i]];
            validPath.push(parts[i]);
          }
        }

        // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! 0")
        // console.dir(Object.getOwnPropertyNames(Object.getPrototypeOf(object)))
        // console.log(line)
        // console.dir(object)

        // Db object methods
        const hints = Object.getOwnPropertyNames(Object.getPrototypeOf(object))
          .filter(entry => entry !== 'constructor')
          .map(entry => {
            // console.log(`entry = ${validPath.join('.')}.${entry}`)

            if (typeof object[entry] === 'function') {
              return `${validPath.join('.')}.${entry}(`;
            } else {
              return `${validPath.join('.')}.${entry}`;
            }
          })
          .filter(entry => entry.startsWith(line));
          // baas.auth("unique_user@domain.com", "password");
        // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! 1")
        // console.dir(hints)
        // Return hints
        return callback(null, [hints, line]);
      } else if(parts[0] !== 'db' && parts.length > 1 && self.context[parts[0]]) {
        // console.dir(parts)
        let object = self.context;
        let validPath = [];
        // Attempt to introspect the path
        for (let i = 0; i < parts.length; i++) {
          if (object[parts[i]] != null && typeof object[parts[i]] == 'object') {
            object = object[parts[i]];
            validPath.push(parts[i]);
          }
        }

        // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! 0")
        // console.dir(Object.getOwnPropertyNames(Object.getPrototypeOf(object)))
        // console.log(line)
        // console.dir(object)

        // Db object methods
        const hints = Object.getOwnPropertyNames(Object.getPrototypeOf(object))
          .filter(entry => entry !== 'constructor')
          .map(entry => {
            // console.log(`entry = ${validPath.join('.')}.${entry}`)

            if (typeof object[entry] === 'function') {
              return `${validPath.join('.')}.${entry}(`;
            } else {
              return `${validPath.join('.')}.${entry}`;
            }
          })
          .filter(entry => entry.startsWith(line));
          // baas.auth("unique_user@domain.com", "password");
        // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! 1")
        // console.dir(hints)
        // Return hints
        displayHelp('collection', hints);
        return callback(null, [hints, line]);
      }

      // No hints return nothing
      callback(null, [[], line]);
    }).catch(err => {
      // console.log(err)
      // console.log(err)
      callback(null, [[], line]);
    });
  }

  __writer(line) {
    if(Array.isArray(line)) return JSON.stringify(line, null, 2);
    // Serialize the object to JSON
    if(line != null && typeof line == 'object') {
      if(typeof line.render == 'function') {
        line = JSON.stringify(line.render(this.options.renderView), null, 2);
      } else {
        line = JSON.stringify(line, null, 2);
      }
    } else if (typeof line === 'number') {
      line = '' + line;
    }

    // Do some post processing for specal BSON values
    if(typeof line == 'string') {
      line = fixBSONTypeOutput(line, /\"ObjectId\(\\\"[0-9|a-f|A-F]*\\\"\)\"/);
    }

    // Return formated string
    return line;
  }

  __eval(cmd, context, filename, callback) {
    var self = this;

    co(function*() {
      cmd = cmd.trim();
      if (cmd === '\n') {
        return cb(null);
      }

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
      } else if (cmd == "") {
        return callback(null, undefined);
      }

      // console.log("======================================= 0")
      // console.log(cmd)
      // console.log("======================================= 1")
      // console.log(preprocess(cmd))

      // Pre-process the cmd
      cmd = preprocess(cmd);

      // Process the cmd (if using ; to do multi statement lines, execute them one by one
      // and return last element
      const cmds = cmd.split(';');

      // Add result assignment to last string
      if (cmds.length > 0) {
        // cmds[cmds.length - 1] = `__result = ${cmds[cmds.length - 1]}`
      }

      // Processed command execution
      const finalCommand = cmds.join(';');

      // Clear any error
      self.context.__executingError = null;

      // Execute all commands
      const resultPromise = yield self.executor.executeAsync(finalCommand, self.context);

      // Wait for execution to finish
      while (self.context.__executing) {
        yield sleep(10);
      }

      // console.log("===================== finalResult 0")
      // Set the default result
      let finalResult = self.context.__result;

      // console.log("=====================================")
      // console.log(finalResult)

      // Did we receive an error
      if (self.context.__executingError) {
        return callback(`ERROR: ${self.context.__executingError.message}`)
      }

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
      // } else if(finalResult === undefined) {
      //   finalResult = 'illegal cli expression';
      }

      // console.log("===================== finalResult 2")
      // console.dir(finalResult)
      // Callback with the result
      callback(null, finalResult ? finalResult : '');
    }).catch(err => {
      console.log("========= caught error")
      console.log(err)

      if (isRecoverableError(err)) {
        return callback(new Recoverable(err), null);
      }

      callback(null, `ERROR: ${err.message}`);
    });
  }

  start() {
    var self = this;
    var $setPrompt = readline.Interface.prototype.setPrompt;
    readline.Interface.prototype.setPrompt = function(prompt) {
      if (prompt && !prompt.match(/^\.\./)) {
        return $setPrompt.call(this, `mongodb [${self.context.db.name}]> `, `mongodb [${self.context.db.name}]> `.length);
      }

      return $setPrompt.apply(this, arguments);
    };

    this.repl = repl.start(Object.assign({
      prompt: this.options.prompt, ignoreUndefined: true,
      writer: this.__writer.bind(this),
      eval: this.__eval.bind(this),
      completer: this.__completer.bind(this),
    }, this.options));

    // Add replServer exit
    this.repl.on('exit', function() {
      self.emit('exit');
    });

    return this.repl;
  }
}

module.exports = REPL;
