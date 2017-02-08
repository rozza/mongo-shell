module.exports = {
  "tags": [
    {
      "type": "example",
      "string": "db.users.findOne({name: 'Donald'}, {_id: 0})"
    },
    {
      "type": "param",
      "string": "query {object} - the optional query",
      "name": "query",
      "description": "{object} - the optional query",
      "types": [],
      "typesDescription": "",
      "variable": false,
      "nonNullable": false,
      "nullable": false,
      "optional": false
    },
    {
      "type": "param",
      "string": "options {object} - the find options",
      "name": "options",
      "description": "{object} - the find options",
      "types": [],
      "typesDescription": "",
      "variable": false,
      "nonNullable": false,
      "nullable": false,
      "optional": false
    },
    {
      "type": "return",
      "string": "the first document that matches the query",
      "types": [],
      "typesDescription": "",
      "variable": false,
      "nonNullable": false,
      "nullable": false,
      "optional": false,
      "description": "the first document that matches the query"
    }
  ],
  "description": {
    "full": "Returns the first document that matches the query",
    "summary": "Returns the first document that matches the query",
    "body": ""
  },
  "isPrivate": false,
  "isConstructor": false,
  "isClass": false,
  "isEvent": false,
  "ignore": false,
  "line": 21,
  "codeStart": 29,
  "code": "findOne(query, options) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    const doc = yield self\n      .db\n      .client\n      .db(self.databaseName)\n      .collection(self.name)\n      .findOne(query, options);\n\n    resolve(doc);\n  });\n}\n\nfind(query, options = {}) {\n  // Create db cursor\n  const cursor = this\n    .db\n    .client\n    .db(this.databaseName)\n    .collection(this.name)\n    .find(query, options);\n\n  // Return the cursor wrapper\n  return new Cursor(cursor);\n}\n\ninsertOne(doc, options = {}) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    const result = yield self\n      .db\n      .client\n      .db(self.databaseName)\n      .collection(self.name)\n      .insertMany([doc], options);\n\n    // Add a render method\n    result.render = function(renderView) {\n      if(renderView === 'repl') {\n        return {\n          acknowledged: true,\n          insertedId: this.insertedIds[0],\n        }\n      } else { return this; }\n    }\n\n    resolve(result);\n  });\n}\n\ninsertMany(docs, options = {}) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    const result = yield self\n      .db\n      .client\n      .db(self.databaseName)\n      .collection(self.name)\n      .insertMany(docs, options);\n\n    // Add a render method\n    result.render = function(renderView) {\n      if(renderView === 'repl') {\n        // Result with multiple insertedIds\n        return {\n          acknowledged: true,\n          insertedIds: this.insertedIds.map(id => {\n            return id.toJSON();\n          })\n        }\n      } else { return this; }\n    }\n\n    // Resolve the data\n    resolve(result);\n  });\n}\n\nupdateOne(query, update, options = {}) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    const result = yield self\n      .db\n      .client\n      .db(self.databaseName)\n      .collection(self.name)\n      .updateOne(query, update, options);\n\n      // upsert format\n      // {\n      // \t\"acknowledged\" : true,\n      // \t\"matchedCount\" : 0,\n      // \t\"modifiedCount\" : 0,\n      // \t\"upsertedId\" : ObjectId(\"588211ee18c2f3a1f00aa0dc\")\n      // }\n      // update format hit and no hit\n      // { \"acknowledged\" : true, \"matchedCount\" : 1, \"modifiedCount\" : 0 }\n      // { \"acknowledged\" : true, \"matchedCount\" : 0, \"modifiedCount\" : 0 }\n\n    // Add a render method\n    result.render = function(renderView) {\n      if(renderView === 'repl') {\n        // Returned values\n        const finalObject = {\n          acknowledged: true, matchedCount: this.matchedCount, modifiedCount: this.modifiedCount,\n        }\n\n        // Add the upserted Id\n        if(this.upsertedId) {\n          finalObject.upsertedId = this.upsertedId._id;\n        }\n\n        // Result with multiple insertedIds\n        return finalObject;\n      } else { return this; }\n    }\n\n    // Resolve the data\n    resolve(result);\n  });\n}\n\nupdateMany(query, update, options = {}) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    const result = yield self\n      .db\n      .client\n      .db(self.databaseName)\n      .collection(self.name)\n      .updateMany(query, update, options);\n\n    // Add a render method\n    result.render = function(renderView) {\n      if(renderView === 'repl') {\n        // Returned values\n        const finalObject = {\n          acknowledged: true, matchedCount: this.matchedCount, modifiedCount: this.modifiedCount,\n        }\n\n        // Add the upserted Id\n        if(this.upsertedId) {\n          finalObject.upsertedId = this.upsertedId._id;\n        }\n\n        // Result with multiple insertedIds\n        return finalObject;\n      } else { return this; }\n    }\n\n    // Resolve the data\n    resolve(result);\n  });\n}\n\ndeleteOne(query, options = {}) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    const result = yield self\n      .db\n      .client\n      .db(self.databaseName)\n      .collection(self.name)\n      .deleteOne(query, options);\n\n    // Add a render method\n    result.render = function(renderView) {\n      if(renderView === 'repl') {\n        return {\n          acknowledged: true, deletedCount: this.deletedCount\n        }\n      } else { return this; }\n    }\n\n    // Resolve the data\n    resolve(result);\n  });\n}\n\ndeleteMany(query, options = {}) {\n  var self = this;\n\n  return wrapper(function*(resolve, reject) {\n    const result = yield self\n      .db\n      .client\n      .db(self.databaseName)\n      .collection(self.name)\n      .deleteMany(query, options);\n\n    // Add a render method\n    result.render = function(renderView) {\n      if(renderView === 'repl') {\n        return {\n          acknowledged: true, deletedCount: this.deletedCount\n        }\n      } else { return this; }\n    }\n\n    // Resolve the data\n    resolve(result);\n  });\n}\n}\n\nmodule.exports = Collection;",
  "ctx": {
    "type": "method",
    "name": "findOne",
    "string": "findOne()"
  }
}