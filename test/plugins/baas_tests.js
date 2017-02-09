const co = require('co'),
  vm = require('vm'),
  MongoClient = require('mongodb').MongoClient,
  REPL = require('../../lib/repl'),
  EventEmitter = require('events').EventEmitter,
  Db = require('../../lib/db'),
  assert = require('assert');

// Get the plugins
const plugins = require('../../lib/plugins');

let client = null;

before((done) => {
  co(function*() {
    EventEmitter.defaultMaxListeners = 100000;
    // Connect to mongodb
    client = yield MongoClient.connect('mongodb://localhost:27017/test_runner');
    // Drop the database
    yield client.dropDatabase();
    // Finish setup
    done();
  }).catch((err) => {
    console.log(err.stack)
  });
});

after(function() {
  if(client) client.close();
});

function setupPlugins(plugins, context) {
  return co(function*() {
    // Attempt to instantiate all the plugins
    const pluginInstances = [];
    // Go over all the plugins
    for (var name in plugins) {
      pluginInstances.push(new plugins[name](client))
    }

    // Let plugin's decorate the context
    for (let i = 0; i < pluginInstances.length; i++) {
      yield pluginInstances[i].decorateContext(context);
    }

    return pluginInstances;
  });
}

function execEval(_repl, cmds, context) {
  return new Promise((resolve, reject) => {
    // Execute command
    _repl.eval(cmds.join('\n'), context, '', function(err, result) {
      if(err) return reject(err);
      resolve(result);
    });
  });
}

function listKeys(_repl, context) {
  return co(function*() {
    // Get the current keys
    const cmds = [
      'baas.connect("http://localhost:7080/v1/app/test_app")',
      'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
      'baas.admin.profile.keys.list()'
    ];

    return yield execEval(_repl, cmds, context);
  });
}

describe('BAAS Helper tests', () => {
  describe('Admin helpers', () => {
    it('should correctly connect to baas instance', (done) => {
      co(function*() {
        // Init context
        const initContext = Object.assign({}, global, {});
        // Create a context for execution
        var context = Object.assign(vm.createContext(initContext), {
          db: Db.proxy(client.s.databaseName, client),
          require: require,
        });

        // Get all the plugin instances
        const pluginInstances = yield setupPlugins(plugins, context);

        // Create a repl instance
        const _repl = new REPL(client, context, {
          plugins: pluginInstances, prompt: '',
        }).start();
        // Execute command
        _repl.eval('baas.connect("http://localhost:7080/v1/app/test_app")', context, '', function(err, result) {
          assert.equal(null, err);
          done();
        });
      }).catch(function(err) {
        console.log(err);
      });
    });

    // it('should correctly connect to baas instance and auth', (done) => {
    //   co(function*() {
    //     // Init context
    //     const initContext = Object.assign({}, global, {});
    //     // Create a context for execution
    //     var context = Object.assign(vm.createContext(initContext), {
    //       db: Db.proxy(client.s.databaseName, client),
    //       require: require,
    //     });
    //
    //     // Get all the plugin instances
    //     const pluginInstances = yield setupPlugins(plugins, context);
    //
    //     // Create a repl instance
    //     const _repl = new REPL(client, context, {
    //       plugins: pluginInstances, prompt: '',
    //     }).start();
    //     const cmds = [
    //       'baas.connect("http://localhost:7080/v1/app/test_app")',
    //       'baas.auth("unique_user@domain.com", "password")'
    //     ];
    //
    //     const result = yield execEval(_repl, cmds, context);
    //     assert.ok(result.accessToken);
    //     assert.ok(result.refreshToken);
    //     done();
    //   }).catch(function(err) {
    //     console.log(err);
    //   });
    // });
  });

  describe('Admin Profile helpers', () => {
    it('should correctly connect to baas instance, auth and list profile keys', (done) => {
      co(function*() {
        // Init context
        const initContext = Object.assign({}, global, {});
        // Create a context for execution
        var context = Object.assign(vm.createContext(initContext), {
          db: Db.proxy(client.s.databaseName, client),
          require: require,
        });

        // Get all the plugin instances
        const pluginInstances = yield setupPlugins(plugins, context);

        // Create a repl instance
        const _repl = new REPL(client, context, {
          plugins: pluginInstances, prompt: '',
        }).start();
        const cmds = [
          'baas.connect("http://localhost:7080/v1/app/test_app")',
          'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
          'baas.admin.profile.keys.list()'
        ];

        const result = yield execEval(_repl, cmds, context);
        assert.ok(result.length > 0)
        done();
      });
    });

    it('should create a new api key', (done) => {
      co(function*() {
        // Init context
        const initContext = Object.assign({}, global, {});
        // Create a context for execution
        var context = Object.assign(vm.createContext(initContext), {
          db: Db.proxy(client.s.databaseName, client),
          require: require,
        });

        // Get all the plugin instances
        const pluginInstances = yield setupPlugins(plugins, context);

        // Create a repl instance
        const _repl = new REPL(client, context, {
          plugins: pluginInstances, prompt: '',
        }).start();

        // Get all keys
        const keys = yield listKeys(_repl, context);

        cmds = [
          'baas.connect("http://localhost:7080/v1/app/test_app")',
          'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
          'baas.admin.profile.keys.create()',
          'baas.admin.profile.keys.list()',
        ];

        // Excute operations
        const result = yield execEval(_repl, cmds, context);
        assert.equal(keys.length + 1, result.length);
        done();
      });
    });

    it('should create a new api key, get it, enable, disable and then delete', (done) => {
      co(function*() {
        // Init context
        const initContext = Object.assign({}, global, {});
        // Create a context for execution
        var context = Object.assign(vm.createContext(initContext), {
          db: Db.proxy(client.s.databaseName, client),
          require: require,
        });

        // Get all the plugin instances
        const pluginInstances = yield setupPlugins(plugins, context);

        // Create a repl instance
        const _repl = new REPL(client, context, {
          plugins: pluginInstances, prompt: '',
        }).start();

        // Get all keys
        const keys = yield listKeys(_repl, context);

        cmds = [
          'baas.connect("http://localhost:7080/v1/app/test_app")',
          'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
          'a = baas.admin.profile.keys.create()',
          'a = baas.admin.profile.keys.apiKey(a._id).get()'
        ];

        // Excute operations
        let result = yield execEval(_repl, cmds, context);
        assert.ok(result._id);
        assert.ok(result.key);
        assert.ok(result.name);
        assert.ok(!result.disabled);

        // Disable the key
        cmds = [
          'baas.connect("http://localhost:7080/v1/app/test_app")',
          'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
          `baas.admin.profile.keys.apiKey('${result._id}').disable()`,
          `baas.admin.profile.keys.apiKey('${result._id}').get()`
        ];
        result = yield execEval(_repl, cmds, context);
        assert.ok(result.disabled);

        // Enable the key
        cmds = [
          'baas.connect("http://localhost:7080/v1/app/test_app")',
          'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
          `baas.admin.profile.keys.apiKey('${result._id}').enable()`,
          `baas.admin.profile.keys.apiKey('${result._id}').get()`
        ];
        result = yield execEval(_repl, cmds, context);
        assert.ok(!result.disabled);

        // Remove the key
        cmds = [
          'baas.connect("http://localhost:7080/v1/app/test_app")',
          'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
          `baas.admin.profile.keys.apiKey('${result._id}').remove()`,
          `baas.admin.profile.keys.apiKey('${result._id}').get()`
        ];

        try {
          result = yield execEval(_repl, cmds, context);
        } catch(err) {
          assert.ok(err.indexOf('key not found') != -1);
        }

        done();
      }).catch(err => {
        console.log(err);
        throw err;
      })
    });

    describe('Admin App helpers', () => {
      it('should correctly connect to baas instance, auth and list apps', (done) => {
        co(function*() {
          // Init context
          const initContext = Object.assign({}, global, {});
          // Create a context for execution
          var context = Object.assign(vm.createContext(initContext), {
            db: Db.proxy(client.s.databaseName, client),
            require: require,
          });

          // Get all the plugin instances
          const pluginInstances = yield setupPlugins(plugins, context);

          // Create a repl instance
          const _repl = new REPL(client, context, {
            plugins: pluginInstances, prompt: ''
          }).start();
          const cmds = [
            'baas.connect("http://localhost:7080/v1/app/test_app")',
            'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
            'baas.admin.apps.list()'
          ];

          const result = yield execEval(_repl, cmds, context);
          assert.ok(result.length >= 0);
          done();
        });
      });

      it('should correctly connect to baas instance, auth create, list, get, update, and remove app', (done) => {
        co(function*() {
          // Init context
          const initContext = Object.assign({}, global, {});
          // Create a context for execution
          var context = Object.assign(vm.createContext(initContext), {
            db: Db.proxy(client.s.databaseName, client),
            require: require,
          });

          // Get all the plugin instances
          const pluginInstances = yield setupPlugins(plugins, context);

          // Application name
          const appName = `testapp${new Date().getTime()}`;

          // Create a repl instance
          const _repl = new REPL(client, context, {
            plugins: pluginInstances, prompt: ''
          }).start();

          // Create a new application
          let cmds = [
            'baas.connect("http://localhost:7080/v1/app/test_app")',
            'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
            `baas.admin.apps.create({name: '${appName}'})`
          ];

          let result = yield execEval(_repl, cmds, context);
          assert.equal(appName, result.name);
          assert.ok(result.domainId);
          assert.ok(result.ownerId);

          // List the application
          cmds = [
            'baas.connect("http://localhost:7080/v1/app/test_app")',
            'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
            `baas.admin.apps.list()`
          ];

          result = yield execEval(_repl, cmds, context);
          assert.ok(result.length > 0);
          assert.equal(appName, result[result.length - 1].name);

          // Get the application
          cmds = [
            'baas.connect("http://localhost:7080/v1/app/test_app")',
            'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
            `baas.admin.apps.app('${appName}').get()`
          ];

          result = yield execEval(_repl, cmds, context);
          assert.equal(appName, result.name);

          // Application config
          const appConfig = {
          	"name": "notetaker",
          	"services": {
          		"mdb2": {
          			"type": "mongodb",
          			"config": {
          				"uri": "mongodb://localhost:27017"
          			},
          			"rules": {
          				"5873a33f772e2e08ce645b9a": {
          					"_id": {"$oid": "5873a33f772e2e08ce645b9a"},
          					"namespace": "data.notes",
          					"read": { "$$true": true },
          					"write": { "$$true": true },
          					"fields": {
          						"_id": {},
          						"text": {}
          					}
          				}
          			}
          		}
          	},
          	"authProviders": {
          		"local/userpass": {
          		},
            }
          }

          // Update the application
          cmds = [
            'baas.connect("http://localhost:7080/v1/app/test_app")',
            'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
            `baas.admin.apps.app('${appName}').update(${JSON.stringify(appConfig)})`,
            `baas.admin.apps.app('${appName}').get()`
          ];

          result = yield execEval(_repl, cmds, context);
          assert.equal(appName, result.name);
          assert.ok(result.authProviders);
          assert.ok(result.services);
          assert.ok(result.domainId);
          assert.ok(result.ownerId);

          // Test auth providers
          cmds = [
            'baas.connect("http://localhost:7080/v1/app/test_app")',
            'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
            `baas.admin.apps.app('${appName}').authProviders.list()`,
            `baas.admin.apps.app('${appName}').authProviders.create({authType: 'oauth2', authName: 'google'})`,
            `baas.admin.apps.app('${appName}').authProviders.provider('oauth2', 'google').update({"clientId": "APP-SECRET2","clientSecret": "APP-ID2"})`,
            `baas.admin.apps.app('${appName}').authProviders.provider('oauth2', 'google').get()`,
            `baas.admin.apps.app('${appName}').authProviders.provider('oauth2', 'google').remove()`,
            `baas.admin.apps.app('${appName}').authProviders.provider('oauth2', 'google').get()`,
          ];

          try {
            result = yield execEval(_repl, cmds, context);
          } catch(err) {
            assert.ok(err.indexOf('No such auth provider') != -1);
          }

          // Test variables
          cmds = [
            'baas.connect("http://localhost:7080/v1/app/test_app")',
            'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
            `baas.admin.apps.app('${appName}').variables.variable('mytest').create({ source: "value", type: "literal"})`,
            `baas.admin.apps.app('${appName}').variables.variable('mytest').create({ source: "value", type: "literal"})`,
            `baas.admin.apps.app('${appName}').variables.variable('mytest').get()`,
            `baas.admin.apps.app('${appName}').variables.variable('mytest').update({ source: "value2", type: "literal"})`,
            `baas.admin.apps.app('${appName}').variables.variable('mytest').remove()`,
            `baas.admin.apps.app('${appName}').variables.variable('mytest').get()`,
          ];

          try {
            result = yield execEval(_repl, cmds, context);
          } catch(err) {
            assert.ok(err.indexOf("Variable not found: 'mytest'") != -1);
          }

          // Test api keys
          cmds = [
            'baas.connect("http://localhost:7080/v1/app/test_app")',
            'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
            `baas.admin.apps.app('${appName}').apiKeys.list()`,
            `a = baas.admin.apps.app('${appName}').apiKeys.create({ name: 'appkey' })`,
            `baas.admin.apps.app('${appName}').apiKeys.apiKey(a._id).get()`,
            `baas.admin.apps.app('${appName}').apiKeys.apiKey(a._id).disable()`,
            `baas.admin.apps.app('${appName}').apiKeys.apiKey(a._id).enable()`,
            `baas.admin.apps.app('${appName}').apiKeys.apiKey(a._id).remove()`,
            `baas.admin.apps.app('${appName}').apiKeys.apiKey(a._id).get()`,
          ];

          try {
            result = yield execEval(_repl, cmds, context);
          } catch(err) {
            assert.ok(err.indexOf("key not found") != -1);
          }

          // Test services
          cmds = [
            'baas.connect("http://localhost:7080/v1/app/test_app")',
            'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
            `baas.admin.apps.app('${appName}').services.list()`,
            `baas.admin.apps.app('${appName}').services.create({ name: 'mdb1', type: 'mongodb' })`,
            `baas.admin.apps.app('${appName}').services.service('mdb1').get()`,
            `baas.admin.apps.app('${appName}').services.service('mdb1').setConfig({ uri: 'mongodb://localhost:27017/test' })`,
            `a = baas.admin.apps.app('${appName}').services.service('mdb1').rules.create()`,
            `baas.admin.apps.app('${appName}').services.service('mdb1').rules.rule(a._id).get()`,
            `baas.admin.apps.app('${appName}').services.service('mdb1').rules.rule(a._id).update({_id: a._id, "namespace" : "test.documents", "fields" : { "owner_id" : {} }, "otherFields" : {}})`,
            `baas.admin.apps.app('${appName}').services.service('mdb1').rules.rule(a._id).remove()`,
            `baas.admin.apps.app('${appName}').services.service('mdb1').remove()`,
            `baas.admin.apps.app('${appName}').services.service('mdb1').rules.rule(a._id).get()`,
          ];

          try {
            result = yield execEval(_repl, cmds, context);
          } catch(err) {
            assert.ok(err.indexOf("Service not found") != -1);
          }

          // Test Triggers
          cmds = [
            'baas.connect("http://localhost:7080/v1/app/test_app")',
            'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
            `baas.admin.apps.app('${appName}').services.create({ name: 'slack1', type: 'slack' })`,
            `baas.admin.apps.app('${appName}').services.service('slack1').triggers.list()`,
            `a = baas.admin.apps.app('${appName}').services.service('slack1').triggers.create({})`,
            `baas.admin.apps.app('${appName}').services.service('slack1').triggers.trigger(a._id).get()`,
            `baas.admin.apps.app('${appName}').services.service('slack1').triggers.trigger(a._id).update({_id: a._id, options: { token: 'myToken' }, output: 'array', "pipeline" : [{"service" : "", "action" : "literal",}]})`,
            `baas.admin.apps.app('${appName}').services.service('slack1').triggers.trigger(a._id).remove()`,
            `baas.admin.apps.app('${appName}').services.service('slack1').triggers.trigger(a._id).get()`,
          ];

          try {
            result = yield execEval(_repl, cmds, context);
          } catch(err) {
            assert.ok(err.indexOf("Cannot find trigger") != -1);
          }

          // Remove the application
          cmds = [
            'baas.connect("http://localhost:7080/v1/app/test_app")',
            'baas.admin.auth("77HoaQ4St3VRo1hvmTbbbLM3tn4GRsbUbF18fuPq8TIcIQGc98Q8kXznYTZ2UB12")',
            `baas.admin.apps.app('${appName}').remove()`,
            `baas.admin.apps.app('${appName}').get()`
          ];

          try {
            result = yield execEval(_repl, cmds, context);
          } catch(err) {
            assert.ok(err.indexOf('App not found') != -1);
          }

          done();
        });
      });
    });
  });
});
