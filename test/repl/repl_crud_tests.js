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
          prompt: '',
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
          prompt: '',
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
  });

  describe('update tests', () => {
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
          renderView: 'repl', prompt: '',
        });
        // Start the repl
        const _repl = repl.start();
        // Execute command
        _repl.eval('db.tests2.updateOne({f1:1}, {f1:1}, { upsert:true })', context, '', function(err, result) {
          assert.equal(null, err);
          assert.ok(result.upsertedId);

          // Render the repl final text
          let string = _repl.writer(result);
          string = string.replace(/\n|\\n/g, '');

          assert.equal(
            `{  "acknowledged": true,  "matchedCount": 0,  "modifiedCount": 0,  "upsertedId": ObjectId("${result.upsertedId._id.toString()}")}`.trim(),
            string.trim());
          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });

    it('should correctly update a single document using updateOne', (done) => {
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
          renderView: 'repl', prompt: '',
        });
        // Start the repl
        const _repl = repl.start();

        // Insert a test doc
        yield client.collection('tests2').insertOne({f2:1});

        // Execute command
        _repl.eval('db.tests2.updateOne({f2:1}, {f1:2}, { upsert:true })', context, '', function(err, result) {
          assert.equal(null, err);
          assert.equal(null, result.upsertedId);

          // Render the repl final text
          let string = _repl.writer(result);
          string = string.replace(/\n|\\n/g, '');

          assert.equal(
            `{  "acknowledged": true,  "matchedCount": 1,  "modifiedCount": 1}`.trim(),
            string.trim());
          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });

    it('should correctly upsert a single document using updateMany', (done) => {
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
          renderView: 'repl', prompt: '',
        });
        // Start the repl
        const _repl = repl.start();

        // Execute command
        _repl.eval('db.tests2.updateMany({f3:1}, {$set: {f3:2}}, { upsert:true })', context, '', function(err, result) {
          assert.equal(null, err);
          assert.ok(result.upsertedId);

          // Render the repl final text
          let string = _repl.writer(result);
          string = string.replace(/\n|\\n/g, '');

          assert.equal(
            `{  "acknowledged": true,  "matchedCount": 0,  "modifiedCount": 0,  "upsertedId": ObjectId("${result.upsertedId._id.toString()}")}`.trim(),
            string.trim());
          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });

    it('should correctly update two documents using updateMany', (done) => {
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
          renderView: 'repl', prompt: '',
        });
        // Start the repl
        const _repl = repl.start();

        // Insert a test doc
        yield client.collection('tests2').insertMany([{f4:1}, {f4:1}]);

        // Execute command
        _repl.eval('db.tests2.updateMany({f4:1}, {$set: {f5:1}}, { upsert:true })', context, '', function(err, result) {
          assert.equal(null, err);
          assert.equal(null, result.upsertedId);

          // Render the repl final text
          let string = _repl.writer(result);
          string = string.replace(/\n|\\n/g, '');

          assert.equal(
            `{  "acknowledged": true,  "matchedCount": 2,  "modifiedCount": 2}`.trim(),
            string.trim());
          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });
  });

  describe('delete tests', () => {
    it('should correctly delete a single document using deleteOne', (done) => {
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
          renderView: 'repl', prompt: '',
        });

        // Insert a test doc
        yield client.collection('tests2').insertMany([{g1:1}, {g1:1}]);

        // Start the repl
        const _repl = repl.start();
        // Execute command
        _repl.eval('db.tests2.deleteOne({g1:1})', context, '', function(err, result) {
          assert.equal(null, err);
          assert.equal(1, result.deletedCount);

          // Render the repl final text
          let string = _repl.writer(result);
          string = string.replace(/\n|\\n/g, '');

          assert.equal(
            `{  "acknowledged": true,  "deletedCount": 1}`.trim(),
            string.trim());
          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });

    it('should correctly delete multiple documents using deleteMany', (done) => {
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
          renderView: 'repl', prompt: '',
        });

        // Insert a test doc
        yield client.collection('tests2').insertMany([{g2:1}, {g2:1}]);

        // Start the repl
        const _repl = repl.start();
        // Execute command
        _repl.eval('db.tests2.deleteMany({g2:1})', context, '', function(err, result) {
          // console.log("======================================== 0")
          // console.dir(err)
          // console.dir(result)

          assert.equal(null, err);
          assert.equal(2, result.deletedCount);

          // Render the repl final text
          let string = _repl.writer(result);
          string = string.replace(/\n|\\n/g, '');
          // console.log("======================================== 1")
          // console.log(string)

          assert.equal(
            `{  "acknowledged": true,  "deletedCount": 2}`.trim(),
            string.trim());
          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });
  });
});
