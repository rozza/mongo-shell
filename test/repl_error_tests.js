const co = require('co'),
  vm = require('vm'),
  MongoClient = require('mongodb').MongoClient,
  REPL = require('../lib/repl'),
  Db = require('../lib/db'),
  EventEmitter = require('events').EventEmitter,
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


describe('Repl Error tests', () => {
  describe('parser error handling', () => {
    it('should correctly return sensible error on only providing db and collection', (done) => {
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
        _repl.eval('db.tests2', context, '', function(err, result) {
          assert.equal(null, err);
          assert.equal('test_runner.tests2', result);

          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });

    it('should correctly return sensible error on providing db and collection and legal function', (done) => {
      co(function*() {
        // Init context
        const initContext = Object.assign({}, global, {});
        // Create a context for execution
        var context = vm.createContext(initContext);
        const db = Db.proxy(client.s.databaseName, client, context);

        context = Object.assign(context, {
          db: db,
          require: require,
        })

        // Create a repl instance
        const repl = new REPL(client, context, {});
        // Start the repl
        const _repl = repl.start();

        // Execute command
        _repl.eval('db.tests2.find', context, '', function(err, result) {
          assert.equal(null, err);
          assert.equal('test_runner.tests2.find', result);

          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });

    it('should correctly return illegal cli command error', (done) => {
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
        _repl.eval('db.tests2.__', context, '', function(err, result) {
          assert.equal(null, err);
          assert.equal('illegal cli expression', result);

          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });
  });
});
