"use strict"

class Collection {
  constructor(databaseName, name, client) {
    this.databaseName = databaseName;
    this.name = name;
    this.client = client;
  }

  findOne(args) {
    return new Promise((resolve, reject) => {
      resolve(`Hello world from findOne :: ${JSON.stringify(args)}`)
    });
  }
}

module.exports = Collection;
