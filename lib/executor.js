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
      // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
      // console.log(node.source())
      // console.dir(node)

      if (node.type === 'CallExpression') {
        // Set the value of the detectCallbacks
        const detectCallbacks = typeof options.detectCallbacks == 'boolean' ? options.detectCallbacks : false;
        // Update the node with the wrapper
        node.update(`__result = yield __shellWrapperMethod(${detectCallbacks}, "${node.callee.source()}", ${node.callee.source()}).apply(${node.callee.object ? node.callee.object.source() : 'this'}, [${node.arguments.map(x => x.source())}])`);
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
              }).catch(err => {
                __reject(err);
              });
            });
          }
        `.trim());
      } else if (node.type === 'ReturnStatement') {
        node.update(`return __resolve(${node.argument.raw ? node.argument.raw : node.argument.name})`.trim());
      } else if (node.type === 'VariableDeclaration' && node.parent && node.parent.type === 'Program') {
        const sourceParts = node.source().split(' ');
        const newString = ['__result', '='].concat(sourceParts.slice(1));
        node.update(newString.join(' '));
      } else if (node.type === 'ExpressionStatement' && node.parent && node.parent.type === 'Program') {
        const sourceParts = node.source().split(' ');
        const newString = ['__result', '='].concat(sourceParts);
        node.update(newString.join(' '));
      }
    });

    // Create the scriptString
    const scriptString = `
      co(function*() {
        __executing = true;
        ${output}
        __executing = false;
      }).catch(err => {
        // console.log(err)
        __executing = false;
        __executingError = err;
      });
    `.trim();

    // console.log("========================================================")
    // console.log(scriptString)

    // Create a script object
    const script = new Script(scriptString, {});

    // Add the variables to the global scope
    context.__promisify = __promisify;
    context.__shellWrapperMethod = __shellWrapperMethod;
    context.co = co;

    // Run a script in the global context of the shell
    return script.runInContext(context);
  }

  executeSync(file, context, options) {
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
