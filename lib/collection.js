"use strict"

const co = require('co');

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
}

module.exports = Collection;
