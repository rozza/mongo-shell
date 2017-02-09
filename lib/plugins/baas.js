const {
  BAASClient
} = require('baas');
const Admin = require('./admin');
const co = require('co');
const Profile = require('./profile');
const Applications = require('./applications');

class Plugin {
  constructor(client) {
    this.baas = new BAAS();
  }

  namespace() {
    return 'baas';
  }

  decorateContext(context) {
    return Promise.resolve(Object.assign(context, {
      baas: this.baas
    }));
  }
}

class BAAS {
  constructor() {
    this._client = new BAASClient('', { authProvider: 'api/key' });
    this._uri = null;
  }

  connect(uri) {
    this._uri = uri;
    this._admin = new Admin(uri);
    return Promise.resolve();
  }

  get admin() {
    return new Admin(this._uri);
  }

  /*
   * Authenticate accepts user/password or api_key
   */
  auth(param1, param2, options = {}) {
    const self = this;

    return co(function*() {
      let result = null;

      if (param1 && param2) {
        self._client = new BAASClient(self._uri, Object.assign({ authProvider: 'local/userpass' }, options));
        // Authenticate using the user username/password
        result = yield self._client.auth(param1, param2);
      } else if(param1) {
        self._client = new BAASClient(self._uri, { authProvider: 'api/key' });
        // Authenticate using the user api_key
        result = yield self._client.auth(param1);
      }

      // Store the result locally
      self._authContext = result;

      // Return the value
      return Promise.resolve(result);
    });
  }
}

module.exports = Plugin;
