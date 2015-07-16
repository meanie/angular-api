
/**
 * Module definition and dependencies
 */
angular.module('Api.Endpoint.Service', [
  'Api.Action.Service',
  'Api.Request.Service',
  'Url.Service'
])

/**
 * Factory definition
 */
.factory('$apiEndpoint', function $apiEndpoint($url, $apiAction, $apiRequest) {

  /**
   * Constructor
   */
  function ApiEndpoint(name, config) {

    //Determine full URL of endpoint
    config.url = $url.concat(config.baseUrl, config.url || $url.concat(name, ':id'));
    config.actions = config.actions || {};

    //Expose config and actions container
    this.$config = config;
    this.$actions = {};

    //Create action instances and bind request method to action key on endpoint
    angular.forEach(config.actions, function(action, key) {
      this.$actions[key] = $apiAction(action || {}, config);
      this[key] = angular.bind(this, $apiRequest, this.$actions[key]);
    }, this);
  }

  //Return factory function
  return function(name, config) {
    return new ApiEndpoint(name, config);
  };
});
