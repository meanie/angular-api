
/**
 * Module definition and dependencies
 */
angular.module('BaseModel.Service', [])

/**
 * Model definition
 */
.factory('$baseModel', function($window, $injector) {

  //See if we have the moment service available to us
  var moment;
  if ($injector.has('moment')) {
    moment = $injector.get('moment');
  }
  else if (typeof $window.moment !== 'undefined') {
    moment = $window.moment;
  }

  /**
   * Check if given string is a ISO 8601 date string,
   * Returns a moment if it is and null if it's not
   */
  function dateStringToMoment(value) {
    var regex = /(\d{4})-(\d{2})-(\d{2})T(\d{2})\:(\d{2})\:(\d{2}).*/;
    if (value.match(regex)) {
      var date = moment(value, moment.ISO_8601, true);
      if (date.isValid()) {
        return date;
      }
    }
    return null;
  }

  /**
   * Constructor
   */
  function $baseModel(data) {
    this.fromJSON(data);
  }

  /*****************************************************************************
   * Instance methods
   ***/

  /**
   * From JSON converter
   */
  $baseModel.prototype.fromJSON = function(json) {
    if (angular.isObject(json)) {
      angular.forEach(json, function(value, key) {
        this[key] = $baseModel.valueFromJSON(value);
      }, this);
    }
    return this;
  };

  /**
   * To JSON converter
   */
  $baseModel.prototype.toJSON = function(data) {
    var json = {};
    if (data && angular.isObject(data)) {
      angular.forEach(data, function(value, key) {
        json[key] = $baseModel.valueToJSON(value);
      });
    }
    angular.forEach(this, function(value, key) {
      if (!json.hasOwnProperty(key)) {
        json[key] = $baseModel.valueToJSON(value);
      }
    });
    return json;
  };

  /**
   * Extract a subset of data from the model
   */
  $baseModel.prototype.extract = function(properties) {
    var obj = {};
    var subset = (angular.isArray(properties) && properties.length);
    angular.forEach(this, function(value, key) {
      if (!subset || properties.indexOf(key) >= 0) {
        obj[key] = angular.copy(value);
      }
    });
    return obj;
  };

  /**
   * Clear own properties
   */
  $baseModel.prototype.clear = function() {
    for (var key in this) {
      if (this.hasOwnProperty(key)) {
        delete this[key];
      }
    }
  };

  /**
   * Clone
   */
  $baseModel.prototype.clone = function() {
    var ModelClass = this.constructor;
    return new ModelClass(this.extract());
  };

  /*****************************************************************************
   * Static methods
   ***/

  /**
   * Helper to convert a value from JSON
   */
  $baseModel.valueFromJSON = function(value) {
    if (angular.isArray(value)) {
      return value.map($baseModel.valueFromJSON);
    }
    else if (moment && angular.isString(value)) {
      var date = dateStringToMoment(value);
      return date || value;
    }
    return angular.copy(value);
  };

  /**
  * Helper to convert a value to JSON
  */
  $baseModel.valueToJSON = function(value) {
    if (angular.isArray(value)) {
      return value.map($baseModel.valueToJSON);
    }
    else if (value && angular.isObject(value)) {
      if (angular.isFunction(value.toJSON)) {
        return value.toJSON();
      }
      var copy = {};
      for (var prop in value) {
        if (value.hasOwnProperty(prop)) {
          copy[prop] = $baseModel.valueToJSON(value[prop]);
        }
      }
      return copy;
    }
    return value;
  };

  /**
   * Strip object to only ID
   */
  $baseModel.onlyId = function(obj) {
    if (angular.isArray(obj)) {
      return obj.map($baseModel.onlyId);
    }
    if (!obj || typeof obj !== 'object' || !obj.id) {
      return obj;
    }
    return obj.id;
  };

  //Return
  return $baseModel;
});
