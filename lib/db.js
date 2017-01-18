"use strict"

const Collection = require('./collection');
const co = require('co');

class Db {
  constructor(name, client) {
    this.name = name;
    this.client = client;
  }

  static proxy(name, client) {
    return new Proxy(new Db(name, client), {
      get: function(target, name) {
        if(target[name]) return target[name];
        return new Collection(target.name, name, target);
      }
    });
  }

  getCollectionNames(callback) {
    var self = this;

    return new Promise((resolve, reject) => {
      co(function*() {
        // Get the collections
        const collections = yield self.client.db(self.name).listCollections().toArray();
        const mappedCollections = collections.map(collection => collection.name);
        // Return filtered names
        resolve(mappedCollections);
      }).catch(reject);
    });
  }

  getSisterDB() {
  }
}

module.exports = Db;
