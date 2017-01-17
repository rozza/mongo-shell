"use strict"

class Collection {
  findOne(args) {
    return new Promise((resolve, reject) => {
      resolve(`Hello world from findOne :: ${JSON.stringify(args)}`)
    });
  }
}

module.exports = Collection;
