"use strict"

const docs = require('./docs');
const Collection = require('./collection');
const columnify = require('columnify');
const Db = require('./db');
const { palette } = require('./colors');
const log = console.log;

const namespaces = [
  ['db', Db],
  ['db.collection', Collection]
]

class Help {

  constructor() {
    this.__attach_help_methods();
  }

  autocomplete(context, hints) {
    if (hints.length != 1) return;

    let hint = hints[0].trim()
    let function_name = hint.split('.').slice(-1)[0];
    function_name = function_name.endsWith('(') ? function_name.substring(0, function_name.length - 1) : function_name;
    let namespace = this.__get_namespace(context);
    let help = this.__get_help_method(namespace, function_name);
    if (typeof help !== "undefined") {
      log();
      help(false, hint);
      log();
    }
  }

  cmd(cmd) {
    log(`
------------------------
-- MongoDB Shell Help --
------------------------
`);
    switch (cmd.trim()) {
      case 'help':
        this.__cmd_db_help();
        this.__cmd_collection_help();
        break;
      case 'help db':
        this.__cmd_db_help();
        break;
      case 'help collection':
        this.__cmd_collection_help();
        break;
      default:
        log(`${palette.string.bold('Unknown help command:')} '${palette.string(cmd)}'.`);
        log('Help supports:');
        log(columnify(
          [
            ['help', 'Full help.'],
            ['help db', 'Database level help'],
            ['help collection', 'Collection level help']
          ], { showHeaders: false }));
    }

    log();
  }

  __cmd_db_help() {
    log(palette.string.bold("Database Help\n============="));
    this.__cmd_generate_help('db');
    log();
  }

  __cmd_collection_help() {
    log(palette.string.bold('Collection Help\n==============='));
    this.__cmd_generate_help('db.collection');
    log();
  }

  __cmd_generate_help(help_context) {
    let self = this;
    let data = Object.keys(docs)
      .filter(key => {
        let key_context = key.substr(0, key.lastIndexOf('.'));
        return key_context === help_context;
      }).sort().map(key => {
        let doc = docs[key];
        let name = doc['ctx']['type'] === 'method' ? `${key}()` : key;
        return [palette.string.green(`${name}`), doc['description']['summary'].trim()];
      })
    log(columnify(data, { showHeaders: false, config: { 0: { minWidth: 50 } } }))
  }

  __get_help_method(namespace, function_name) {
    let func = namespace.prototype[function_name]
    if (typeof func === "undefined") return func;
    return func['help'];
  }

  __attach_help_methods() {
    let self = this;
    Object.keys(docs).forEach(key => {
      let doc = docs[key];
      let namespace = this.__get_namespace(key);
      let functionName = key.substr(key.lastIndexOf('.') + 1, key.length);
      let func = namespace.prototype[functionName]
      if (typeof func !== "undefined") {
        func.help = function (full = false, line = '') {
          let descriptionKey = full ? 'full' : 'summary';
          log(palette.string.green(`${doc['description'][descriptionKey].trim()}`));
          log(palette.string.green(`Example: ${self.__generate_example(doc, line)}`));
        }
      }
    });
  }

  __generate_example(doc, line = '') {
    let params = doc['tags']
      .filter(function (tag) { return tag['type'] === 'param' })
      .map(function (tag) {
        let desc = ': ' + tag['description'].replace(/  +/g, ' ');
        return `${tag['name']}${palette.string.dim(desc)}`;
      });
    let examples = doc['tags']
      .filter(function (tag) { return tag['type'] === 'example' })
      .map(function (tag) {
        let usage = tag['string'];
        if (line.endsWith('(')) {
          return `${line}${usage.substring(usage.indexOf('(') + 1, usage.length)}`;
        }
        return usage;
      });
    let example = examples.length > 0 ? examples[0] : `${doc}(${params.join(', ')})`;

    let start = example.substring(0, example.indexOf('(') + 1);
    let middle = example.substring(start.length, example.lastIndexOf(')'));
    let end = example.substring(example.lastIndexOf(')'), example.length);
    let colourizedExample = end.length > 0 ? `${palette.string.bold(start)}${middle}${palette.string.bold(end)}` : example;
    return colourizedExample;
  }

  __get_namespace(key) {
    let namespace = undefined;
    namespaces.forEach(ns => namespace = key.startsWith(ns[0]) ? ns[1] : namespace);
    return namespace;
  }

}

const help = new Help();

module.exports = help;
