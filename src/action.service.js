
/**
 * Module definition and dependencies
 */
angular.module('Api.Action.Service', [
  'Url.Service',
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
      if (model !== '$baseModel') {
        $log.warn('Unknown model class/service:', model);
      }
      return null;
    }

    //Return model
    return model;
  }

  /**
   * Constructor
   */
  function ApiAction(action, endpoint) {

    //Set vars
    angular.extend(this, action);

    //Set full action url, model and method
    this.url = $url.concat(endpoint.url, this.url || '');
    this.model = this.model || endpoint.model || false;
    this.method = this.method || 'GET';
    this.enforceDataFormat = endpoint.enforceDataFormat || false;

    //Append config
    if (endpoint.config) {
      for (let key in endpoint.config) {
        if (endpoint.config.hasOwnProperty(key)) {
          this[key] = endpoint.config[key];
        }
      }
    }

    //Determine params
    if (typeof this.params === 'undefined') {
      this.params = endpoint.params;
    }

    //Normalize
    this.params = this.params || {};

    //Validate model
    this.model = validatedModel(this.model);
  }

  /**
   * Has body check
   */
  ApiAction.prototype.hasBody = function() {
    return /^(POST|PUT|PATCH)$/i.test(this.method);
  };

  /**
   * Expects array check
   */
  ApiAction.prototype.expectsArray = function() {
    return Boolean(this.isArray);
  };

  /**
   * Expects model check
   */
  ApiAction.prototype.expectsModel = function() {
    return (this.model && Boolean(this.isModel));
  };

  /**
   * Convert raw response data to a model
   */
  ApiAction.prototype.convertToModel = function(data) {

    //Array given?
    if (angular.isArray(data)) {
      return data.map(data => this.convertToModel(data));
    }

    //Get model class and return model instance
    let Model = $injector.get(this.model);
    return new Model(data);
  };

  /**
   * Default success response interceptor
   */
  ApiAction.prototype.successInterceptor = function(response) {

    //Check if we expect an array
    let expectsArray = this.expectsArray();
    let isArray = angular.isArray(response.data);

    //Validate data type
    if (isArray !== expectsArray) {

      //Issue warning
      $log.warn(
        'Expected', expectsArray ? 'array' : 'object',
        'as response, got', isArray ? 'array' : (typeof response.data)
      );

      //Enforce data format?
      if (this.enforceDataFormat) {
        response.data = (expectsArray ? [] : {});
      }
    }

    //Initialize if empty
    return response.data || (expectsArray ? [] : {});
  };

  /**
   * Default error response interceptor
   */
  ApiAction.prototype.errorInterceptor = function(response) {
    return $q.reject(response);
  };

  //Return factory function
  return function(action, endpoint) {
    return new ApiAction(action, endpoint);
  };
});
