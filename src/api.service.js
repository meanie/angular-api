
/**
 * Module definition and dependencies
 */
angular.module('Api.Service', [
  'Api.Endpoint.Service',
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
        isModel: true,
      },
      get: {
        method: 'GET',
        isModel: true,
      },
      create: {
        method: 'POST',
      },
      update: {
        method: 'PUT',
      },
      delete: {
        method: 'DELETE',
      },
    },
    params: {
      id: '@id',
    },
    model: '',
    config: {},
    stripTrailingSlashes: true,
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
    //TODO: the replacement is protecting port numbers from later becoming
    //removed on account of the request service url parsing thinking it's a
    //parameter. The code there should be updated to prevent port replacement,
    //rather than "protecting" it in this manner here.
    this.defaults.baseUrl = url.replace(/:([0-9]+)/, '\\:$1');
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
   * Set a generic config parameter (use only for config params that you
   * want to pass on to the $http service)
   */
  this.setConfig = function(param, value) {
    this.defaults.config[param] = value;
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
  this.$get = function($log, $apiEndpoint) {

    //Initialize API interface
    let Api = function(endpoint) {
      return this[endpoint];
    };

    //Append all endpoints
    angular.forEach(this.endpoints, (config, name) => {

      //Warn if overwriting
      if (Api[name]) {
        $log.warn('API endpoint', name, 'is being overwritten.');
      }

      //Extend endpoint config with defaults
      config = angular.extend({}, this.defaults, config);
      if (config.verbose) {
        $log.info('API endpoint', name + ':', config);
      }

      //Initialize endpoint
      Api[name] = $apiEndpoint(name, config);
    });

    //Return
    return Api;
  };
});
