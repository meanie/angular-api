
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
    const regex = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).*/;
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
      //eslint-disable-next-line no-unused-vars
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
  function $baseModel(data, parent) {

    //Define parent property
    let _parent = parent;
    Object.defineProperty(this, '$parent', {
      enumerable: false,
      get() {
        return _parent;
      },
      set(parent) {
        _parent = parent;
      },
    });

    //Load data
    this.fromJSON(data);
  }

  /**************************************************************************
   * Helper methods
   ***/

  /**
   * Convert a property to a model
   */
  $baseModel.prototype.convertToModel = function(
    key, Model, isArray
  ) {

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

    //If no model specified or if empty, we're done
    if (!Model || !this[key]) {
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

    //Already a model?
    if (this[key] instanceof Model) {
      return;
    }

    //Get model class and initiate
    if (angular.isArray(this[key])) {
      this[key] = this[key].map(data => new Model(data, this));
    }
    else if (angular.isString(this[key]) && $baseModel.isId(this[key])) {
      this[key] = new Model({id: this[key]}, this);
    }
    else {
      this[key] = new Model(this[key], this);
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

    //If string given, just return copy of one property
    if (typeof properties === 'string') {
      return copyProperty(this, properties);
    }

    //Initialize object
    let obj = {};

    //No properties given? Iterate all object properties
    if (!angular.isArray(properties) || !properties.length) {
      //eslint-disable-next-line no-unused-vars
      angular.forEach(this, (value, key) => {
        if (key.substr(0, 2) !== '$$') {
          obj[key] = copyProperty(this, key);
        }
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
      //eslint-disable-next-line no-unused-vars
      angular.forEach(data, (value, key) => {
        this[key] = copyProperty(data, key);
      });
    }
    return this;
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
    return this;
  };

  /**
   * Clone
   */
  $baseModel.prototype.clone = function(stripId, data) {
    let ModelClass = this.constructor;
    //TODO: Should this be toJSON() ??
    let clone = new ModelClass(this.extract(), this.$parent);
    if (stripId) {
      delete clone.id;
    }
    if (data && typeof data === 'object') {
      Object.assign(clone, data);
    }
    return clone;
  };

  /**
   * Check if two models are the same (based on ID)
   */
  $baseModel.prototype.isSame = function(model) {
    if (!model) {
      return false;
    }
    if (!angular.isObject(model)) {
      return (this.id === model);
    }
    if (!model.id) {
      return false;
    }
    return (this.id && model.id && this.id === model.id);
  };

  /**
   * Copy a property
   */
  $baseModel.prototype.copyProperty = function(obj, key) {
    if (this[key] && angular.isFunction(this[key].clone)) {
      obj[key] = this[key].clone();
    }
    else {
      obj[key] = angular.copy(this[key]);
    }
  };

  /**
   * Set parent
   */
  $baseModel.prototype.setParent = function(parent) {
    this.$parent = parent;
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
    else if (value && angular.isObject(value)) {
      if (value._isAMomentObject) {
        return value.clone();
      }
      let copy = {};
      for (let prop in value) {
        if (value.hasOwnProperty(prop)) {
          copy[prop] = $baseModel.valueFromJSON(value[prop]);
        }
      }
      return copy;
    }
    return value;
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
        if (value.hasOwnProperty(prop) && prop.substr(0, 2) !== '$$') {
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

  /**
   * Strip a given object to specific keys
   */
  $baseModel.strip = function(obj, ...keys) {
    if (angular.isArray(obj)) {
      return obj.map(obj => $baseModel.strip(obj, ...keys));
    }
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    //eslint-disable-next-line no-unused-vars
    angular.forEach(obj, (value, key) => {
      if (!keys.includes(key)) {
        delete obj[key];
      }
    });
    return obj;
  };

  /**
   * Strip ID's recursively from a given object
   */
  $baseModel.stripIds = function(obj) {
    if (angular.isArray(obj)) {
      return obj.map(obj => $baseModel.stripIds(obj));
    }
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    if (typeof obj.id !== 'undefined') {
      delete obj.id;
    }
    angular.forEach(obj, value => {
      if (value && typeof value === 'object') {
        $baseModel.stripIds(value);
      }
    });
    return obj;
  };

  /**
   * Test for MongoDB object ID
   */
  $baseModel.isId = function(str) {
    return str.match(/^[a-f\d]{24}$/i);
  };

  //Return
  return $baseModel;
});
