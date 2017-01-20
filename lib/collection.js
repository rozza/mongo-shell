"use strict"

const co = require('co');
const Cursor = require('./cursor');

function wrapper(func) {
  return new Promise((resolve, reject) => {
    co(function*() {
      return yield func(resolve, reject);
    }).catch(reject);
  });
}

class Collection {
  constructor(databaseName, name, db) {
    this.databaseName = databaseName;
    this.name = name;
    this.db = db;
  }

  findOne(query, options) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      const doc = yield self
        .db
        .client
        .db(self.databaseName)
        .collection(self.name)
        .findOne(query, options);

      resolve(doc);
    });
  }

  find(query, options = {}) {
    // Create db cursor
    const cursor = this
      .db
      .client
      .db(this.databaseName)
      .collection(this.name)
      .find(query, options);

    // Return the cursor wrapper
    return new Cursor(cursor);
  }

  insertOne(doc, options = {}) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      const result = yield self
        .db
        .client
        .db(self.databaseName)
        .collection(self.name)
        .insertMany([doc], options);

      // Add a render method
      result.render = function(renderView) {
        if(renderView === 'repl') {
          return {
            acknowledged: true,
            insertedId: this.insertedIds[0],
          }
        } else { return this; }
      }

      resolve(result);
    });
  }

  insertMany(docs, options = {}) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      const result = yield self
        .db
        .client
        .db(self.databaseName)
        .collection(self.name)
        .insertMany(docs, options);

      // Add a render method
      result.render = function(renderView) {
        if(renderView === 'repl') {
          // Result with multiple insertedIds
          return {
            acknowledged: true,
            insertedIds: this.insertedIds.map(id => {
              return id.toJSON();
            })
          }
        } else { return this; }
      }

      // Resolve the data
      resolve(result);
    });
  }

  updateOne(query, update, options = {}) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      const result = yield self
        .db
        .client
        .db(self.databaseName)
        .collection(self.name)
        .updateOne(query, update, options);

        // upsert format
        // {
        // 	"acknowledged" : true,
        // 	"matchedCount" : 0,
        // 	"modifiedCount" : 0,
        // 	"upsertedId" : ObjectId("588211ee18c2f3a1f00aa0dc")
        // }
        // update format hit and no hit
        // { "acknowledged" : true, "matchedCount" : 1, "modifiedCount" : 0 }
        // { "acknowledged" : true, "matchedCount" : 0, "modifiedCount" : 0 }

      // Add a render method
      result.render = function(renderView) {
        if(renderView === 'repl') {
          // Returned values
          const finalObject = {
            acknowledged: true, matchedCount: this.matchedCount, modifiedCount: this.modifiedCount,
          }

          // Add the upserted Id
          if(this.upsertedId) {
            finalObject.upsertedId = this.upsertedId._id;
          }

          // Result with multiple insertedIds
          return finalObject;
        } else { return this; }
      }

      // Resolve the data
      resolve(result);
    });
  }

  updateMany(query, update, options = {}) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      const result = yield self
        .db
        .client
        .db(self.databaseName)
        .collection(self.name)
        .updateMany(query, update, options);

      // Add a render method
      result.render = function(renderView) {
        if(renderView === 'repl') {
          // Returned values
          const finalObject = {
            acknowledged: true, matchedCount: this.matchedCount, modifiedCount: this.modifiedCount,
          }

          // Add the upserted Id
          if(this.upsertedId) {
            finalObject.upsertedId = this.upsertedId._id;
          }

          // Result with multiple insertedIds
          return finalObject;
        } else { return this; }
      }

      // Resolve the data
      resolve(result);
    });
  }

  deleteOne(query, options = {}) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      const result = yield self
        .db
        .client
        .db(self.databaseName)
        .collection(self.name)
        .deleteOne(query, options);

      // Add a render method
      result.render = function(renderView) {
        if(renderView === 'repl') {
          return {
            acknowledged: true, deletedCount: this.deletedCount
          }
        } else { return this; }
      }

      // Resolve the data
      resolve(result);
    });
  }

  deleteMany(query, options = {}) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      const result = yield self
        .db
        .client
        .db(self.databaseName)
        .collection(self.name)
        .deleteMany(query, options);

      // Add a render method
      result.render = function(renderView) {
        if(renderView === 'repl') {
          return {
            acknowledged: true, deletedCount: this.deletedCount
          }
        } else { return this; }
      }

      // Resolve the data
      resolve(result);
    });
  }
}

module.exports = Collection;
