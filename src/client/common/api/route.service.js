
/**
 * Module definition and dependencies
 */
angular.module('Api.Route.Service', [
  'Utility.Url.Service'
])

/**
 * Provider definition
 */
.provider('ApiRoute', function ApiRouteProvider() {

  //Defaults
  var defaultModel = 'ApiModel';
  var stripTrailingSlashes = true;

  /**
   * Set default model
   */
  this.setDefaultModel = function(model) {
    defaultModel = model || '';
    return this;
  };

  /**
   * Set strip trailing slashes behaviour
   */
  this.setStripTrailingSlashes = function(strip) {
    stripTrailingSlashes = !!strip;
    return this;
  };

  /**
   * Service getter
   */
  this.$get = function($q, $http, $injector, Logger, Url) {

    /*****************************************************************************
     * Helpers
     ***/

    /**
     * Helper to check if dotted path is valid
     */
    function isValidDottedPath(path) {
      return (
        path !== null && path !== '' && path !== 'hasOwnProperty' &&
        /^(\.[a-zA-Z_$@][0-9a-zA-Z_$@]*)+$/.test('.' + path)
      );
    }

    /**
     * Helper to lookup dotted path
     */
    function lookupDottedPath(obj, path) {
      if (!isValidDottedPath(path)) {
        throw new Error('Invalid dotted path:' + path);
      }
      var keys = path.split('.');
      for (var i = 0; i < keys.length && obj !== undefined; i++) {
        var key = keys[i];
        obj = (obj !== null) ? obj[key] : undefined;
      }
      return obj;
    }

    /**
     * Extract params from data
     */
    function extractParamsFromData(params, data) {

      //Initialize and loop params
      var extracted = {};
      angular.forEach(params, function(value, key) {

        //Function? Call now
        if (angular.isFunction(value)) {
          value = value();
        }

        //String value with @ identifier? Look up in data
        if (angular.isString(value) && value.charAt(0) === '@') {
          value = lookupDottedPath(data, value.substr(1));
        }

        //Set value
        extracted[key] = value;
      });

      //Return extracted params
      return extracted;
    }

    /**
     * Validate model class
     */
    function validatedModel(model) {

      //No model?
      if (!model) {
        return null;
      }

      //Use default if true specified
      if (model === true) {
        model = defaultModel;
      }

      //validate
      if (!$injector.has(model)) {
        Logger.warn('Unknown model class/service:', model);
        return null;
      }

      //Return model
      return model;
    }

    /**
     * Set URL params
     */
    function setUrlParams(request, params) {

      //Initialize vars
      var url = request.url;
      var urlParams = {};
      params = params || {};

      //Split url in parameters
      angular.forEach(url.split(/\W/), function(param) {
        if (param === 'hasOwnProperty') {
          throw new Error('Invalid parameter name: hasOwnProperty');
        }

        //QUE?
        if (!(/^\\d+$/.test(param)) && param &&
          (new RegExp('(^|[^\\\\]):' + param + '(\\W|$)').test(url))) {
          urlParams[param] = true;
        }
      });

      //QUE?
      url = url.replace(/\\:/g, ':');

      //Loop the valid URL params now
      angular.forEach(urlParams, function(_, urlParam) {
        var val = params.hasOwnProperty(urlParam) ? params[urlParam] : null;
        if (angular.isDefined(val) && val !== null) {
          var encodedVal = Url.encodeUriSegment(val);
          url = url.replace(new RegExp(':' + urlParam + '(\\W|$)', 'g'), function(match, tail) {
            return encodedVal + tail;
          });
        }
        else {
          url = url.replace(new RegExp('(\/?):' + urlParam + '(\\W|$)', 'g'), function(match,
              leadingSlashes, tail) {
            if (tail.charAt(0) === '/') {
              return tail;
            }
            else {
              return leadingSlashes + tail;
            }
          });
        }
      });

      //Strip trailing slashes if needed
      if (stripTrailingSlashes) {
        url = url.replace(/\/+$/, '') || '/';
      }

      //Then replace collapse `/.` if found in the last URL path segment before the query
      //E.g. `http://url.com/id./format?q=x` becomes `http://url.com/id.format?q=x`
      url = url.replace(/\/\.(?=\w+($|\?))/, '.');

      //Set back in request, replace escaped `/\.` with `/.`
      request.url = url.replace(/\/\\\./, '/.');

      //Set remaining params, delegate param encoding to $http
      angular.forEach(params, function(value, key) {
        if (!urlParams[key]) {
          request.params = request.params || {};
          request.params[key] = value;
        }
      });
    }

    /**
     * Create request config
     */
    function createRequestConfig(action, params, data) {

      //Init
      var request = {};
      var nonHttpConfigKeys = [
        'params', 'isArray', 'model', 'success', 'error'
      ];
      var hasBody = /^(POST|PUT|PATCH)$/i.test(action.method);
      var isModel = angular.isObject(data) && angular.isFunction(data.toJSON);

      //Map action config params to http request config
      angular.forEach(action, function(value, key) {
        if (nonHttpConfigKeys.indexOf(key) === -1) {
          request[key] = angular.copy(value);
        }
      });

      //Append data if we have a body
      if (hasBody && data) {
        request.data = isModel ? data.toJSON() : data;
      }

      //Extract params
      var extractedParams = extractParamsFromData(action.params || {}, data);
      setUrlParams(request, angular.extend({}, extractedParams, params || {}));

      //Return
      return request;
    }

    /*****************************************************************************
     * Class
     ***/

    /**
     * Constructor
     */
    function ApiRoute(action, endpoint) {

      //Set endpoint and action
      this.endpoint = endpoint;
      this.action = action;

      //Validate model
      this.model = validatedModel(action.model);

      //Determine if our requests have body and if we expect a model
      this.hasBody = /^(POST|PUT|PATCH)$/i.test(action.method);
      this.expectsModel = this.model && /^(GET|POST|PUT|PATCH)$/i.test(action.method);
      this.expectsArray = !!this.action.isArray;

      //Overwrite response interceptors
      if (angular.isFunction(action.success)) {
        this.successInterceptor = action.success;
      }
      if (angular.isFunction(action.error)) {
        this.errorInterceptor = action.error;
      }
    }

    /**
     * Convert raw response data to a model
     */
    ApiRoute.prototype.convertToModel = function(data) {

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
    ApiRoute.prototype.successInterceptor = function(response) {

      //Validate data type
      if (angular.isArray(response.data) !== this.expectsArray) {
        Logger.warn(
          'Expected', this.expectsArray ? 'array' : 'object',
          'as response, got', response.data
        );
      }

      //Initialize if empty
      return response.data || (this.expectsArray ? [] : {});
    };

    /**
     * Default error response interceptor
     */
    ApiRoute.prototype.errorInterceptor = function(response) {
      return $q.reject(response);
    };

    /**
     * Request handler
     */
    ApiRoute.prototype.request = function(params, data) {

      //Parameter juggling
      if (this.hasBody && params && !data) {
        data = params;
        params = null;
      }

      //Check if the given data is already a model, and create request config
      var isModel = angular.isObject(data) && angular.isFunction(data.toJSON);
      var request = createRequestConfig(this.action, params, data);

      //Use $http to do the request now
      var promise = $http(request).then(
        this.successInterceptor.bind(this),
        this.errorInterceptor.bind(this)
      );

      //Handle data
      promise = promise.then(function(raw) {
        if (isModel && this.hasBody) {
          return data.fromJSON(raw);
        }
        else if (this.expectsModel) {
          return this.convertToModel(raw);
        }
        return raw;
      }.bind(this));

      //Return promise
      return promise;
    };

    //Return
    return ApiRoute;
  };
});
