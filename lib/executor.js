const {
  __promisify,
  __shellWrapperMethod,
} = require('./helpers');
const GeneratorFunction  = Object.getPrototypeOf(function*(){}).constructor;
const Script = require('vm').Script;
const co = require('co');
const falafel = require('falafel');
const Db = require('./db');

class Executor {
  constructor() {}

  execute(cmd, context = {}) {
    // Instrument the code
    var output = falafel(cmd, function (node) {
      if (node.type === 'CallExpression') {
        node.update(`yield __shellWrapperMethod(${node.callee.source()}).apply(${node.callee.object ? node.callee.object.source() : 'this'}, [${node.arguments.map(x => x.source())}])`);
      } else if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
        // Wrap the content in a co routine
        node.update(`
          function ${node.id.name}(${node.params ? node.params.map(x => x.name) : ''}) {
            return new Promise((__resolve, __reject) => {
              co(function*() {
                ${node.body.body.map(x => x.source()).join('\n')}
                __resolve();
              }).catch(__reject);
            });
          }
        `.trim());
      } else if (node.type === 'ReturnStatement') {
        node.update(`return __resolve(${node.argument.raw ? node.argument.raw : node.argument.name})`.trim());
      }
    });

    // Create the scriptString
    const scriptString = `
      co(function*() {
        __executing = true;
        ${output}
        __executing = false;
      }).catch(err => {
        throw err;
      });
    `.trim();

    // console.log("============================= scriptString")
    // console.log(scriptString)

    // Create a script object
    const script = new Script(scriptString, {});

    // Add the variables to the global scope
    context.__promisify = __promisify;
    context.__shellWrapperMethod = __shellWrapperMethod;
    context.co = co;
    context.__result = 'hello';

    // Run a script in the global context of the shell
    script.runInContext(context);
  }
}

module.exports = Executor;
