"use strict"

const Collection = require('./collection');

class Db {
  constructor(name, client) {
    this.name = name;
    this.client = client;
  }

  getSisterDB() {
  }
}

module.exports = Db;
