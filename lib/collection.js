"use strict"

const co = require('co');
const Cursor = require('./cursor');

class Collection {
  constructor(databaseName, name, db) {
    this.databaseName = databaseName;
    this.name = name;
    this.db = db;
  }

  findOne(query, options = {}) {
    const self = this;

    return new Promise((resolve, reject) => {
      co(function*() {
        const doc = yield self
          .db
          .client
          .db(self.databaseName)
          .collection(self.name)
          .findOne(query, options);
        resolve(doc);
      }).catch(reject);
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
    return this.insertMany([doc], options);
  }

  insertMany(docs, options = {}) {
    const self = this;

    return new Promise((resolve, reject) => {
      co(function*() {
        const result = yield self
          .db
          .client
          .db(self.databaseName)
          .collection(self.name)
          .insertMany(docs, options);

        // Add a render method
        result.render = function(renderView) {
          if(renderView === 'repl') {
            return {
              "acknowledged": true,
              "insertedId": this.insertedIds[0],
            }
          } else { return this; }
        }

        // Resolve the data
        resolve(result);
      }).catch(reject);
    });
  }
}

module.exports = Collection;
