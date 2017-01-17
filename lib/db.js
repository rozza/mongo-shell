"use strict"

const Collection = require('./collection');

class Db {
  constructor() {
    this.documents = new Collection('documents');
  }
}

module.exports = Db;
