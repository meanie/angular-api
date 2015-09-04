
/**
 * Module definition and dependencies
 */
angular.module('Api.DuplicateRequestsFilter.Decorator', [])

/**
 * Config
 */
.config(function($provide) {

  /**
   * Decorator for the $http service
   */
  $provide.decorator('$http', function($delegate, $q) {

    /**
     * Pending requests and local $http var for natural reference
     */
    var pendingRequests = {};
    var $http = $delegate;

    /**
     * Hash generator
     */
    function hash(str) {
      var h = 0;
      var strlen = str.length;
      if (strlen === 0) {
        return h;
      }
      for (var i = 0, n; i < strlen; ++i) {
        n = str.charCodeAt(i);
        h = ((h << 5) - h) + n;
        h = h & h;
      }
      return h >>> 0;
    }

    /**
     * Helper to generate a unique identifier for a request
     */
    function getRequestIdentifier(config) {
      var str = config.method + config.url;
      if (config.data && typeof config.data === 'object') {
        str += angular.toJson(config.data);
      }
      return hash(str);
    }

    /**
     * Modified $http service
     */
    var $duplicateRequestsFilter = function(config) {

      //Ignore for this request?
      if (config.ignoreDuplicateRequest) {
        return $http(config);
      }

      //Get unique request identifier
      var identifier = getRequestIdentifier(config);

      //Check if such a request is pending already
      if (pendingRequests[identifier]) {
        if (config.rejectDuplicateRequest) {
          return $q.reject({
            data: '',
            headers: {},
            status: config.rejectDuplicateStatusCode || 400,
            config: config
          });
        }
        return pendingRequests[identifier];
      }

      //Create promise using $http and make sure it's reset when resolved
      pendingRequests[identifier] = $http(config).finally(function() {
        delete pendingRequests[identifier];
      });

      //Return promise
      return pendingRequests[identifier];
    };

    //Map rest of methods
    Object.keys($http).filter(function(key) {
      return (typeof $http[key] === 'function');
    }).forEach(function(key) {
      $duplicateRequestsFilter[key] = $http[key];
    });

    //Return it
    return $duplicateRequestsFilter;
  });
});
