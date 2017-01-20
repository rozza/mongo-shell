const co = require('co'),
  vm = require('vm'),
  MongoClient = require('mongodb').MongoClient,
  REPL = require('../lib/repl'),
  Db = require('../lib/db'),
  assert = require('assert');

let client = null;

before((done) => {
  co(function*() {
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
    it('should correctly return sensible error on illegal command', (done) => {
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
          console.log("====================================================")
          console.dir(err)
          console.dir(result)
          // assert.equal(null, err);
          // assert.equal(1, result.insertedIds.length);
          //
          // // Render the repl final text
          // let string = _repl.writer(result);
          // string = string.replace(/\n|\\n/g, '');
          //
          // assert.equal(
          //   `{  "acknowledged": true,  "insertedId": ObjectId("${result.insertedIds[0].toString()}")}`.trim(),
          //   string.trim());
          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });
  });
});
