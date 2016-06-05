
/**
 * Module definition and dependencies
 */
angular.module('BaseModel.Service', [])

/**
 * Model definition
 */
.factory('$baseModel', function($window, $log, $injector) {

  //See if we have the moment service available to us
  let moment;
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
    let regex = /(\d{4})-(\d{2})-(\d{2})T(\d{2})\:(\d{2})\:(\d{2}).*/;
    if (value.match(regex)) {
      let date = moment(value, moment.ISO_8601, true);
      if (date.isValid()) {
        return date;
      }
    }
    return null;
  }

  /**
   * Copy a property
   */
  function copyProperty(obj, key) {
    if (angular.isArray(obj[key])) {
      let arr = obj[key];
      return arr.map((value, key) => copyProperty(arr, key));
    }
    if (obj[key] && angular.isFunction(obj[key].clone)) {
      return obj[key].clone();
    }
    return angular.copy(obj[key]);
  }

  /**
   * Constructor
   */
  function $baseModel(data) {
    this.fromJSON(data);
  }

  /**************************************************************************
   * Helper methods
   ***/

  /**
   * Convert a property to a model
   */
  $baseModel.prototype.convertToModel = function(key, Model, isArray) {

    //Paremeter shuffling
    if (typeof Model === 'boolean') {
      isArray = Model;
      Model = null;
    }

    //If undefined, check what we were expecting
    if (typeof this[key] === 'undefined') {
      if (isArray) {
        this[key] = [];
      }
      else {
        this[key] = null;
      }
    }

    //If no model specified, we're done
    if (!Model) {
      return;
    }

    //String specified, use injector
    if (typeof Model === 'string') {
      if (!$injector.has(Model)) {
        return $log.warn(
          'Unknown model', Model, 'specified for sub model conversion'
        );
      }
      Model = $injector.get(Model);
    }

    //Get model class and initiate
    if (angular.isArray(this[key])) {
      this[key] = this[key].map(data => new Model(data));
    }
    else {
      this[key] = new Model(this[key]);
    }
  };

  /**
   * From JSON converter
   */
  $baseModel.prototype.fromJSON = function(json) {
    if (angular.isObject(json)) {
      angular.forEach(json, (value, key) => {
        this[key] = $baseModel.valueFromJSON(value);
      }, this);
    }
    return this;
  };

  /**
   * To JSON converter
   */
  $baseModel.prototype.toJSON = function(data) {
    let json = {};
    if (data && angular.isObject(data)) {
      angular.forEach(data, (value, key) => {
        json[key] = $baseModel.valueToJSON(value);
      });
    }
    angular.forEach(this, (value, key) => {
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

    //Initialize object
    let obj = {};

    //No properties given? Iterate all object properties
    if (!angular.isArray(properties) || !properties.length) {
      angular.forEach(this, (value, key) => {
        obj[key] = copyProperty(this, key);
      });
    }
    else {
      angular.forEach(properties, key => {
        obj[key] = copyProperty(this, key);
      });
    }

    //Return resulting object
    return obj;
  };

  /**
   * Merge a set of data into the model
   */
  $baseModel.prototype.merge = function(data) {
    if (data && angular.isObject(data)) {
      angular.forEach(data, (value, key) => {
        this[key] = copyProperty(data, key);
      });
    }
  };

  /**
   * Clear own properties
   */
  $baseModel.prototype.clear = function() {
    for (let key in this) {
      if (this.hasOwnProperty(key)) {
        delete this[key];
      }
    }
  };

  /**
   * Clone
   */
  $baseModel.prototype.clone = function() {
    let ModelClass = this.constructor;
    return new ModelClass(this.extract());
  };

  /**
   * Copy a property
   */
  $baseModel.prototype.copyProperty = function(obj, key) {
    if (angular.isArray(this[key])) {

    }
    if (this[key] && angular.isFunction(this[key].clone)) {
      obj[key] = this[key].clone();
    }
    else {
      obj[key] = angular.copy(this[key]);
    }
  };

  /**************************************************************************
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
      let date = dateStringToMoment(value);
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
      let copy = {};
      for (let prop in value) {
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
