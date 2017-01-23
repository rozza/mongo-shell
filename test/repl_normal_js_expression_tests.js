const co = require('co'),
  vm = require('vm'),
  MongoClient = require('mongodb').MongoClient,
  REPL = require('../lib/repl'),
  EventEmitter = require('events').EventEmitter,
  Db = require('../lib/db'),
  assert = require('assert');

let client = null;

before((done) => {
  co(function*() {
    EventEmitter.defaultMaxListeners = 100000;
    // Connect to mongodb
    client = yield MongoClient.connect('mongodb://localhost:27017/test_runner');
    // Drop the database
    yield client.dropDatabase();
    // Finish setup
    done();
  }).catch((err) => {
    console.log(err.stack)
  });
});

after(function() {
  if(client) client.close();
});


describe('Repl JS Expressions tests', () => {
  describe('value setting', () => {
    it('should correctly handle a global value expression expression [var a = 1]', (done) => {
      co(function*() {
        // Init context
        const initContext = Object.assign({}, global, {});
        // Create a context for execution
        var context = Object.assign(vm.createContext(initContext), {
          db: Db.proxy(client.s.databaseName, client),
          require: require,
        });

        // Create a repl instance
        const repl = new REPL(client, context, {
        });
        // Start the repl
        const _repl = repl.start();
        // Execute command
        _repl.eval('var a = 1', context, '', function(err, result) {
          assert.equal(null, err);
          assert.equal(1, result);

          // Render the repl final text
          let string = _repl.writer(result);
          string = string.replace(/\n|\\n/g, '');

          assert.equal(
            `1`.trim(),
            string.trim());
          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });

    it('should correctly handle a global value expression expression [a = 1 + 1]', (done) => {
      co(function*() {
        // Init context
        const initContext = Object.assign({}, global, {});
        // Create a context for execution
        var context = Object.assign(vm.createContext(initContext), {
          db: Db.proxy(client.s.databaseName, client),
          require: require,
        });

        // Create a repl instance
        const repl = new REPL(client, context, {
        });
        // Start the repl
        const _repl = repl.start();
        // Execute command
        _repl.eval('a = 1 + 1', context, '', function(err, result) {
          assert.equal(null, err);
          assert.equal(2, result);

          // Render the repl final text
          let string = _repl.writer(result);
          string = string.replace(/\n|\\n/g, '');

          assert.equal(
            `2`.trim(),
            string.trim());
          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });
  });
});
