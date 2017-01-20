"use strict"

const Collection = require('./collection');
const co = require('co');

class Db {
  constructor(name, client, context = {}) {
    this.name = name;
    this.client = client;
    this.context = context;
  }

  static proxy(name, client, context ={}) {
    return new Proxy(new Db(name, client, context), {
      get: function(target, name) {
        if(target[name]) return target[name];
        // Save the current namespace
        context.__namespace = `${target.name}.${name}`;
        // Return the collection
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

  getSisterDB(name) {
    return Db.proxy(name, this.client);
  }
}

module.exports = Db;
