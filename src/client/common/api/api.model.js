
/**
 * Module definition and dependencies
 */
angular.module('Api.Model', [])

/**
 * Model definition
 */
.factory('$apiModel', function $apiModel() {

  /**
   * Constructor
   */
  function ApiModel(data) {
    this.fromJSON(data);
  }

  /**
   * Init
   */
  ApiModel.prototype.init = function() {
    angular.forEach(this, function(value, key) {
      delete this[key];
    }, this);
  };

  /**
   * From JSON converter
   */
  ApiModel.prototype.fromJSON = function(data) {

    //Init
    this.init();

    //No data?
    if (!angular.isObject(data)) {
      return this;
    }

    //Load from JSON data
    angular.forEach(data, function(value, key) {
      this[key] = value;
    }, this);

    //Return self
    return this;
  };

  /**
   * To JSON converter
   */
  ApiModel.prototype.toJSON = function() {

    //Copy our properties onto a simple object
    var data = angular.extend({}, this);
    return data;
  };

  //Return
  return ApiModel;
});
