"use strict"

const Collection = require('./collection');
const co = require('co');
const AuthMixin = require('./db_mixins/auth');
const AdminMixin = require('./db_mixins/admin');
const OperationsMixin = require('./db_mixins/operations');
const {
  wrapper
} = require('./helpers')

class Db {
  constructor(name, client, context = {}) {
    this.name = name;
    this.client = client;
    this.context = context;
    // Default write concern is w:1
    this._defaultWriteConcern = {w:1};
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

  /*
   * Returns a sister db
   *
   * @param name String - name of the new database to return
   * @return Db
   */
  getSisterDB(name) {
    return Db.proxy(name, this.client);
  }

  /*
   * Returns the current server status
   *
   * @param [options] Object - additional options passed in
   * @return Object
   */
  serverStatus(options = {}) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      const result = yield self
        .client
        .db('admin')
        .command(Object.assign({serverStatus: 1}, options));
      resolve(result);
    });
  }

  stats(scale) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      const result = yield self
        .client
        .db(self.name)
        .command({dbstats: 1, scale: scale});
      resolve(result);
    });
  }

  adminCommand(cmd, options = {}) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      const result = yield self
        .client
        .db(self.name)
        .command(cmd, options);
      resolve(result);
    });
  }
}

// Mix in authentication and user management functions
AuthMixin(Db.prototype);
AdminMixin(Db.prototype);
OperationsMixin(Db.prototype);

// Export the Db
module.exports = Db;
