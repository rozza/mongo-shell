"use strict"

const co = require('co');
const Cursor = require('./cursor');

class Collection {
  constructor(databaseName, name, db) {
    this.databaseName = databaseName;
    this.name = name;
    this.db = db;
  }

  async findOne(query, options = {}) {
    const doc = await this
      .db
      .client
      .db(this.databaseName)
      .collection(this.name)
      .findOne(query, options);

    return doc;
  }

  find(query, options = {}) {
    // Create db cursor
    const cursor = this
      .db
      .client
      .db(this.databaseName)
      .collection(this.name)
      .find(query, options);

    // Return the cursor wrapper
    return new Cursor(cursor);
  }

  async insertOne(doc, options = {}) {
    const result = await this
      .db
      .client
      .db(this.databaseName)
      .collection(this.name)
      .insertMany([doc], options);

    // Add a render method
    result.render = function(renderView) {
      if(renderView === 'repl') {
        return {
          acknowledged: true,
          insertedId: this.insertedIds[0],
        }
      } else { return this; }
    }

    return result;
  }

  async insertMany(docs, options = {}) {
    const result = await this
      .db
      .client
      .db(this.databaseName)
      .collection(this.name)
      .insertMany(docs, options);

    // Add a render method
    result.render = function(renderView) {
      if(renderView === 'repl') {
        // Result with multiple insertedIds
        return {
          acknowledged: true,
          insertedIds: this.insertedIds.map(id => {
            return id.toJSON();
          })
        }
      } else { return this; }
    }

    // Resolve the data
    return result;
  }

  async updateOne(query, update, options = {}) {
    const result = await this
      .db
      .client
      .db(this.databaseName)
      .collection(this.name)
      .updateOne(query, update, options);

    // Add a render method
    result.render = function(renderView) {
      if(renderView === 'repl') {
        // Result with multiple insertedIds
        return {
          acknowledged: true,
          insertedIds: this.insertedIds.map(id => {
            return id.toJSON();
          })
        }
      } else { return this; }
    }

    // Resolve the data
    return result;
  }

  async updateMany(query, update, options = {}) {
    const result = await this
      .db
      .client
      .db(this.databaseName)
      .collection(this.name)
      .updateMany(query, update, options);

    // Add a render method
    result.render = function(renderView) {
      if(renderView === 'repl') {
        // Result with multiple insertedIds
        return {
          acknowledged: true,
          insertedIds: this.insertedIds.map(id => {
            return id.toJSON();
          })
        }
      } else { return this; }
    }

    // Resolve the data
    return result;
  }
}

module.exports = Collection;
