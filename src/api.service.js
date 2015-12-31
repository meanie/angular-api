
/**
 * Module definition and dependencies
 */
angular.module('Api.Service', [
  'Api.Endpoint.Service'
])

/**
 * Provider definition
 */
.provider('$api', function $apiProvider() {

  //Defaults
  this.defaults = {
    verbose: false,
    enforceDataFormat: false,
    baseUrl: '/',
    actions: {
      query: {
        method: 'GET',
        isArray: true,
        isModel: true
      },
      get: {
        method: 'GET',
        isModel: true
      },
      create: {
        method: 'POST'
      },
      update: {
        method: 'PUT'
      },
      delete: {
        method: 'DELETE'
      }
    },
    params: {
      id: '@id'
    },
    model: '',
    stripTrailingSlashes: true
  };

  //Registered endpoints
  this.endpoints = {};

  /**
   * Set verbose
   */
  this.setVerbose = function(verbose) {
    this.defaults.verbose = !!verbose;
    return this;
  };

  /**
   * Set base URL
   */
  this.setBaseUrl = function(url) {
    this.defaults.baseUrl = url;
    return this;
  };

  /**
   * Set data format enforcing
   */
  this.setEnforceDataFormat = function(enforce) {
    this.defaults.enforceDataFormat = !!enforce;
    return this;
  };

  /**
   * Set default actions
   */
  this.setDefaultActions = function(actions) {
    this.defaults.actions = actions || {};
    return this;
  };

  /**
   * Set default params
   */
  this.setDefaultParams = function(params) {
    this.defaults.params = params || {};
    return this;
  };

  /**
   * Set default model
   */
  this.setDefaultModel = function(model) {
    this.defaults.model = model || false;
    return this;
  };

  /**
   * Strip trailing slashes behaviour
   */
  this.stripTrailingSlashes = function(strip) {
    this.defaults.stripTrailingSlashes = !!strip;
    return this;
  };

  /**
   * Register endpoint
   */
  this.registerEndpoint = function(name, config) {
    if (name) {
      this.endpoints[name] = config || {};
    }
    return this;
  };

  /**
   * Service getter
   */
  this.$get = function($injector, $log, $apiEndpoint) {

    //Initialize API interface
    var Api = function(endpoint) {
      return this[endpoint];
    };

    //Append all endpoints
    angular.forEach(this.endpoints, function(config, name) {

      //Warn if overwriting
      if (Api[name]) {
        $log.warn('API endpoint', name, 'is being overwritten.');
      }

      //Extend endpoint config with defaults and initialize it
      config = angular.extend({}, this.defaults, config);
      if (config.verbose) {
        $log.info('API endpoint', name + ':', config);
      }

      //Initialize endpoint
      Api[name] = $apiEndpoint(name, config);
    }, this);

    //Return
    return Api;
  };
});
