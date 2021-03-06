module.exports = {
  "tags": [
    {
      "type": "param",
      "string": "[options] Object - additional options passed in",
      "name": "[options]",
      "description": "Object - additional options passed in",
      "types": [],
      "typesDescription": "",
      "variable": false,
      "nonNullable": false,
      "nullable": false,
      "optional": false
    },
    {
      "type": "return",
      "string": "Object",
      "types": [],
      "typesDescription": "",
      "variable": false,
      "nonNullable": false,
      "nullable": false,
      "optional": false,
      "description": "Object"
    }
  ],
  "description": {
    "full": "Returns the current server status",
    "summary": "Returns the current server status",
    "body": ""
  },
  "isPrivate": false,
  "isConstructor": false,
  "isClass": false,
  "isEvent": false,
  "ignore": false,
  "line": 57,
  "codeStart": 63,
  "code": "serverStatus(options = {}) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    const result = yield self\n      .client\n      .db('admin')\n      .command(Object.assign({serverStatus: 1}, options));\n    resolve(result);\n  });\n}\n\nstats(scale) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    const result = yield self\n      .client\n      .db(self.name)\n      .command({dbstats: 1, scale: scale});\n    resolve(result);\n  });\n}\n\nadminCommand(cmd, options = {}) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    const result = yield self\n      .client\n      .db(self.name)\n      .command(cmd, options);\n    resolve(result);\n  });\n}\n}\n\n// Mix in authentication and user management functions\nAuthMixin(Db.prototype);\nAdminMixin(Db.prototype);\nOperationsMixin(Db.prototype);\n\n// Export the Db\nmodule.exports = Db;",
  "ctx": {
    "type": "method",
    "name": "serverStatus",
    "string": "serverStatus()"
  }
}