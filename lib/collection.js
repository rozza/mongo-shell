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
}

module.exports = Collection;
