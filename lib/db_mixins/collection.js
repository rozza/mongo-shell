const crypto = require('crypto');
const {
  wrapper,
  _getErrorWithCode,
  addHelp,
  _hashPassword,
  isStringAndNotEmpty,
  mustExist,
} = require('../helpers');

const {
  createCollection,
  createView,
} = require('../help/auth');

module.exports = function(prototype) {
  prototype.createCollection = function(name, options = {}) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      // We have special handling for the 'flags' field, and provide sugar for specific flags. If
      // the user specifies any flags we send the field in the command. Otherwise, we leave it blank
      // and use the server's defaults.
      var flags = 0;

      // Did the user pass the usePowerOf2Sizes
      if (options.usePowerOf2Sizes) {
        console.log(
          "WARNING: The 'usePowerOf2Sizes' flag is ignored in 3.0 and higher as all MMAPv1 " +
          "collections use fixed allocation sizes unless the 'noPadding' flag is specified");

        flags |= 1;  // Flag_UsePowerOf2Sizes
        delete options.usePowerOf2Sizes;
      }

      // Did the user pass the noPadding
      if (options.noPadding) {
        flags |= 2;  // Flag_NoPadding
        delete options.noPadding;
      }

      // New flags must be added above here.
      if (flags != 0) {
        if (options.flags != undefined) {
          return reject(Error("Can't set 'flags' with either 'usePowerOf2Sizes' or 'noPadding'"));
        }

        options.flags = flags;
      }

      // Run the command agains the current database
      const result = yield self
        .client
        .db(self.name)
        .command(Object.assign({ create: name }, options));
      resolve(result);
    });
  }

  prototype.createView = function (name, viewOn, pipeline, options = {}) {
    var self = this;

    return wrapper(function*(resolve, reject) {
      if(!mustExist('viewOn', viewOn, reject, "Must specify a backing view or collection") return;
      if(!mustExist('pipeline', viewOn, reject) return;

      if (pipeline != null && typeof pipeline == 'object' && !Array.isArray(pipeline)) {
        pipeline = pipeline[pipeline];
      } else if (!Array.isArray(pipeline)){
        return reject(new Error('Pipline parameter must be an array or a single object'));
      }

      // Create the command
      const cmd = Object.assign({
        create: name, pipeline: pipeline, viewOn: viewOn
      }, options);

      // Run the command agains the current database
      const result = yield self
        .client
        .db(self.name)
        .command(cmd);
      resolve(result);
    });
  }

  // Add help methods
  addHelp(prototype.createCollection, createCollection);
  addHelp(prototype.createView, createView);
}
