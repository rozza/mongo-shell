"use strict"

const falafel = require('falafel');
const co = require('co');

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

function __promisify(detectCallbacks, context, funcName, func) {
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
      const hasCallbackResult = detectCallbacks
        ? hasCallback(funcName, `var a = ${func.toString()}`)
        : false;

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

function __shellWrapperMethod(detectCallbacks, source, method) {
  return function() {
    let promisifiedMethod = __promisify(detectCallbacks, this, source, method);
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
  if(!match) return string;
  string = string.replace(
    match[0],
    match[0].substr(1, match[0].length - 2).replace(/\\\"/g, "\"")
  );

  return fixBSONTypeOutput(string, regexp);
}

function wrapper(func) {
  return new Promise((resolve, reject) => {
    co(function*() {
      return yield func(resolve, reject);
    }).catch(reject);
  });
}

function _getErrorWithCode(codeOrObj, message) {
  var e = new Error(message);
  if (codeOrObj != undefined) {
    if (codeOrObj.writeError) {
      e.code = codeOrObj.writeError.code;
    } else if (codeOrObj.code) {
      e.code = codeOrObj.code;
    } else {
      // At this point assume codeOrObj is a number type
      e.code = codeOrObj;
    }
  }

  return e;
}

function addHelp(func, help) {
  func.help = function() {
    return help;
  }
}

function _hashPassword(username, password) {
  if (typeof password != 'string') {
    throw Error(`User passwords must be of type string. Was given password with type: ${typeof(password)}`);
  }

  // Use node md5 generator
  var md5 = crypto.createHash('md5');
  md5.update(username + ":mongo:" + password);
  return md5.digest('hex');
}

function isStringAndNotEmpty(name, str, reject, message) {
  if(typeof str !== 'string') {
    return reject(new Error(message ? message : `${name} parameter must be a string longer than 1 character`))
  }

  return true;
}

function mustExist(name, value, reject, messsage) {
  if(value == null) {
    return reject(new Error(message ? message : `${name} parameter must be provided`))
  }

  return true;
}

module.exports = {
  __promisify: __promisify,
  __shellWrapperMethod: __shellWrapperMethod,
  sleep: sleep,
  bytesToGBString: bytesToGBString,
  fixBSONTypeOutput: fixBSONTypeOutput,
  wrapper: wrapper,
  _getErrorWithCode: _getErrorWithCode,
  addHelp: addHelp,
  _hashPassword: _hashPassword,
  isStringAndNotEmpty: isStringAndNotEmpty,
  mustExist: mustExist,
}
