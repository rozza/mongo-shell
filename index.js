"use strict"

const co = require('co');
const GeneratorFunction  = Object.getPrototypeOf(function*(){}).constructor;
const vm = require('vm');
const repl = require('repl');
const Executor = require('./lib/executor');

var cmd = "db.documents.findOne()"
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
