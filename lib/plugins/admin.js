const co = require('co');
const url = require('url');
const Profile = require('./profile');
const Applications = require('./applications');
const {
  BAASClient
} = require('baas');

class Admin {
  constructor(uri) {
    // Split up the uri
    // this._uri = uri;
    const u = url.parse(uri);
    const port = u.port ? `:${u.port}` :  ''
    // Create the admin level one
    this._uri = `${u.protocol}//${u.hostname}${port}/admin/v1`;
    // Dummy client to allow for navigation
    this._client = new BAASClient(this._uri, { authProvider: 'api/key' });
  }

  get profile() {
    return new Profile(this._client.admin().profile());
  }

  get apps() {
    return new Applications(this._client.admin().apps());
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
        result = yield self._client.admin().auth(param1, param2);
      } else if(param1) {
        self._client = new BAASClient(self._uri, { authProvider: 'api/key' });
        // Authenticate using the user api_key
        result = yield self._client.admin().auth(param1);
      }

      // Store the result locally
      self._authContext = result;

      // Return the value
      return Promise.resolve(result);
    });
  }
}

module.exports = Admin;
