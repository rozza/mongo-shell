const crypto = require('crypto');
const {
  ReadPreference
} = require('mongodb');
const {
  wrapper,
  _getErrorWithCode,
  addHelp,
  _hashPassword,
  isStringAndNotEmpty,
  mustExist,
} = require('../helpers');

const {
  cloneDatabase,
  cloneCollection,
} = require('../help/admin');

function hashPassword(nonce, username, password) {
  // Use node md5 generator
  var md5 = crypto.createHash('md5');
  md5.update(`${nonce}${username}${_hashPassword(username, password)}`);
  return md5.digest('hex');
}

module.exports = function(prototype) {
  prototype.cloneCollection = function(from, collection, query = {}) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      if(!isStringAndNotEmpty('from', from, reject)) return;
      if(!isStringAndNotEmpty('collection', collection, reject)) return;

      const cmd = Object.assign({
        cloneCollection: `${self.name}.${collection}`,
        from: from,
        query: query,
      });

      // Run the command agains the current database
      const result = yield self
        .client
        .db(self.name)
        .command(cmd);
      resolve(result);
    });
  }

  prototype.cloneDatabase = function(from) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      if(!isStringAndNotEmpty('from', from, reject)) return;

      const cmd = Object.assign({
        clone: from,
      });

      // Run the command agains the current database
      const result = yield self
        .client
        .db(self.name)
        .command(cmd);
      resolve(result);
    });
  }

  prototype.copyDatabase = function(fromdb, todb, fromhost = '', username, password, mechanism, slaveOk) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      if(!isStringAndNotEmpty('fromdb', fromdb, reject)) return;
      if(!isStringAndNotEmpty('todb', todb, reject)) return;

      // Default read Preference
      let _slaveOk = false;

      // Has the user specified that they want to do a slaveOk copy
      if ((typeof username === "boolean") && (typeof password === "undefined") &&
        (typeof mechanism === "undefined") && (typeof slaveOk === "undefined")) {
        _slaveOk = username;
        username = undefined;
      }

      // No mechanism specified use the default for the current connection
      if (!mechanism) {
        mechanism = 'DEFAULT';
      }

      if(!(mechanism == "SCRAM-SHA-1" || mechanism == "MONGODB-CR")) {
        return reject(new Error(`only SCRAM-SHA-1 or MONGODB-CR methods supported`));
      }

      // Check for no auth or copying from localhost
      if (!username || !password || fromhost == "") {
        // Run the command agains the current database
        let result = yield self
          .client
          .db('admin')
          .command({
            copydb: 1,
            fromhost: fromhost,
            fromdb: fromdb,
            todb: todb,
            slaveOk: _slaveOk
          });
        return resolve(result);
      }

      // TODO
      // Need to figure out what the native helper is doing here
      // To ensure we can support the full command

      // // Use the copyDatabase native helper for SCRAM-SHA-1
      // if (mechanism == "SCRAM-SHA-1") {
      //   return this.getMongo().copyDatabaseWithSCRAM(
      //         fromdb, todb, fromhost, username, password, slaveOk);
      // }

      // Fall back to MONGODB-CR
      // Get the nonce for the db copy
      let result = yield self
        .client
        .db('admin')
        .command({copydbgetnonce: 1, fromhost: fromhost});
      // Execute the copydb method
      result = yield self
        .client
        .db('admin')
        .command({
          copydb: 1,
          fromhost: fromhost,
          fromdb: fromdb,
          todb: todb,
          username: username,
          nonce: n.nonce,
          key: hashPassword(n.nonce, username, password),
          slaveOk: slaveOk,
        });
    });
  }

  // Add all the helper functions
  addHelp(prototype.cloneCollection, cloneCollection);
  addHelp(prototype.cloneDatabase, cloneDatabase);
}
