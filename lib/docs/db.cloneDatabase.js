module.exports = {
  "tags": [
    {
      "type": "param",
      "string": "{String} from Where to clone from (dbhostname[:port]). May not be the current database\n              as you cannot clone to yourself.",
      "name": "from",
      "description": "Where to clone from (dbhostname[:port]). May not be the current database               as you cannot clone to yourself.",
      "types": [
        "String"
      ],
      "typesDescription": "<code>String</code>",
      "optional": false,
      "nullable": false,
      "nonNullable": false,
      "variable": false
    },
    {
      "type": "return",
      "string": "Object returned has member ok set to true if operation succeeds, false otherwise.\nSee also: db.copyDatabase()",
      "types": [],
      "typesDescription": "",
      "variable": false,
      "nonNullable": false,
      "nullable": false,
      "optional": false,
      "description": "Object returned has member ok set to true if operation succeeds, false otherwise. See also: db.copyDatabase()"
    }
  ],
  "description": {
    "full": "Clone database on another server to here.\n\nGenerally, you should dropDatabase() first as otherwise the cloned information will MERGE\ninto whatever data is already present in this database.  (That is however a valid way to use\nclone if you are trying to do something intentionally, such as union three non-overlapping\ndatabases into one.)\n\nThis is a low level administrative function will is not typically used.",
    "summary": "Clone database on another server to here.",
    "body": "Generally, you should dropDatabase() first as otherwise the cloned information will MERGE\ninto whatever data is already present in this database.  (That is however a valid way to use\nclone if you are trying to do something intentionally, such as union three non-overlapping\ndatabases into one.)\n\nThis is a low level administrative function will is not typically used."
  },
  "isPrivate": false,
  "isConstructor": false,
  "isClass": false,
  "isEvent": false,
  "ignore": false,
  "line": 44,
  "codeStart": 59,
  "code": "prototype.cloneDatabase = function(from) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    if(!isStringAndNotEmpty('from', from, reject)) return;\n\n    const cmd = Object.assign({\n      clone: from,\n    });\n\n    // Run the command agains the current database\n    const result = yield self\n      .client\n      .db(self.name)\n      .command(cmd);\n    resolve(result);\n  });\n}\n\nprototype.copyDatabase = function(fromdb, todb, fromhost = '', username, password, mechanism, slaveOk) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    if(!isStringAndNotEmpty('fromdb', fromdb, reject)) return;\n    if(!isStringAndNotEmpty('todb', todb, reject)) return;\n\n    // Default read Preference\n    let _slaveOk = false;\n\n    // Has the user specified that they want to do a slaveOk copy\n    if ((typeof username === \"boolean\") && (typeof password === \"undefined\") &&\n      (typeof mechanism === \"undefined\") && (typeof slaveOk === \"undefined\")) {\n      _slaveOk = username;\n      username = undefined;\n    }\n\n    // No mechanism specified use the default for the current connection\n    if (!mechanism) {\n      mechanism = 'DEFAULT';\n    }\n\n    if(!(mechanism == \"SCRAM-SHA-1\" || mechanism == \"MONGODB-CR\")) {\n      return reject(new Error(`only SCRAM-SHA-1 or MONGODB-CR methods supported`));\n    }\n\n    // Check for no auth or copying from localhost\n    if (!username || !password || fromhost == \"\") {\n      // Run the command agains the current database\n      let result = yield self\n        .client\n        .db('admin')\n        .command({\n          copydb: 1,\n          fromhost: fromhost,\n          fromdb: fromdb,\n          todb: todb,\n          slaveOk: _slaveOk\n        });\n      return resolve(result);\n    }\n\n    // TODO\n    // Need to figure out what the native helper is doing here\n    // To ensure we can support the full command\n\n    // // Use the copyDatabase native helper for SCRAM-SHA-1\n    // if (mechanism == \"SCRAM-SHA-1\") {\n    //   return this.getMongo().copyDatabaseWithSCRAM(\n    //         fromdb, todb, fromhost, username, password, slaveOk);\n    // }\n\n    // Fall back to MONGODB-CR\n    // Get the nonce for the db copy\n    let result = yield self\n      .client\n      .db('admin')\n      .command({copydbgetnonce: 1, fromhost: fromhost});\n    // Execute the copydb method\n    result = yield self\n      .client\n      .db('admin')\n      .command({\n        copydb: 1,\n        fromhost: fromhost,\n        fromdb: fromdb,\n        todb: todb,\n        username: username,\n        nonce: n.nonce,\n        key: hashPassword(n.nonce, username, password),\n        slaveOk: slaveOk,\n      });\n  });\n}\n\nprototype.currentOp = function(arg) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    const query = arg != null && typeof(arg) == \"object\"\n      ? Object.assign({}, arg)\n      : { $all: true };\n\n    // Create command\n    var cmd = Object.assign({\"currentOp\": 1}, query);\n    try {\n      // Execute command against admin\n      let result = yield self\n        .client\n        .db('admin')\n        .command(cmd);\n      resolve(result);\n    } catch(err) {\n      // always send legacy currentOp with default (null) read preference (SERVER-17951)\n      // Command not supported use legacy mode\n      if (commandUnsupported(err)) {\n        let result = yield self\n          .client\n          .db('admin')\n          .collection('$cmd.sys.inprog')\n          .finOne(query);\n        resolve(result);\n      }\n    }\n  });\n}\n}",
  "ctx": {
    "type": "method",
    "receiver": "prototype",
    "name": "cloneDatabase",
    "string": "prototype.cloneDatabase()"
  }
}