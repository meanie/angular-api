
/**
 * Module definition and dependencies
 */
angular.module('Api.Service', [
  'Api.Endpoint.Service',
  'Api.Model'
])

/**
 * Provider definition
 */
.provider('Api', function ApiProvider() {

  //Default API wide base URL
  this.baseUrl = '/';

  //Registered endpoints
  this.endpoints = [];

  /**
   * Set base URL
   */
  this.setBaseUrl = function(url) {
    this.baseUrl = url;
    return this;
  };

  /**
   * Register endpoint
   */
  this.registerEndpoint = function(name, config) {
    if (name) {

      //Store endpoints in an array for now, because we can't use the logger service
      //at this stage to warn users of overwriting an endpoint. We could simply fall back
      //to console.warn, but that feels dirty.
      this.endpoints.push({
        name: name,
        config: config || {}
      });
    }
    return this;
  };

  /**
   * Service getter
   */
  this.$get = function(ApiEndpoint, Logger) {

    //Initialize API interface
    var Api = {};

    //Append all endpoints
    for (var i = 0; i < this.endpoints.length; i++) {
      var endpoint = this.endpoints[i];

      //Warn if overwriting
      if (Api[endpoint.name]) {
        Logger.warn('API endpoint', endpoint.name, 'is being overwritten.');
      }

      //Append base URL to config unless already given
      endpoint.config.baseUrl = endpoint.config.baseUrl || this.baseUrl;

      //Initialize endpoint
      Api[endpoint.name] = new ApiEndpoint(endpoint.name, endpoint.config);
    }

    //Return
    return Api;
  };
});
