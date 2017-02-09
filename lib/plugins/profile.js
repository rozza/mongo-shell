class ApiKey {
  constructor(apiKey) {
    this._apiKey = apiKey;
  }

  get() {
    return this._apiKey.get();
  }

  remove() {
    return this._apiKey.remove();
  }

  enable() {
    return this._apiKey.enable();
  }

  disable() {
    return this._apiKey.disable();
  }
}

class Keys {
  constructor(keys) {
    this._keys = keys;
  }

  list() {
    return this._keys.list();
  }

  create(object) {
    return this._keys.create(object);
  }

  apiKey(keyId) {
    return new ApiKey(this._keys.apiKey(keyId));
  }
}

class Profile {
  constructor(profile) {
    this._profile = profile;
  }

  get keys() {
    return new Keys(this._profile.keys());
  }
}

module.exports = Profile;
