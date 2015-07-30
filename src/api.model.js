
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
    this.fromObject(data);
  }

  /**
   * From plain object converter
   */
  ApiModel.prototype.fromObject = function(data) {

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
   * To plain object converter
   */
  ApiModel.prototype.toObject = function() {

    //Copy our properties onto a simple object
    var data = angular.extend({}, this);
    return data;
  };

  //Return
  return ApiModel;
});
