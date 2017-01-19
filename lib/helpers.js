"use strict"

const falafel = require('falafel');

/**
 * Attempts to detect if the function contains a callback
 * @method
 * @param {string} funcName The calling function name
 * @param {string} string The passed func.toString()
 * @return {boolean} returns true if we detected a callback
 */
function hasCallback(funcName, string) {
  if (string.indexOf('[native code]') != -1) {
    return false;
  }

  // No callback found
  let result = false;
  // Instrument the code
  let output = falafel(string, function (node) {
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
      if(node.parent && node.parent.type === 'Program'
        || node.parent && node.parent.parent && node.parent.parent.parent && node.parent.parent.parent.type === 'Program' ) {

        if (node.params.length > 0) {
          // Get the last param name
          let lastParamName = node.params[node.params.length - 1].name;
          // Check if the last param is called as a function
          if (string.indexOf(`${lastParamName}(`) != -1) {
            result = true;
          } else if (string.match(/callback|cb/) != null) {
            result = true;
          }
        }
      }
    }
  });

  // Return the result of the callbak study
  return result;
}

function __promisify(context, funcName, func) {
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
      const hasCallbackResult = hasCallback(funcName, `var a = ${func.toString()}`);

      // Do we have a callback
      if (hasCallbackResult) {
        return new Promise((resolve, reject) => {
          const callargs = args.slice(0);
          callargs.push((err, result) => {
            if(err) return reject(err);
            resolve(result);
          });

          // Call the method
          func.apply(context, callargs);
        });
      } else {
        // Call the method
        const result = func.apply(context, args.slice(0));
        // Check if it returned a promise then execute the promise
        if (Promise.resolve(result) == result) {
          return result;
        } else {
          return new Promise((resolve, reject) => {
            resolve(result);
          });
        }
      }
    }
  }
}

function __shellWrapperMethod(source, method) {
  return function() {
    let promisifiedMethod = __promisify(this, source, method);
    let promise = promisifiedMethod.apply(this, Array.prototype.slice.call(arguments, 0));
    return promise;
  }
}

// Promise based setTimeout
function sleep(timeout) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

function bytesToGBString(bytes, precision = 4) {
  return Number(bytes/1024/1024/1024).toFixed(precision);
}

function fixBSONTypeOutput(string, regexp) {
  var match = string.match(regexp);
  // console.log("================= fixBSONTypeOutput")
  // console.log(string)
  // console.log(match)
  if(!match) return string;
  string = string.replace(
    match[0],
    match[0].substr(1, match[0].length - 2).replace(/\\\"/g, "\"")
  );

  return fixBSONTypeOutput(string, regexp);
}

module.exports = {
  __promisify: __promisify,
  __shellWrapperMethod: __shellWrapperMethod,
  sleep: sleep,
  bytesToGBString: bytesToGBString,
  fixBSONTypeOutput: fixBSONTypeOutput,
}
