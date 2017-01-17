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
  constructor() {
    this.context = {
      co: co, console: console
    };
  }

  execute(cmd) {
    cmd = `
      var b = function test2(param1){
        console.log("=== b 0")
        return "go"
      }

      function t(params) {
        console.log("=== t 0")
        var c = b();
        console.log("=== t 1")
        return c;
      }

      function test(a) {
        console.log("=== test 0")
        var c = t();
        console.log("=== test 1")
        console.log("=== inside test " + c)
        console.log("=== test 2")
        return 'b';
      }

      var a = db.documents.findOne(test.bind({a:1})())
      console.log(a);
      console.log('hello', 'world');`;

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

    // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! output 0")
    // console.log(output)
    // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! output 1")
    const rewriteCmd = output;

    // Create db instance
    const db = new Db('test');

    // Create a generator method
    const generatorFunction = new GeneratorFunction(rewriteCmd);

    // Create the scriptString
    const scriptString = `
      co(function*() {
        ${rewriteCmd}
      }).catch(err => {
        throw err;
      });
    `.trim();

    // Create a script object
    const script = new Script(scriptString, {});

    // Add the variables to the global scope
    global.db = db;
    global.__promisify = __promisify;
    global.__shellWrapperMethod = __shellWrapperMethod;
    global.co = co;

    // Run a script in the global context of the shell
    script.runInThisContext();
  }
}

module.exports = Executor;
