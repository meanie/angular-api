
/**
 * Module definition and dependencies
 */
angular.module('Api.Request.Service', [
  'Utility.Url.Service'
])

/**
 * Factory definition
 */
.factory('$apiRequest', function $apiRequest($http, $url) {

  /**
   * Check if a data object is a model
   */
  function isModel(data) {
    return angular.isObject(data) && angular.isFunction(data.toJSON);
  }

  /**
   * Check if dotted path is valid
   */
  function isValidDottedPath(path) {
    return (
      path && path !== 'hasOwnProperty' && /^(\.[a-zA-Z_$@][0-9a-zA-Z_$@]*)+$/.test('.' + path)
    );
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
      obj = (obj !== null) ? obj[key] : undefined;
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
    angular.forEach(actionParams || {}, function(value, key) {

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
    angular.forEach(url.split(/\W/), function(param) {

      //Filter hasOwnProperty
      if (param === 'hasOwnProperty') {
        throw new Error('Invalid parameter name: hasOwnProperty');
      }

      //Find all valid url params (have value, non digit)
      if (param && !(/^\\d+$/.test(param))) {
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

    //Replace collapsed `/.` if found in the last URL path segment before the query
    //E.g. `http://url.com/id./format?q=x` becomes `http://url.com/id.format?q=x`
    return url
      .replace(/\/\.(?=\w+($|\?))/, '.')
      .replace(/\/\\\./, '/.');
  }

  /**
   * Parse URL
   */
  function parseUrl(url, params, urlParams, stripTrailingSlashes) {

    //Replace escaped \:
    var url = url.replace(/\\:/g, ':');

    //Loop the valid URL params now
    angular.forEach(urlParams, function(t, urlParam) {

      //Extract value for this url param from given params
      var val = params.hasOwnProperty(urlParam) ? params[urlParam] : null;
      var regex;

      //If defined and not null, encode it and replace in URL
      if (angular.isDefined(val) && val !== null) {
        var encodedVal = $url.encodeUriSegment(val);
        regex = new RegExp(':' + urlParam + '(\\W|$)', 'g');
        url = url.replace(regex, function(match, tail) {
          return encodedVal + tail;
        });
      }

      //Otherwise, remove from URL
      else {
        regex = new RegExp('(\/?):' + urlParam + '(\\W|$)', 'g');
        url = url.replace(regex, function(match, leadingSlashes, tail) {
          if (tail.charAt(0) === '/') {
            return tail;
          }
          else {
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
  function createRequestConfig(action, params, data) {

    //Initialize
    var request = {};
    var stripConfigKeys = [
      'params', 'model', 'isArray', 'stripTrailingSlashes',
      'successInterceptor', 'errorInterceptor'
    ];

    //Map action config to http request config
    angular.forEach(action, function(value, key) {
      if (stripConfigKeys.indexOf(key) === -1) {
        request[key] = angular.copy(value);
      }
    });

    //Append data if we have a body
    if (action.hasBody() && data) {
      if (isModel(data)) {
        data = data.toJSON();
      }
      request.data = data;
    }

    //Combine params out of given params and data and find URL params
    var params = combineParams(action.params, params, data);
    var urlParams = findUrlParams(request.url);

    //Parse URL
    request.url = parseUrl(action.url, params, urlParams, action.stripTrailingSlashes);

    //Set remaining given non-url params as query params, delegate param encoding to $http
    angular.forEach(params, function(value, key) {
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
  return function $apiRequest(action, params, data) {

    //Parameter juggling
    if (action.hasBody() && params && !data) {
      data = params;
      params = null;
    }

    //Create request config
    var request = createRequestConfig(action, params, data);
    var expectsModel = action.model && /^(GET|POST|PUT|PATCH)$/i.test(action.method);

    //Use $http to do the request and intercept the response
    var promise = $http(request).then(
      action.successInterceptor.bind(action),
      action.errorInterceptor.bind(action)
    );

    //Then handle the raw data
    return promise.then(function(raw) {
      if (action.hasBody() && isModel(data)) {
        return data.fromJSON(raw);
      }
      else if (expectsModel) {
        return action.convertToModel(raw);
      }
      return raw;
    });
  }
});
