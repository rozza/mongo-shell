const crypto = require('crypto');
const {
  wrapper,
  _getErrorWithCode,
  addHelp,
} = require('../helpers')

const {
  createUser,
  updateUser,
  changeUserPassword,
  auth,
  _hashPassword,
  createRole,
} = require('../help/auth');

function modifyCommandToDigestPasswordIfNecessary(cmd, username) {
  if (!cmd.pwd) {
    return;
  }

  if (cmd.digestPassword) {
    throw Error("Cannot specify 'digestPassword' through the user management shell helpers, use 'passwordDigestor' instead");
  }

  var passwordDigestor = cmd.passwordDigestor ? cmd.passwordDigestor : "client";
  if (passwordDigestor == "server") {
    cmd.digestPassword = true;
  } else if (passwordDigestor == "client") {
    cmd.pwd = _hashPassword(username, cmd.pwd);
    cmd.digestPassword = false;
  } else {
    throw Error(`'passwordDigestor' must be either 'server' or 'client', got: '${passwordDigestor}'`);
  }

  delete cmd.passwordDigestor;
}

module.exports = function(prototype) {
  prototype.createUser = function(user, writeConcern) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      let result = null;
      const name = user.user;
      const cmd = Object.assign({ createUser: name}, user);
      delete cmd['user'];

      // Mofify the command to digest password
      modifyCommandToDigestPasswordIfNecessary(cmd, name);

      // Set the write concern
      cmd.writeConcern = writeConcern ? writeConcern : self._defaultWriteConcern;

      try {
        // Run the command agains the current database
        result = yield self
          .client
          .db(self.name)
          .command(cmd, options);
        resolve(result);
      } catch(err) {
        if (err.errmsg == "no such cmd: createUser") {
          return reject(new Error("'createUser' command not found. This is most likely"
            + " because you are talking to an old (pre v2.6) MongoDB server"));
        }

        if (res.errmsg == "timeout") {
          return reject(new Error("timed out while waiting for user authentication to"
            + " replicate - database will not be fully secured until replication finishes"));
        }

        reject(_getErrorWithCode(err, `couldn't add user: ${res.errmsg}`));
      }
    });
  }

  prototype.updateUser = function(name, updateObject, writeConcern = {}) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      let cmd = Object.assign({updateUser: name}, updateObject);
      cmd.writeConcern = writeConcern ? writeConcern : self._defaultWriteConcern;

      // Mofify the command to digest password
      modifyCommandToDigestPasswordIfNecessary(cmd, name);

      try {
        // Run the command agains the current database
        const result = yield self
          .client
          .db(self.name)
          .command(cmd, options);
        resolve(result);
      } catch(err) {
        reject(_getErrorWithCode(err, `Updating user failed: ${res.errmsg}`));
      }
    });
  }

  prototype.changeUserPassword = function(username, password, writeConcern) {
    return this.updateUser(username, {pwd: password}, writeConcern);
  }

  prototype.auth = function() {
    var self = this;
    var args = Array.prototype.slice.call(arguments, 0);

    return wrapper(function*(resolve, reject) {
      const db = self.client.db(self.name);
      const result = yield db
        .authenticate.apply(db, args);
      resolve(result);
    });
  }

  prototype.createRole = function(roleObj, writeConcern = {}) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      var name = roleObj.role;
      // Create command object
      const cmd = Object.assign({ createRole: name }, roleObj);
      delete cmd['role'];
      // Add write concern
      cmd.writeConcern = writeConcern ? writeConcern : self._defaultWriteConcern;

      // Run the command agains the current database
      const result = yield self
        .client
        .db(self.name)
        .command(cmd);
      resolve(roleObj);
    });
  }

  // Add help methods
  addHelp(prototype.createUser, createUser);
  addHelp(prototype.updateUser, updateUser);
  addHelp(prototype.changeUserPassword, changeUserPassword);
  addHelp(prototype.auth, auth);
  addHelp(prototype.createRole, createRole);
}
