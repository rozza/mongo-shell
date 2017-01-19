"use strict"

const co = require('co');
let id = 0;

class Cursor {
  constructor(cursor) {
    this.id = id++;
    this.cursor = cursor;
  }

  next() {
    var self = this;

    return new Promise((resolve, reject) => {
      co(function*() {
        let doc = yield self.cursor.next();
        resolve(doc);
      }).catch(reject);
    });
  }
}

module.exports = Cursor;
