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
    it('should correctly insert a single document using insertOne', (done) => {
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
          assert.equal(1, result.insertedIds.length);

          // Render the repl final text
          let string = _repl.writer(result);
          string = string.replace(/\n|\\n/g, '');

          assert.equal(
            `{  "acknowledged": true,  "insertedId": ObjectId("${result.insertedIds[0].toString()}")}`.trim(),
            string.trim());
          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });

    it('should correctly insert multiple documents using insertMany', (done) => {
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
        _repl.eval('db.tests2.insertMany([{a:1}, {b:1}])', context, '', function(err, result) {
          assert.equal(null, err);

          let string = _repl.writer(result);
          string = string.replace(/\n|\\n/g, '');

          assert.equal(
            `{  "acknowledged": true,  "insertedIds": [    ObjectId("${result.insertedIds[0].toString()}"),    `
            + `ObjectId("${result.insertedIds[1].toString()}")  ]}`.trim(),
            string.trim());
          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });

    it('should correctly upsert a single document using updateOne', (done) => {
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
        _repl.eval('db.tests2.updateOne({f1:1}, {f1:1}, { upsert:true })', context, '', function(err, result) {
          console.log("======================================== 0")
          console.dir(err)
          console.dir(result)
          // assert.equal(null, err);
          // assert.equal(1, result.insertedIds.length);

          // Render the repl final text
          let string = _repl.writer(result);
          string = string.replace(/\n|\\n/g, '');
          console.log("======================================== 0")
          console.log(string)

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
