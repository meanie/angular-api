
/**
 * Module definition and dependencies
 */
angular.module('Api.Action.Service', [
  'Utility.Url.Service'
])

/**
 * Factory definition
 */
.factory('$apiAction', function $apiAction($q, $injector, $log, $url) {

  /**
   * Return validated model class
   */
  function validatedModel(model) {

    //No model?
    if (!model) {
      return null;
    }

    //Validate
    if (!$injector.has(model)) {
      $log.warn('Unknown model class/service:', model);
      return null;
    }

    //Return model
    return model;
  }

  /**
   * Constructor
   */
  function $apiAction(action, endpoint) {

    //Set vars
    angular.extend(this, action);

    //Set full action url, model and method
    this.url = $url.concat(endpoint.url, this.url || '');
    this.model = this.model || endpoint.model || false;
    this.method = this.method || 'GET';

    //Validate model
    this.model = validatedModel(this.model);
  }

  /**
   * Has body check
   */
  $apiAction.prototype.hasBody = function() {
    return /^(POST|PUT|PATCH)$/i.test(this.method)
  };

  /**
   * Expects array check
   */
  $apiAction.prototype.expectsArray = function() {
    return !!this.isArray;
  };

  /**
   * Convert raw response data to a model
   */
  $apiAction.prototype.convertToModel = function(data) {

    //Array given?
    if (angular.isArray(data)) {
      return data.map(function(element) {
        return this.convertToModel(element);
      }, this);
    }

    //Instantiate new model
    var Model = $injector.get(this.model);
    return new Model(data);
  };

  /**
   * Default success response interceptor
   */
  $apiAction.prototype.successInterceptor = function(response) {

    //Check if we expect an array
    var expectsArray = this.expectsArray();

    //Validate data type
    if (angular.isArray(response.data) !== expectsArray) {
      $log.warn(
        'Expected', expectsArray ? 'array' : 'object',
        'as response, got', response.data
      );
    }

    //Initialize if empty
    return response.data || (expectsArray ? [] : {});
  };

  /**
   * Default error response interceptor
   */
  $apiAction.prototype.errorInterceptor = function(response) {
    return $q.reject(response);
  };

  //Return
  return $apiAction;
});
