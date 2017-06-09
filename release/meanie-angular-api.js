/**
 * meanie-angular-api * https://github.com/meanie/angular-api
 *
 * Copyright (c) 2017 Adam Reis <adam@reis.nz>
 * License: MIT
 */
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

(function (window, angular, undefined) {
  'use strict';

  /**
   * Module definition and dependencies
   */

  angular.module('Api.Action.Service', ['Url.Service'])

  /**
   * Factory definition
   */
  .factory('$apiAction', ['$q', '$injector', '$log', '$url', function $apiAction($q, $injector, $log, $url) {

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
    ApiAction.prototype.hasBody = function () {
      return (/^(POST|PUT|PATCH)$/i.test(this.method)
      );
    };

    /**
     * Expects array check
     */
    ApiAction.prototype.expectsArray = function () {
      return Boolean(this.isArray);
    };

    /**
     * Expects model check
     */
    ApiAction.prototype.expectsModel = function () {
      return this.model && Boolean(this.isModel);
    };

    /**
     * Convert raw response data to a model
     */
    ApiAction.prototype.convertToModel = function (data) {
      var _this = this;

      //Array given?
      if (angular.isArray(data)) {
        return data.map(function (data) {
          return _this.convertToModel(data);
        });
      }

      //Get model class and return model instance
      var Model = $injector.get(this.model);
      return new Model(data);
    };

    /**
     * Default success response interceptor
     */
    ApiAction.prototype.successInterceptor = function (response) {

      //Check if we expect an array
      var expectsArray = this.expectsArray();
      var isArray = angular.isArray(response.data);

      //Validate data type
      if (isArray !== expectsArray) {

        //Issue warning
        $log.warn('Expected', expectsArray ? 'array' : 'object', 'as response, got', isArray ? 'array' : _typeof(response.data));

        //Enforce data format?
        if (this.enforceDataFormat) {
          response.data = expectsArray ? [] : {};
        }
      }

      //Initialize if empty
      return response.data || (expectsArray ? [] : {});
    };

    /**
     * Default error response interceptor
     */
    ApiAction.prototype.errorInterceptor = function (response) {
      return $q.reject(response);
    };

    //Return factory function
    return function (action, endpoint) {
      return new ApiAction(action, endpoint);
    };
  }]);
})(window, window.angular);
(function (window, angular, undefined) {
  'use strict';

  /**
   * Module definition and dependencies
   */

  angular.module('Api.Service', ['Api.Endpoint.Service'])

  /**
   * Provider definition
   */
  .provider('$api', function $apiProvider() {

    //Defaults
    this.defaults = {
      verbose: false,
      enforceDataFormat: false,
      baseUrl: '/',
      actions: {
        query: {
          method: 'GET',
          isArray: true,
          isModel: true
        },
        get: {
          method: 'GET',
          isModel: true
        },
        create: {
          method: 'POST'
        },
        update: {
          method: 'PUT'
        },
        delete: {
          method: 'DELETE'
        }
      },
      params: {
        id: '@id'
      },
      model: '',
      stripTrailingSlashes: true
    };

    //Registered endpoints
    this.endpoints = {};

    /**
     * Set verbose
     */
    this.setVerbose = function (verbose) {
      this.defaults.verbose = !!verbose;
      return this;
    };

    /**
     * Set base URL
     */
    this.setBaseUrl = function (url) {
      //TODO: the replacement is protecting port numbers from later becoming
      //removed on account of the request service url parsing thinking it's a
      //parameter. The code there should be updated to prevent port replacement,
      //rather than "protecting" it in this manner here.
      this.defaults.baseUrl = url.replace(/:([0-9]+)/, '\\:$1');
      return this;
    };

    /**
     * Set data format enforcing
     */
    this.setEnforceDataFormat = function (enforce) {
      this.defaults.enforceDataFormat = !!enforce;
      return this;
    };

    /**
     * Set default actions
     */
    this.setDefaultActions = function (actions) {
      this.defaults.actions = actions || {};
      return this;
    };

    /**
     * Set default params
     */
    this.setDefaultParams = function (params) {
      this.defaults.params = params || {};
      return this;
    };

    /**
     * Set default model
     */
    this.setDefaultModel = function (model) {
      this.defaults.model = model || false;
      return this;
    };

    /**
     * Set a generic config parameter (use only for config params that you
     * want to pass on to the $http service)
     */
    this.setConfig = function (param, value) {
      this.defaults[param] = value;
      return this;
    };

    /**
     * Strip trailing slashes behaviour
     */
    this.stripTrailingSlashes = function (strip) {
      this.defaults.stripTrailingSlashes = !!strip;
      return this;
    };

    /**
     * Register endpoint
     */
    this.registerEndpoint = function (name, config) {
      if (name) {
        this.endpoints[name] = config || {};
      }
      return this;
    };

    /**
     * Service getter
     */
    this.$get = ['$log', '$apiEndpoint', function ($log, $apiEndpoint) {
      var _this = this;

      //Initialize API interface
      var Api = function Api(endpoint) {
        return this[endpoint];
      };

      //Append all endpoints
      angular.forEach(this.endpoints, function (config, name) {

        //Warn if overwriting
        if (Api[name]) {
          $log.warn('API endpoint', name, 'is being overwritten.');
        }

        //Extend endpoint config with defaults
        config = angular.extend({}, _this.defaults, config);
        if (config.verbose) {
          $log.info('API endpoint', name + ':', config);
        }

        //Initialize endpoint
        Api[name] = $apiEndpoint(name, config);
      });

      //Return
      return Api;
    }];
  });
})(window, window.angular);
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

(function (window, angular, undefined) {
  'use strict';

  /**
   * Module definition and dependencies
   */

  angular.module('BaseModel.Service', [])

  /**
   * Model definition
   */
  .factory('$baseModel', ['$window', '$log', '$injector', function ($window, $log, $injector) {

    //See if we have the moment service available to us
    var moment = void 0;
    if ($injector.has('moment')) {
      moment = $injector.get('moment');
    } else if (typeof $window.moment !== 'undefined') {
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
     * Copy a property
     */
    function copyProperty(obj, key) {
      if (angular.isArray(obj[key])) {
        var _ret = function () {
          var arr = obj[key];
          return {
            v: arr.map(function (value, key) {
              return copyProperty(arr, key);
            })
          };
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
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
      var _parent = parent;
      Object.defineProperty(this, '$parent', {
        enumerable: false,
        get: function get() {
          return _parent;
        },
        set: function set(parent) {
          _parent = parent;
        }
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
    $baseModel.prototype.convertToModel = function (key, Model, isArray) {
      var _this = this;

      //Paremeter shuffling
      if (typeof Model === 'boolean') {
        isArray = Model;
        Model = null;
      }

      //If undefined, check what we were expecting
      if (typeof this[key] === 'undefined') {
        if (isArray) {
          this[key] = [];
        } else {
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
          return $log.warn('Unknown model', Model, 'specified for sub model conversion');
        }
        Model = $injector.get(Model);
      }

      //Get model class and initiate
      if (angular.isArray(this[key])) {
        this[key] = this[key].map(function (data) {
          return new Model(data, _this);
        });
      } else if (angular.isString(this[key]) && $baseModel.isId(this[key])) {
        this[key] = new Model({ id: this[key] }, this);
      } else {
        this[key] = new Model(this[key], this);
      }
    };

    /**
     * From JSON converter
     */
    $baseModel.prototype.fromJSON = function (json) {
      var _this2 = this;

      if (angular.isObject(json)) {
        angular.forEach(json, function (value, key) {
          _this2[key] = $baseModel.valueFromJSON(value);
        }, this);
      }
      return this;
    };

    /**
     * To JSON converter
     */
    $baseModel.prototype.toJSON = function (data) {
      var json = {};
      if (data && angular.isObject(data)) {
        angular.forEach(data, function (value, key) {
          json[key] = $baseModel.valueToJSON(value);
        });
      }
      angular.forEach(this, function (value, key) {
        if (!json.hasOwnProperty(key)) {
          json[key] = $baseModel.valueToJSON(value);
        }
      });
      return json;
    };

    /**
     * Extract a subset of data from the model
     */
    $baseModel.prototype.extract = function (properties) {
      var _this3 = this;

      //If string given, just return copy of one property
      if (typeof properties === 'string') {
        return copyProperty(this, properties);
      }

      //Initialize object
      var obj = {};

      //No properties given? Iterate all object properties
      if (!angular.isArray(properties) || !properties.length) {
        angular.forEach(this, function (value, key) {
          if (key.substr(0, 2) !== '$$') {
            obj[key] = copyProperty(_this3, key);
          }
        });
      } else {
        angular.forEach(properties, function (key) {
          obj[key] = copyProperty(_this3, key);
        });
      }

      //Return resulting object
      return obj;
    };

    /**
     * Merge a set of data into the model
     */
    $baseModel.prototype.merge = function (data) {
      var _this4 = this;

      if (data && angular.isObject(data)) {
        angular.forEach(data, function (value, key) {
          _this4[key] = copyProperty(data, key);
        });
      }
    };

    /**
     * Clear own properties
     */
    $baseModel.prototype.clear = function () {
      for (var key in this) {
        if (this.hasOwnProperty(key)) {
          delete this[key];
        }
      }
    };

    /**
     * Clone
     */
    $baseModel.prototype.clone = function (stripId) {
      var ModelClass = this.constructor;
      var clone = new ModelClass(this.extract(), this.$parent);
      if (stripId) {
        delete clone.id;
      }
      return clone;
    };

    /**
     * Check if two models are the same (based on ID)
     */
    $baseModel.prototype.isSame = function (model) {
      if (!angular.isObject(model)) {
        return this.id === model;
      }
      return this.id && model.id && this.id === model.id;
    };

    /**
     * Copy a property
     */
    $baseModel.prototype.copyProperty = function (obj, key) {
      if (this[key] && angular.isFunction(this[key].clone)) {
        obj[key] = this[key].clone();
      } else {
        obj[key] = angular.copy(this[key]);
      }
    };

    /**
     * Set parent
     */
    $baseModel.prototype.setParent = function (parent) {
      this.$parent = parent;
    };

    /**************************************************************************
     * Static methods
     ***/

    /**
     * Helper to convert a value from JSON
     */
    $baseModel.valueFromJSON = function (value) {
      if (angular.isArray(value)) {
        return value.map($baseModel.valueFromJSON);
      } else if (moment && angular.isString(value)) {
        var date = dateStringToMoment(value);
        return date || value;
      } else if (value && angular.isObject(value)) {
        if (value._isAMomentObject) {
          return value.clone();
        }
        var copy = {};
        for (var prop in value) {
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
    $baseModel.valueToJSON = function (value) {
      if (angular.isArray(value)) {
        return value.map($baseModel.valueToJSON);
      } else if (value && angular.isObject(value)) {
        if (angular.isFunction(value.toJSON)) {
          return value.toJSON();
        }
        var copy = {};
        for (var prop in value) {
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
    $baseModel.onlyId = function (obj) {
      if (angular.isArray(obj)) {
        return obj.map($baseModel.onlyId);
      }
      if (!obj || (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object' || !obj.id) {
        return obj;
      }
      return obj.id;
    };

    /**
     * Strip a given object to specific keys
     */
    $baseModel.strip = function (obj) {
      for (var _len = arguments.length, keys = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        keys[_key - 1] = arguments[_key];
      }

      if (angular.isArray(obj)) {
        return obj.map(function (obj) {
          return $baseModel.strip.apply($baseModel, [obj].concat(keys));
        });
      }
      if (!obj || (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object') {
        return obj;
      }
      angular.forEach(obj, function (value, key) {
        if (!keys.includes(key)) {
          delete obj[key];
        }
      });
      return obj;
    };

    /**
     * Strip ID's recursively from a given object
     */
    $baseModel.stripIds = function (obj) {
      if (angular.isArray(obj)) {
        return obj.map(function (obj) {
          return $baseModel.stripIds(obj);
        });
      }
      if (!obj || (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object') {
        return obj;
      }
      if (typeof obj.id !== 'undefined') {
        delete obj.id;
      }
      angular.forEach(obj, function (value) {
        if (value && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
          $baseModel.stripIds(value);
        }
      });
      return obj;
    };

    /**
     * Test for MongoDB object ID
     */
    $baseModel.isId = function (str) {
      return str.match(/^[a-f\d]{24}$/i);
    };

    //Return
    return $baseModel;
  }]);
})(window, window.angular);
(function (window, angular, undefined) {
  'use strict';

  /**
   * Module definition and dependencies
   */

  angular.module('Api.Endpoint.Service', ['Api.Action.Service', 'Api.Request.Service', 'Url.Service'])

  /**
   * Factory definition
   */
  .factory('$apiEndpoint', ['$url', '$apiAction', '$apiRequest', function $apiEndpoint($url, $apiAction, $apiRequest) {

    /**
     * Constructor
     */
    function ApiEndpoint(name, config) {
      var _this = this;

      //Determine full URL of endpoint
      config.actions = config.actions || {};
      config.url = $url.concat(config.baseUrl, config.url || $url.concat(name, ':id'));

      //Expose config and actions container
      this.$config = config;
      this.$actions = {};

      //Create action instances and bind request method to action key on endpoint
      angular.forEach(config.actions, function (action, key) {
        _this.$actions[key] = $apiAction(action || {}, config);
        _this[key] = angular.bind(_this, $apiRequest, _this.$actions[key]);
      });
    }

    //Return factory function
    return function (name, config) {
      return new ApiEndpoint(name, config);
    };
  }]);
})(window, window.angular);
(function (window, angular, undefined) {
  'use strict';

  /**
   * Module definition and dependencies
   */

  angular.module('Api.Request.Service', ['Url.Service'])

  /**
   * Factory definition
   */
  .factory('$apiRequest', ['$http', '$url', function $apiRequest($http, $url) {

    /**
     * Check if dotted path is valid
     */
    function isValidDottedPath(path) {
      return path && path !== 'hasOwnProperty' && /^(\.[a-zA-Z_$@][0-9a-zA-Z_$@]*)+$/.test('.' + path);
    }

    /**
     * Lookup dotted path in an object
     */
    function lookupDottedPath(obj, path) {

      //Check if valid
      if (!isValidDottedPath(path)) {
        throw new Error('Invalid dotted path:' + path);
      }

      //Split path in object keys to traverse
      var keys = path.split('.');
      for (var i = 0; i < keys.length && obj !== undefined; i++) {
        var key = keys[i];
        obj = obj !== null ? obj[key] : undefined;
      }

      //Return reference
      return obj;
    }

    /**
     * Combine given params with extracted params from data
     */
    function combineParams(actionParams, givenParams, data) {

      //Extract data params from action params
      var extractedParams = {};
      angular.forEach(actionParams || {}, function (value, key) {

        //Function? Call now
        if (angular.isFunction(value)) {
          value = value();
        }

        //String value with @ identifier? Look up in data
        if (angular.isString(value) && value.charAt(0) === '@') {
          value = lookupDottedPath(data, value.substr(1));
        }

        //Set value
        extractedParams[key] = value;
      });

      //Extend with given params
      return angular.extend(extractedParams, givenParams || {});
    }

    /**
     * Find URL params
     */
    function findUrlParams(url) {
      var urlParams = {};
      angular.forEach(url.split(/\W/), function (param) {

        //Filter hasOwnProperty
        if (param === 'hasOwnProperty') {
          throw new Error('Invalid parameter name: hasOwnProperty');
        }

        //Find all valid url params (have value, non digit)
        if (param && !/^\\d+$/.test(param)) {
          if (new RegExp('(^|[^\\\\]):' + param + '(\\W|$)').test(url)) {
            urlParams[param] = true;
          }
        }
      });
      return urlParams;
    }

    /**
     * Clean up URL
     */
    function cleanUpUrl(url, stripTrailingSlashes) {

      //Strip trailing slashes if needed
      if (stripTrailingSlashes) {
        url = url.replace(/\/+$/, '') || '/';
      }

      //Replace collapsed `/.` if found in the last URL path segment before
      //the query, e.g. `http://url.com/id./format?q=x` becomes
      //`http://url.com/id.format?q=x`
      return url.replace(/\/\.(?=\w+($|\?))/, '.').replace(/\/\\\./, '/.');
    }

    /**
     * Parse URL
     */
    function parseUrl(url, params, urlParams, stripTrailingSlashes) {

      //Replace escaped \:
      url = url.replace(/\\:/g, ':');

      //Loop the valid URL params now
      angular.forEach(urlParams, function (t, urlParam) {

        //Extract value for this url param from given params
        var val = params.hasOwnProperty(urlParam) ? params[urlParam] : null;
        var regex = void 0;

        //If defined and not null, encode it and replace in URL
        if (angular.isDefined(val) && val !== null) {
          (function () {
            var encodedVal = $url.encodeUriSegment(val);
            regex = new RegExp(':' + urlParam + '(\\W|$)', 'g');
            url = url.replace(regex, function (match, tail) {
              return encodedVal + tail;
            });
          })();
        }

        //Otherwise, remove from URL
        else {
            regex = new RegExp('(\/?):' + urlParam + '(\\W|$)', 'g');
            url = url.replace(regex, function (match, leadingSlashes, tail) {
              if (tail.charAt(0) === '/') {
                return tail;
              } else {
                return leadingSlashes + tail;
              }
            });
          }
      });

      //Return cleaned up URL
      return cleanUpUrl(url, stripTrailingSlashes);
    }

    /**
     * Create request config
     */
    function createRequestConfig(action, params, data, config) {

      //Initialize
      var request = {};
      var stripConfigKeys = ['params', 'model', 'isArray', 'isModel', 'successInterceptor', 'errorInterceptor', 'stripTrailingSlashes'];

      //Map action config to http request config
      angular.forEach(action, function (value, key) {
        if (stripConfigKeys.indexOf(key) === -1) {
          request[key] = angular.copy(value);
        }
      });

      //Attach given extra config
      if (config && angular.isObject(config)) {
        angular.forEach(config, function (value, key) {
          request[key] = angular.copy(value);
        });
      }

      //Append data if we have a body
      if (action.hasBody() && data && angular.isObject(data)) {
        if (angular.isFunction(data.toJSON)) {
          request.data = data.toJSON();
        } else if (angular.isArray(data)) {
          request.data = data;
        } else {
          request.data = angular.extend({}, data);
        }
      }

      //Ensure we don't overwrite the params objects keys in place
      params = angular.copy(params);

      //Process params
      if (params && angular.isObject(params)) {
        for (var key in params) {
          if (params.hasOwnProperty(key) && angular.isObject(params[key])) {
            if (angular.isFunction(params[key].toJSON)) {
              params[key] = params[key].toJSON();
            }
          }
        }
      }

      //Combine params out of given params and data and find URL params
      params = combineParams(action.params, params, data);
      var urlParams = findUrlParams(request.url);

      //Parse URL
      request.url = parseUrl(action.url, params, urlParams, action.stripTrailingSlashes);

      //Set remaining given non-url params as query params,
      //delegate param encoding to $http
      angular.forEach(params, function (value, key) {
        if (!urlParams[key]) {
          request.params = request.params || {};
          request.params[key] = value;
        }
      });

      //Return
      return request;
    }

    /**
     * Api request executer
     */
    return function ApiRequest(action, params, data, config) {

      //Parameter juggling
      if (action.hasBody() && params && !data) {
        data = params;
        params = null;
      }

      //Create request config and use $http to do the request
      //and intercept the response
      var request = createRequestConfig(action, params, data, config);
      var promise = $http(request).then(action.successInterceptor.bind(action), action.errorInterceptor.bind(action));

      //Then handle the raw data
      return promise.then(function (raw) {
        if (action.expectsModel()) {
          return action.convertToModel(raw);
        }
        return raw;
      });
    };
  }]);
})(window, window.angular);