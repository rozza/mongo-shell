const dox = require('dox');
const fs = require('fs');
const mkdirp = require('mkdirp')

// name space configurations
const namespaces = {
  db: [
    `${__dirname}/lib/db.js`,
    `${__dirname}/lib/db_mixins/admin.js`,
    `${__dirname}/lib/db_mixins/auth.js`,
    `${__dirname}/lib/db_mixins/collection.js`,
    `${__dirname}/lib/db_mixins/operations.js`,
  ],
  collection: [
    `${__dirname}/lib/collection.js`,
  ],
}

// Create docs directory
mkdirp.sync(`${__dirname}/lib/docs`);

// List of final index file
const indexes = {};

// Iterate over all the namespaces and generate the files
for (let namespace in namespaces) {
  for (var i = 0; i < namespaces[namespace].length; i++) {
    const code = fs.readFileSync(namespaces[namespace][i], 'utf8');
    const obj = dox.parseComments(code, {raw: true});

    // Iterate over all the object
    obj.forEach(element => {
      if(element.ctx.type == 'method') {
        fs.writeFileSync(
          `${__dirname}/lib/docs/${namespace}.${element.ctx.name}.js`,
          `module.exports = ${JSON.stringify(element, null, 2)}`,
          'utf8')

        // Add the file and method to the indexes
        indexes[`${namespace}.${element.ctx.name}`] = `./${namespace}.${element.ctx.name}`
      }
    });
  }
}

// Strings
const strings = [];

// create the index file string
for (var name in indexes) {
  strings.push(`  '${name}': require('${indexes[name]}')`);
}

const template = `
module.exports = {
${strings.join(',\n')}
}
`

// Write the indexes file
fs.writeFileSync(`${__dirname}/lib/docs/index.js`, template, 'utf8');

console.dir(indexes)
