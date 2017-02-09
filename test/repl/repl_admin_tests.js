const co = require('co'),
  vm = require('vm'),
  MongoClient = require('mongodb').MongoClient,
  REPL = require('../../lib/repl'),
  EventEmitter = require('events').EventEmitter,
  Db = require('../../lib/db'),
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


describe('Repl Helper tests', () => {
  describe('Admin helpers', () => {
    it('should correctly call currentOp method', (done) => {
      co(function*() {
        // Init context
        const initContext = Object.assign({}, global, {});
        // Create a context for execution
        var context = Object.assign(vm.createContext(initContext), {
          db: Db.proxy(client.s.databaseName, client),
          require: require,
        });

        // Create a repl instance
        const _repl = new REPL(client, context, {
          prompt: '',
        }).start();
        // Execute command
        _repl.eval('db.currentOp()', context, '', function(err, result) {
          assert.equal(null, err);
          assert.ok(result.inprog);
          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });

    it('should correctly call dbEval method', (done) => {
      co(function*() {
        // Init context
        const initContext = Object.assign({}, global, {});
        // Create a context for execution
        var context = Object.assign(vm.createContext(initContext), {
          db: Db.proxy(client.s.databaseName, client),
          require: require,
        });

        // Create a repl instance
        const _repl = new REPL(client, context, {
          prompt: '',
        }).start();
        // Execute command
        _repl.eval('db.dbEval("return 1")', context, '', function(err, result) {
          // console.log("==============================================")
          // console.dir(err)
          // console.dir(result)
          assert.equal(null, err);
          assert.equal(1, result);
          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });
  });
});
