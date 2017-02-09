"use strict"

const { palette } = require('./colors');
const docs = require('./docs');
const Collection = require('./collection');
const Db = require('./db');

Object.keys(docs).forEach(function (key) {
  let splitKey = key.split('.');
  let context = splitKey[0];
  let functionName = splitKey[1];

  let namespace = context.startsWith('db') ? Db : Collection;
  let func = namespace.prototype[functionName]
  if (typeof func !== "undefined") {
    func.help = function (full = false, line = '') {
      let descriptionKey = full ? 'full' : 'summary';
      let params = docs[key]['tags']
      .filter(function(tag){ return tag['type'] === 'param' })
      .map(tag => {
        let desc = ': ' + tag['description'].replace(/  +/g, ' ');
        return `${tag['name']}${palette.string.dim(desc)}`;
      });
      let examples = docs[key]['tags']
      .filter(function(tag){ return tag['type'] === 'example' })
      .map(tag => {
        let usage = tag['string'];
        if (line.endsWith('(')) {
          return `${line}${usage.substring(usage.indexOf('(') + 1, usage.length)}`;
        }
        return usage;
      });
      let example = examples.length > 0 ? examples[0] : `${key}(${params.join(', ')})`;

      let start = example.substring(0, example.indexOf('(') + 1);
      let middle = example.substring(start.length, example.lastIndexOf(')'));
      let end = example.substring(example.lastIndexOf(')'), example.length);
      let colorizedExample = end.length > 0 ? `${palette.string.bold(start)}${middle}${palette.string.bold(end)}` : example;

      console.log(palette.string(`${docs[key]['description'][descriptionKey].trim()}`));
      console.log(palette.string(`Example: ${colorizedExample}`));
    }
  }
});
