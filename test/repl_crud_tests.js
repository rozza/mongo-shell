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
    // Finish setup
    done();
  }).catch((err) => {
    console.log(err.stack)
  });
});

after(function() {
  if(client) client.close();
});


describe('Repl CRUD tests', () => {
  describe('insert tests', () => {
    it('should correctly insert a single document', (done) => {
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
        _repl.eval('db.tests2.insertOne({a:1})', context, '', function(err, result) {
          assert.equal(null, err);
          assert.equal(true, result.acknowledged);
          assert.ok(result.insertedId);

          // Render the repl final text
          let string = _repl.writer(result);
          string = string.replace(/\n|\\n/g, '');
          assert.equal(
            `{  "acknowledged": true,  "insertedId": ObjectId("${result.insertedId.toString()}")}`.trim(),
            string.trim());
          done();
        });

        // Get the read stream
        // process.stdin.write('db.tests2.insertOne({a:1})\r')
        // _repl.inputStream.write('db.tests.insertOne({a:1})\n')
        // Feed it a line
      }).catch(function(err) {
        console.log(err);
      });
    });
  });
});
