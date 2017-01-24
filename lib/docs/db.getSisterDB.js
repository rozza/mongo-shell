module.exports = {
  "tags": [
    {
      "type": "param",
      "string": "name String - name of the new database to return",
      "name": "name",
      "description": "<p>String - name of the new database to return</p>",
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
      "description": "<p>Db</p>"
    }
  ],
  "description": {
    "full": "<p>Returns a sister db<br />\nUsage: db.getSisterDB('db1')</p>",
    "summary": "<p>Returns a sister db<br />\nUsage: db.getSisterDB('db1')</p>",
    "body": ""
  },
  "isPrivate": false,
  "isConstructor": false,
  "isClass": false,
  "isEvent": false,
  "ignore": false,
  "line": 47,
  "codeStart": 54,
  "code": "getSisterDB(name) {\n  return Db.proxy(name, this.client);\n}",
  "ctx": {
    "type": "method",
    "name": "getSisterDB",
    "string": "getSisterDB()"
  }
}