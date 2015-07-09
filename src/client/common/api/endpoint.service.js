
/**
 * Module definition and dependencies
 */
angular.module('Api.Endpoint.Service', [
  'Api.Route.Service',
  'Utility.Url.Service'
])

/**
 * Provider definition
 */
.provider('ApiEndpoint', function ApiEndpointProvider() {

  //Default actions
  var defaultActions = {
    query: {
      method: 'GET',
      isArray: true
    },
    get: {
      method: 'GET'
    },
    create: {
      method: 'POST'
    },
    update: {
      method: 'PUT'
    },
    destroy: {
      method: 'DELETE'
    }
  };

  //Default params
  var defaultParams = {
    id: '@id'
  };

  /**
   * Set default actions
   */
  this.setDefaultActions = function(actions) {
    defaultActions = actions || {};
    return this;
  };

  /**
   * Set default params
   */
  this.setDefaultParams = function(params) {
    defaultParams = params;
    return this;
  };

  /**
   * Service getter
   */
  this.$get = function(Url, ApiRoute, Logger) {

    /**
     * Parse params
     */
    function parseParams(params, endpoint) {

      //Extend from default params
      params = params || {};
      if (!angular.isDefined(endpoint.useDefaultParams) || endpoint.useDefaultParams === true) {
        params = angular.extend({}, defaultParams, params);
      }

      //Return
      return params;
    }

    /**
     * Parse actions
     */
    function parseActions(actions, endpoint) {

      //Extend from default actions
      actions = actions || {};
      if (!angular.isDefined(endpoint.useDefaultActions) || endpoint.useDefaultActions === true) {
        actions = angular.extend({}, defaultActions, actions);
      }

      //Parse each one
      angular.forEach(actions, function(action, key) {
        action = action || {};

        //Set url, model and method
        action.url = Url.concat(endpoint.url, action.url);
        action.model = action.model || endpoint.model || false;
        action.method = (action.method || 'GET').toUpperCase();

        //Set parsed action
        actions[key] = action;
      });

      //Return
      return actions;
    }

    /**
     * Config parser
     */
    function parseConfig(name, config) {

      //Initialize config
      config = angular.copy(config || {});

      //Set route and URL to use for this endpoint.
      //Set full URL if given or create from components.
      config.route = config.route || Url.concat(name, ':id');
      config.url = config.url || Url.concat(config.baseUrl, config.route);

      //Parse params and actions
      config.params = parseParams(config.params, config);
      config.actions = parseActions(config.actions, config);

      //Return parsed config
      return config;
    }

    /*****************************************************************************
     * Api endpoint class
     ***/

    /**
     * Constructor
     */
    function ApiEndpoint(name, config) {

      //Must have name
      if (!name) {
        throw new Error('Must specify name for new Api endpoint');
      }

      //Parse config and initialize routes container
      this.$config = config = parseConfig(name, config);
      this.$routes = {};

      //Instantiate routes and create dynamic action methods
      Logger.debug('Setting up', name, 'endpoint');
      angular.forEach(config.actions, function(action, key) {
        Logger.debug('  Action', key, action);
        this.$routes[key] = new ApiRoute(action, this);
        this[key] = angular.bind(this.$routes[key], this.$routes[key].request);
      }, this);
    }

    //Return
    return ApiEndpoint;
  };
});
