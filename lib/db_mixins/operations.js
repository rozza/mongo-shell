const crypto = require('crypto');
const {
  wrapper,
  _getErrorWithCode,
  _hashPassword,
  isStringAndNotEmpty,
  mustExist,
} = require('../helpers');

module.exports = function(prototype) {
  prototype.dbEval = function(func) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      console.log("WARNING: db.eval is deprecated");

      // Create command
      var cmd = {
        $eval: func,
        args: arguments.length > 1 ? Array.from(arguments).slice(1) : [],
      }

      // Run the command agains the current database
      const result = yield self
        .client
        .db(self.name)
        .command(cmd);
      // Did we get a return value
      if(result && result.retval) {
        return resolve(result.retval);
      }

      resolve(result);
    });
  }
}
