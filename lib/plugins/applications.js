const Variables = require('./variables');

class Provider {
  constructor(provider) {
    this._provider = provider;
  }

  update(object) {
    return this._provider.update(object);
  }

  get() {
    return this._provider.get();
  }

  remove() {
    return this._provider.remove();
  }
}

class AuthProviders {
  constructor(authProviders) {
    this._authProviders = authProviders;
  }

  create(object) {
    return this._authProviders.create(object);
  }

  provider() {
    return new Provider(this._authProviders
      .provider.apply(this._authProviders, Array.prototype.slice.call(arguments, 0)));
  }

  list() {
    return this._authProviders.list();
  }
}

class ApiKeys {
  constructor(apiKeys) {
    this._apiKeys = apiKeys;
  }

  list() {
    return this._apiKeys.list();
  }

  create(object) {
    return this._apiKeys.create(object);
  }

  apiKey(name) {
    return new ApiKey(this._apiKeys.apiKey(name));
  }
}

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

class Services {
  constructor(services) {
    this._services = services;
  }

  list() {
    return this._services.list();
  }

  create(object) {
    return this._services.create(object);
  }

  service(name) {
    return new Service(this._services.service(name));
  }
}

class Service {
  constructor(service) {
    this._service = service;
  }

  get() {
    return this._service.get();
  }

  remove() {
    return this._service.remove();
  }

  setConfig(object) {
    return this._service.setConfig(object);
  }

  get rules() {
    return new Rules(this._service.rules());
  }

  get triggers() {
    return new Triggers(this._service.triggers());
  }
}

class Rules {
  constructor(rules) {
    this._rules = rules;
  }

  create(object) {
    return this._rules.create(object);
  }

  rule(name) {
    return new Rule(this._rules.rule(name));
  }
}

class Rule {
  constructor(rule) {
    this._rule = rule;
  }

  get() {
    return this._rule.get();
  }

  update(object) {
    return this._rule.update(object);
  }

  remove() {
    return this._rule.remove();
  }
}

class Triggers {
  constructor(triggers) {
    this._triggers = triggers;
  }

  create(object) {
    return this._triggers.create(object);
  }

  list() {
    return this._triggers.list();
  }

  trigger(name) {
    return new Trigger(this._triggers.trigger(name));
  }
}

class Trigger {
  constructor(trigger) {
    this._trigger = trigger;
  }

  get() {
    return this._trigger.get();
  }

  update(object) {
    return this._trigger.update(object);
  }

  remove() {
    return this._trigger.remove();
  }
}

class Application {
  constructor(application) {
    this._application = application;
  }

  get() {
    return this._application.get();
  }

  update(object) {
    return this._application.update(object);
  }

  remove() {
    return this._application.remove();
  }

  get authProviders() {
    return new AuthProviders(this._application.authProviders());
  }

  get variables() {
    return new Variables(this._application.variables());
  }

  get apiKeys() {
    return new ApiKeys(this._application.apiKeys());
  }

  get services() {
    return new Services(this._application.services());
  }
}

class Applications {
  constructor(applications) {
    this._applications = applications;
  }

  list() {
    return this._applications.list();
  }

  create(object) {
    return this._applications.create(object);
  }

  app(name) {
    return new Application(this._applications.app(name));
  }
}

module.exports = Applications;
