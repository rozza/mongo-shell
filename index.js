const co = require('co');
const GeneratorFunction  = Object.getPrototypeOf(function*(){}).constructor;
const vm = require('vm');
const Script = require('vm').Script;
const repl = require('repl');
const falafel = require('falafel');
const promisify = require("es6-promisify");
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
      var test = function() {
        return 'b';
      }

      var a = db.documents.findOne(test())
      console.log(a);
      console.log('hello', 'world');`;

    var output = falafel(cmd, function (node) {
      if (node.type === 'CallExpression') {
        node.update(`yield __shellWrapperMethod(${node.callee.source()}).apply(${node.callee.object ? node.callee.object.source() : node.callee.source()}, [${node.arguments.map(x => x.source())}])`);
      }
    });

    // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! output")
    // console.log(output)
    const rewriteCmd = output;

    // Create db instance
    const db = new Db('test');

    // Create a generator method
    const generatorFunction = new GeneratorFunction(rewriteCmd);

    // Create the scriptString
    const scriptString = `
      co(function*() {
        console.log("===================== 0")
        ${rewriteCmd}
        console.log("===================== 1")
      }).catch(err => {
        console.log("===================== ERR")
        console.dir(err)
      });
    `;

    // Create a script object
    const script = new Script(scriptString, {});

    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! script")
    console.log(scriptString)

    // Create the context
    const context = vm.createContext(Object.assign({}, this.context, {
      db: db, __promisify: __promisify, __shellWrapperMethod: __shellWrapperMethod
    }));

    // Run a script in the global context of the shell
    script.runInContext(context);
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
