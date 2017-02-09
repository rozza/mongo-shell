module.exports = {
  "tags": [],
  "description": {
    "full": "Creates a new Collection",
    "summary": "Creates a new Collection",
    "body": ""
  },
  "isPrivate": false,
  "isConstructor": false,
  "isClass": false,
  "isEvent": false,
  "ignore": false,
  "line": 11,
  "codeStart": 14,
  "code": "prototype.createCollection = function(name, options = {}) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    // We have special handling for the 'flags' field, and provide sugar for specific flags. If\n    // the user specifies any flags we send the field in the command. Otherwise, we leave it blank\n    // and use the server's defaults.\n    var flags = 0;\n\n    // Did the user pass the usePowerOf2Sizes\n    if (options.usePowerOf2Sizes) {\n      console.log(\n        \"WARNING: The 'usePowerOf2Sizes' flag is ignored in 3.0 and higher as all MMAPv1 \" +\n        \"collections use fixed allocation sizes unless the 'noPadding' flag is specified\");\n\n      flags |= 1;  // Flag_UsePowerOf2Sizes\n      delete options.usePowerOf2Sizes;\n    }\n\n    // Did the user pass the noPadding\n    if (options.noPadding) {\n      flags |= 2;  // Flag_NoPadding\n      delete options.noPadding;\n    }\n\n    // New flags must be added above here.\n    if (flags != 0) {\n      if (options.flags != undefined) {\n        return reject(Error(\"Can't set 'flags' with either 'usePowerOf2Sizes' or 'noPadding'\"));\n      }\n\n      options.flags = flags;\n    }\n\n    // Run the command agains the current database\n    const result = yield self\n      .client\n      .db(self.name)\n      .command(Object.assign({ create: name }, options));\n    resolve(result);\n  });\n}\n\nprototype.createView = function (name, viewOn, pipeline, options = {}) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    if(!mustExist('viewOn', viewOn, reject, \"Must specify a backing view or collection\") return;\n    if(!mustExist('pipeline', viewOn, reject) return;\n\n    if (pipeline != null && typeof pipeline == 'object' && !Array.isArray(pipeline)) {\n      pipeline = pipeline[pipeline];\n    } else if (!Array.isArray(pipeline)){\n      return reject(new Error('Pipline parameter must be an array or a single object'));\n    }\n\n    // Create the command\n    const cmd = Object.assign({\n      create: name, pipeline: pipeline, viewOn: viewOn\n    }, options);\n\n    // Run the command agains the current database\n    const result = yield self\n      .client\n      .db(self.name)\n      .command(cmd);\n    resolve(result);\n  });\n}\n}",
  "ctx": {
    "type": "method",
    "receiver": "prototype",
    "name": "createCollection",
    "string": "prototype.createCollection()"
  }
}