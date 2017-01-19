"use strict"

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
