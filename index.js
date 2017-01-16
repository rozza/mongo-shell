const co = require('co');
const GeneratorFunction  = Object.getPrototypeOf(function*(){}).constructor;
const vm = require('vm');
const Script = require('vm').Script;
const repl = require('repl');
const falafel = require('falafel');
const promisify = require("es6-promisify");
const jsfmt = require('jsfmt');
// const BluebirdPromise = require('bluebird').Promise;

// console.dir(Promise)

var cmd = "db.documents.findOne()"

class Db {
  constructor() {
    this.documents = new Collection('documents');
  }
}

class Collection {
  findOne(args) {
    return new Promise((resolve, reject) => {
      resolve(`Hello world from findOne :: ${JSON.stringify(args)}`)
    });
  }
}

function __promisify(context, func) {
  return function() {
    const args = Array.prototype.slice.call(arguments, 0);

    if (args.length > 0 && typeof args[args.length - 1] == 'function') {
      return new Promise((resolve, reject) => {
        const callback = args.pop();
        args.push((err, result) => {
          // Do we have an error
          if(err) return reject(err);
          // Resolve the result
          resolve(result);
        });
      });
    } else {
      const result = func.apply(context, args);
      // Check if it returned a promise then execute the promise
      if(Promise.resolve(result) == result) {
        return result;
      } else {
        return new Promise((resolve, reject) => {
          resolve(result);
        });
      }
    }
  }
}

function __shellWrapperMethod(method) {
  return function() {
    let promisifiedMethod = __promisify(this, method);
    let promise = promisifiedMethod.apply(this, Array.prototype.slice.call(arguments, 0));
    return promise;
  }
}

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

    // var ignoreMethods = ['apply', 'bind'];
    // function skipMethod(source) {
    //   for (var i = 0; i < ignoreMethods.length; i++) {
    //     if (source.indexOf(ignoreMethods[i]) != -1) return false;
    //   }
    //
    //   return true;
    // }

    // Instrument the code
    var output = falafel(cmd, function (node) {
      // console.log("=============================== NODE")
      // console.dir(node.type)
      // console.dir(node.source())
      // if(node.source().indexOf('.bind(') != -1 || node.source().indexOf('.apply(') != -1) {
      //   console.dir(node)
      // }

      if (node.type === 'CallExpression') {
        // console.log("=============================== NODE CallExpression")
        // console.dir(node.callee.source())
        // console.dir(node)

        // if(skipMethod(node.callee.source())) {
          // console.log("=============================== NODE CallExpression MODIFY")
          node.update(`yield __shellWrapperMethod(${node.callee.source()}).apply(${node.callee.object ? node.callee.object.source() : 'this'}, [${node.arguments.map(x => x.source())}])`);
        // }
      } else if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
        // console.log("=============================== NODE FunctionDeclaration")
        // console.dir(node.body.body[0].source())
        // console.dir(node)
        // console.log(__shellWrapperMethod.toString())

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
        // console.log("=============================== NODE")
        // console.dir(node)
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

    const formattedScript = jsfmt.format(scriptString)

    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! script")
    console.log(formattedScript)

    // Create a script object
    const script = new Script(scriptString, {});

    // // Create the context
    // const context = vm.createContext(Object.assign({}, this.context, {
    //   db: db, __promisify: __promisify, __shellWrapperMethod: __shellWrapperMethod,
    // }));

    global.db = db;
    global.__promisify = __promisify;
    global.__shellWrapperMethod = __shellWrapperMethod;
    global.co = co;

    // Run a script in the global context of the shell
    // script.runInContext(context);
    script.runInThisContext();
  }
}

const executor = new Executor();
executor.execute(cmd);

// var readline = require('readline');
// var hasAnsi = require('has-ansi');
// var stripAnsi = require('strip-ansi');
//
// var prompt = "mongod> ";
//
// var _setPrompt = readline.Interface.prototype.setPrompt;
// readline.Interface.prototype.setPrompt = function() {
//   console.dir("=================================== setPrompt")
//   console.dir(arguments)
//
//   if (arguments.length === 1) {
//     // return _setPrompt.call(this, arguments[0], stripAnsi(arguments[0]).length);
//     return _setPrompt.call(this, prompt, prompt.length);
//   } else {
//     return _setPrompt.apply(this, arguments);
//   }
// };
//
// // console.dir(repl)
// var local = repl.start({
//   useGlobal: true,
//   prompt: prompt,
// });
//
// global.local = local
//
// setTimeout(() => {
//   console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
//   prompt = "go> ";
// }, 200)
// console.dir(local.prompt)
