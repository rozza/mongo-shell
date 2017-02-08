module.exports = {
  "tags": [
    {
      "type": "param",
      "string": "name String - name of the new database to return",
      "name": "name",
      "description": "String - name of the new database to return",
      "types": [],
      "typesDescription": "",
      "variable": false,
      "nonNullable": false,
      "nullable": false,
      "optional": false
    },
    {
      "type": "return",
      "string": "Db",
      "types": [],
      "typesDescription": "",
      "variable": false,
      "nonNullable": false,
      "nullable": false,
      "optional": false,
      "description": "Db"
    }
  ],
  "description": {
    "full": "Returns a sister db",
    "summary": "Returns a sister db",
    "body": ""
  },
  "isPrivate": false,
  "isConstructor": false,
  "isClass": false,
  "isEvent": false,
  "ignore": false,
  "line": 47,
  "codeStart": 53,
  "code": "getSisterDB(name) {\n  return Db.proxy(name, this.client);\n}",
  "ctx": {
    "type": "method",
    "name": "getSisterDB",
    "string": "getSisterDB()"
  }
}