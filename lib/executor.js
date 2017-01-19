const {
  __promisify,
  __shellWrapperMethod,
  sleep,
} = require('./helpers');
const GeneratorFunction  = Object.getPrototypeOf(function*(){}).constructor;
const Script = require('vm').Script;
const co = require('co');
const falafel = require('falafel');
const Db = require('./db');

class Executor {
  constructor() {}

  executeAsync(cmd, context = {}, options = {}) {
    // Instrument the code
    var output = falafel(cmd, function (node) {
      if (node.type === 'CallExpression') {
        node.update(`yield __shellWrapperMethod("${node.callee.source()}", ${node.callee.source()}).apply(${node.callee.object ? node.callee.object.source() : 'this'}, [${node.arguments.map(x => x.source())}])`);
      } else if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
        // Wrap the content in a co routine
        const functionName = node.id ? node.id.name : '';
        // Update the node for the function
        node.update(`
          function ${functionName}(${node.params ? node.params.map(x => x.name) : ''}) {
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

    // console.log("===============================")
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

  executeSync(file, context, options = {}) {
    const self = this;

    return new Promise((resolve, reject) => {
      co(function*() {
        self.executeAsync(file, context, options);
        // console.log("-------------------------- 0")
        // Wait for execution to finish
        while (context.__executing) {
          yield sleep(10);
        }
        // console.log("-------------------------- 1")

        resolve();
      }).catch(reject);
    });
  }
}

module.exports = Executor;
